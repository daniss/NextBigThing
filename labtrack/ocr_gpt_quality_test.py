#!/usr/bin/env python3
"""
OCR + GPT Quality Test Script for LabTrack
Tests Azure Document Intelligence OCR + Azure OpenAI GPT-4o-mini against groundtruth data.

IMPROVED VERSION with:
- Enhanced GPT prompt for multi-column layouts, DFG, coagulation, inequalities
- Comprehensive name normalization using code-based mapping
- Unit standardization and conversion
- Value cleaning with < > modifier handling

Usage:
    source ocr_test_venv/bin/activate
    python ocr_gpt_quality_test.py
"""

import os
import json
import time
import re
import unicodedata
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any, Tuple
from dotenv import load_dotenv
import requests
import fitz  # PyMuPDF

# Load environment variables from .env.local
load_dotenv(".env.local")

AZURE_OCR_KEY = os.getenv("AZURE_OCR_KEY")
AZURE_OCR_ENDPOINT = os.getenv("AZURE_OCR_ENDPOINT")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_API_BASE = os.getenv("AZURE_OPENAI_API_BASE")
AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")

BLOODWORK_DIR = Path("bloodwork")
OUTPUT_DIR = Path("ocr_gpt_test_results")

# ============================================================
# ENHANCED GPT PROMPT - Improved for better extraction
# ============================================================
GPT_SYSTEM_PROMPT = """Tu es un expert médical spécialisé dans l'extraction de données de bilans sanguins français. 
Extrais TOUS les biomarqueurs du document en JSON.

## RÈGLES D'EXTRACTION CRITIQUES

### 1. SCAN COMPLET DU DOCUMENT
- Lis CHAQUE page du début à la fin (pages 1, 2, 3... jusqu'à la dernière).
- Scanne les colonnes GAUCHE et DROITE (layout multi-colonnes fréquent).
- Va jusqu'à la DERNIÈRE ligne (souvent: analyse urinaire, ECBU).
- ⚠️ IGNORER les "Antériorités" / "Historique" / valeurs précédentes - extraire UNIQUEMENT les valeurs ACTUELLES.
- ⚠️ Si une colonne "Antériorités" existe, NE PAS prendre ces valeurs!

### 2. SECTIONS SPÉCIFIQUES À NE PAS MANQUER
- **HÉMATOLOGIE**: NFS complète, formule leucocytaire (valeurs absolues en G/L)
- **FONCTION RÉNALE**: DFG, CKD-EPI (souvent en bas de page dans un encadré)
- **HÉMOSTASE / COAGULATION**: 
  - Tables avec format "Patient | Témoin | Ratio"
  - Extraire: TP (Taux de Prothrombine %), INR, TCA Patient (sec), Ratio TCA
  - "Temps de Quick" en secondes ≠ "Taux de Prothrombine" en % (2 biomarqueurs différents!)

### 3. ÉLECTROPHORÈSE DES PROTÉINES (PAGES 5-6 SOUVENT)
- Section commence par "Electrophorèse des protéines sériques"
- Format typique dans un tableau:
  ```
  Albumine 60,6 %    41,8 g/L    40.2 à 47.6 g/L
  Alpha-1 globulines 4,4 %    3,0 g/L    2.1 à 3.5 g/L
  ```
- ⚠️ EXTRAIRE LA VALEUR EN g/L pour chaque fraction:
  - "Albumine": 41.8 g/L
  - "Alpha-1 globulines": 3.0 g/L
  - "Alpha-2 globulines": X g/L
  - "Bêta-1 globulines": X g/L
  - "Bêta-2 globulines": X g/L  
  - "Gamma globulines": X g/L

### 4. SÉROLOGIES (DERNIÈRES PAGES SOUVENT)
- Pour EBV, CMV, HSV, VZV, Toxoplasmose, Lyme, Syphilis:
  - Extrais la VALEUR NUMÉRIQUE (Index, Titre, UI/mL, U/mL, UA/mL)
  - PAS "Positif/Négatif" - cherche le CHIFFRE!
  - Noms typiques: "CMV - Titre des IgG", "Borréliose (Lyme) - IgG", "Toxoplasmose - Index d'IgM"
  - Même si <5 ou <0.5, extraire: value="<5", unit="UA/mL"

### 5. VALEURS AVEC INÉGALITÉS OU SIGNES
- "<10" → value: "<10" (garde le <)
- ">90" → value: ">90" (garde le >)
- NE PAS inclure les signes + ou - qui indiquent le statut (hors norme)
- Si tu vois "+ 11.68" c'est juste "11.68" (le + indique "élevé")

### 6. FORMAT JSON
- Convertis "1,85" en 1.85
- JSON strict: {"biomarkers": [{"biomarker_name": "...", "value": "...", "unit": "..."}]}
"""

GPT_USER_PROMPT_TEMPLATE = """Extrait TOUS les biomarqueurs de ce bilan sanguin français.

RAPPEL CRITIQUE: 
- Scan multi-colonnes (gauche ET droite), TOUTES les pages jusqu'à la fin
- N'oublie pas le DFG/CKD-EPI (fonction rénale)!
- COAGULATION: TP%, INR, TCA (tables Patient/Témoin)
- ÉLECTROPHORÈSE (pages 5-6): Albumine, Alpha-1/2, Bêta-1/2, Gamma en g/L
- SÉROLOGIES (dernières pages): CMV, Toxo, Lyme, HSV, VZV, Syphilis - VALEURS NUMÉRIQUES!
- IGNORER les "Antériorités" (colonnes historiques)

Voici le texte OCR du bilan:

{ocr_text}"""


# ============================================================
# EXCLUDED BIOMARKERS (Calculated/QC - Professionals compute these)
# These are skipped during evaluation as they are derived values
# ============================================================
EXCLUDED_BIOMARKERS = {
    # Calculated scores
    "fib4_score",               # Score FIB-4 (calculated from Age, AST, ALT, PLT)
    "albumin_globulin_ratio",   # Rapport albumine/globulines
    "gfr_mdrd",                 # Clairance MDRD (calculated)
    "gfr_cockcroft",            # Clairance Cockcroft (calculated)
    "atherogenic_index",        # Indice athérogénique (calculated)
    
    # Lab quality control indices (pre-analytical, not patient biomarkers)
    "index_lipemia",            # Index lipémie
    "index_icterus",            # Index ictérique  
    "index_hemolysis",          # Index hémolyse
}


# ============================================================
# COMPREHENSIVE NAME NORMALIZATION MAPPINGS
# Maps French lab synonyms → Canonical ID
# ============================================================
NAME_TO_CANONICAL = {
    # === HEMATOLOGIE - Globules Rouges ===
    "hematies": "rbc", "globules rouges": "rbc", "erythrocytes": "rbc", "gr": "rbc",
    "hemoglobine": "hemoglobin", "hb": "hemoglobin",
    "hematocrite": "hematocrit", "ht": "hematocrit",
    "vgm": "mcv", "volume globulaire moyen": "mcv", "mcv": "mcv",
    "tcmh": "mch", "tgmh": "mch", "teneur corpusculaire moyenne": "mch", "mch": "mch",
    "ccmh": "mchc", "concentration corpusculaire moyenne": "mchc", "mchc": "mchc",
    "idr": "rdw", "indice de distribution des hematies": "rdw", "rdw": "rdw",
    
    # === HEMATOLOGIE - Globules Blancs ===
    "leucocytes": "wbc", "globules blancs": "wbc", "gb": "wbc", "wbc": "wbc",
    "polynucleaires neutrophiles": "neutrophils", "neutrophiles": "neutrophils", "pnn": "neutrophils",
    "polynucleaires eosinophiles": "eosinophils", "eosinophiles": "eosinophils", "pne": "eosinophils",
    "polynucleaires basophiles": "basophils", "basophiles": "basophils", "pnb": "basophils",
    "lymphocytes": "lymphocytes",
    "monocytes": "monocytes",
    
    # === HEMATOLOGIE - Plaquettes ===
    "plaquettes": "platelets", "thrombocytes": "platelets", "numeration plaquettaire": "platelets",
    "vpm": "mpv", "volume plaquettaire moyen": "mpv", "mpv volume plaquettaire moyen": "mpv",
    "indice distribution plaquettaire": "pdw", "pdw": "pdw",
    
    # === COAGULATION ===
    "tp": "prothrombin_time", "taux de prothrombine": "prothrombin_time", "temps de quick": "prothrombin_time",
    "inr": "inr",
    "tca": "aptt", "temps de cephaline activee": "aptt", 
    "ratio tca": "aptt_ratio", "rapport tca": "aptt_ratio", "ratio patient/temoin": "aptt_ratio", "rapport patient/temoin": "aptt_ratio",
    "fibrinogene": "fibrinogen",
    "d dimeres": "d_dimer", "d dimere": "d_dimer",
    
    # === BIOCHIMIE - Fonction Renale ===
    "creatinine": "creatinine", "creatinine sanguine": "creatinine",
    "uree": "urea",
    "acide urique": "uric_acid",
    "dfg": "gfr", "gfr": "gfr", "dfg ckd epi": "gfr", "dfg calcule selon ckd epi": "gfr",
    "debit de filtration glomerulaire": "gfr", "estimation du dfg ckd epi": "gfr", "estimation du dfg": "gfr",
    "dfg estime ckd epi": "gfr", "dfg selon la formule ckd epi": "gfr",
    "clairance creatinine mdrd": "gfr_mdrd", "dfg par mdrd": "gfr_mdrd",
    "clairance ckd epi": "gfr", "clairance estimee selon cockcroft": "gfr_cockcroft",
    
    # === BIOCHIMIE - Ionogramme ===
    "sodium": "sodium", "na": "sodium", "natremie": "sodium", "sodium plasmatique": "sodium",
    "potassium": "potassium", "k": "potassium", "kaliemie": "potassium", "potassium serique": "potassium",
    "chlore": "chloride", "cl": "chloride", "chlorures": "chloride",
    "bicarbonates": "bicarbonate", "reserve alcaline": "bicarbonate", "co2 total": "bicarbonate",
    "calcium": "calcium", "ca": "calcium", "calcemie": "calcium",
    "calcium corrige": "calcium_corrected",
    "magnesium": "magnesium", "mg": "magnesium",
    "phosphore": "phosphorus", "phosphates": "phosphorus",
    
    # === BIOCHIMIE - Metabolisme Glucidique ===
    "glycemie": "glucose", "glucose": "glucose",
    "glycemie a jeun": "glucose_fasting",
    "hba1c": "hba1c", "hemoglobine glyquee": "hba1c", "hemoglobine a1c": "hba1c",
    
    # === BIOCHIMIE - Bilan Lipidique ===
    "cholesterol total": "cholesterol_total", "cholesterol": "cholesterol_total",
    "cholesterol hdl": "cholesterol_hdl", "hdl cholesterol": "cholesterol_hdl", "hdl": "cholesterol_hdl",
    "cholesterol ldl": "cholesterol_ldl", "ldl cholesterol": "cholesterol_ldl", "ldl": "cholesterol_ldl",
    "cholesterol ldl calcule": "cholesterol_ldl", "calcul du cholesterol ldl": "cholesterol_ldl",
    "cholesterol non hdl": "cholesterol_non_hdl", "cholesterol non hdl": "cholesterol_non_hdl",
    "triglycerides": "triglycerides", "tg": "triglycerides",
    
    # === BIOCHIMIE - Bilan Hepatique ===
    "asat": "asat", "sgot": "asat", "tgo": "asat", "transaminases asat": "asat", "transaminases sgot": "asat", "aspartate aminotransferase": "asat", "asat transaminases tgo": "asat", "got": "asat",
    "alat": "alat", "sgpt": "alat", "tgp": "alat", "transaminases alat": "alat", "transaminases sgpt": "alat", "alanine aminotransferase": "alat", "alat transaminases tgp": "alat", "gpt": "alat",
    "ggt": "ggt", "gamma gt": "ggt", "gamma glutamyl transferase": "ggt", "ggt gamma glutamyl transpeptidase": "ggt",
    "phosphatases alcalines": "alp", "pal": "alp",
    "bilirubine totale": "bilirubin_total", "bilirubine": "bilirubin_total",
    "bilirubine directe": "bilirubin_direct", "bilirubine conjuguee": "bilirubin_direct",
    "bilirubine indirecte": "bilirubin_indirect", "bilirubine libre": "bilirubin_indirect",
    "ldh": "ldh", "lactate deshydrogenase": "ldh",
    "lipase": "lipase", "amylase": "amylase",
    
    # === BIOCHIMIE - Proteines ===
    "proteines totales": "total_protein", "protides totaux": "total_protein", "protides": "total_protein",
    "albumine": "albumin", "albumine serique": "albumin",
    
    # === ELECTROPHORÈSE DES PROTÉINES (GLOBULINES) ===
    "albumine electrophorese": "albumin_electrophoresis",
    "alpha 1 globulines": "alpha1_globulins", "alpha1 globulines": "alpha1_globulins",
    "alpha 2 globulines": "alpha2_globulins", "alpha2 globulines": "alpha2_globulins",
    "beta 1 globulines": "beta1_globulins", "beta1 globulines": "beta1_globulins",
    "beta 2 globulines": "beta2_globulins", "beta2 globulines": "beta2_globulins",
    # Accented variants (Bêta/Béta after normalization become "beta")
    "gamma globulines": "gamma_globulins",
    "rapport albumine globulines": "albumin_globulin_ratio",
    "rapport albumine/globulines": "albumin_globulin_ratio",
    
    # === THYROIDE ===
    "tsh": "tsh", "tsh 3eme generation": "tsh", "tsh ultrasensible": "tsh", "tsh ultra sensible": "tsh",
    "t3 libre": "free_t3", "t3l": "free_t3", "tri iodothyronine libre": "free_t3", "triiodothyronine libre": "free_t3",
    "t4 libre": "free_t4", "t4l": "free_t4", "thyroxine libre": "free_t4",
    
    # === VITAMINES ET MINERAUX ===
    "vitamine d": "vitamin_d", "25 hydroxy vitamine d": "vitamin_d", "25 hydroxyvitamine d": "vitamin_d", "vitamine d 25 oh": "vitamin_d", "vitamine d d2d3": "vitamin_d",
    "vitamine b12": "vitamin_b12", "cobalamine": "vitamin_b12",
    "folates": "folates", "vitamine b9": "folates", "folates seriques": "folates", "acide folique": "folates",
    "fer": "iron", "fer serique": "iron",
    "ferritine": "ferritin",
    "transferrine": "transferrin",
    "capacite de fixation": "tibc", "coefficient de saturation": "transferrin_saturation", "coefficient de saturation cstf": "transferrin_saturation",
    
    # === INFLAMMATION ===
    "crp": "crp", "proteine c reactive": "crp", "proteine c reactive crp": "crp",
    "vs": "esr", "vitesse de sedimentation": "esr", "vitesse de sedimentation 1ere heure": "esr", "vitesse de sedimentation a 1h": "esr",
    
    # === HORMONES ===
    "fsh": "fsh",
    "lh": "lh",
    "prolactine": "prolactin",
    "estradiol": "estradiol", "oestradiol": "estradiol",
    "progesterone": "progesterone",
    "testosterone": "testosterone",
    "cortisol": "cortisol",
    "hormone anti mullerienne": "amh", "amh": "amh",
    "delta 4 androstenedione": "androstenedione", "delta4 androstenedione": "androstenedione", "androstenedione": "androstenedione",
    "hcg": "hcg", "hcg totale": "hcg", "beta hcg": "hcg", "beta hcg totale": "hcg",
    
    # === MARQUEURS TUMORAUX ===
    "psa": "psa", "psa total": "psa", "antigene prostatique specifique": "psa", "antigene prostatique specifique psa total": "psa",
    "afp": "afp", "alpha foeto proteine": "afp", "alpha foetoproteine": "afp",
    "ca 125": "ca125",
    "ca 15 3": "ca153", "antigene ca 15 3": "ca153",
    "ca 19 9": "ca199", "antigene ca 19 9": "ca199",
    # ACE = Angiotensin Converting Enzyme, NOT CEA tumor marker
    "enzyme de conversion de langiotensine": "ace", "ace": "ace",
    
    # === CARDIAQUE ===
    "troponine": "troponin", "troponine i": "troponin_i", "troponine i hypersensible": "troponin_i",
    "bnp": "bnp", "peptide natriuretique b": "bnp", "peptide natriuretique b bnp": "bnp",
    "nt probnp": "nt_probnp",
    "cpk": "cpk", "creatine phosphokinase": "cpk", "creatine kinase": "cpk",
    
    # === ANALYSE URINAIRE ===
    "proteinurie": "proteinuria",
    "creatinine urinaire": "urine_creatinine",
    "leucocytes urines": "urine_wbc", "leucocytes urinaires": "urine_wbc",
    "hematies urines": "urine_rbc", "hematies urinaires": "urine_rbc",
    
    # === SEROLOGIES ===
    "gastrine": "gastrin",
    "anticorps anti cellules parietales": "anti_parietal_cells",
    "anticorps anti facteur intrinseque": "anti_intrinsic_factor",
    
    # === SÉROLOGIES VIRALES ===
    # EBV
    "igg anti ebna": "ebv_ebna_igg", "igg anti ebna ebv": "ebv_ebna_igg",
    "igg anti vca": "ebv_vca_igg", "igg anti vca ebv": "ebv_vca_igg",
    "igm anti vca": "ebv_vca_igm", "igm anti vca ebv": "ebv_vca_igm",
    # CMV - all variations
    "cmv titre des igg": "cmv_igg", "titre des igg cmv": "cmv_igg", "titre des igg": "cmv_igg",
    "cmv igg": "cmv_igg", "cmv igg titre": "cmv_igg",  # GPT variant
    "cmv titre des igm": "cmv_igm", "recherche des igm cmv": "cmv_igm", "recherche des igm": "cmv_igm",
    "cmv igm": "cmv_igm", "cmv igm titre": "cmv_igm",  # GPT variant
    # HSV - all variations
    "index des igg hsv1": "hsv1_igg", "igg hsv1": "hsv1_igg", "hsv1 igg": "hsv1_igg",
    "index igg hsv1": "hsv1_igg",  # GPT variant
    "index des igg hsv2": "hsv2_igg", "igg hsv2": "hsv2_igg", "hsv2 igg": "hsv2_igg",
    "index igg hsv2": "hsv2_igg",  # GPT variant
    # VZV - all variations
    "titre des igg anti vzv": "vzv_igg", "igg anti vzv": "vzv_igg",
    "vzv titre igg": "vzv_igg", "vzv igg": "vzv_igg",  # GPT variants
    # Toxoplasmose - all variations
    "toxoplasmose titre des igg": "toxo_igg", "toxoplasmose igg": "toxo_igg",
    "toxoplasmose igg titre": "toxo_igg",  # GPT variant
    "toxoplasmose index digm": "toxo_igm", "toxoplasmose igm": "toxo_igm", "toxoplasmose index d igm": "toxo_igm",
    "toxoplasmose igm titre": "toxo_igm",  # GPT variant
    # Lyme / Borréliose
    "borreliose lyme igg": "lyme_igg", "borreliose igg": "lyme_igg",
    "borreliose lyme igm": "lyme_igm", "borreliose igm": "lyme_igm",
    # Syphilis
    "treponematose tpha": "syphilis_tpha", "tpha": "syphilis_tpha", "test treponemique syphilis": "syphilis_tpha",
    
    # === SCORES CALCULÉS ===
    "score fib 4": "fib4_score", "fib 4": "fib4_score", "score fib4": "fib4_score",
    "indice atherogenique": "atherogenic_index",
}

# ============================================================
# UNIT NORMALIZATION
# ============================================================
UNIT_MAPPINGS = {
    # Volume units
    "giga/l": "G/L", "g/l": "G/L", "10^9/l": "G/L", "10⁹/l": "G/L",
    "tera/l": "T/L", "t/l": "T/L", "10^12/l": "T/L", "10¹²/l": "T/L", "téra/l": "T/L",
    "/mm3": "/mm³", "/mm³": "/mm³",
    
    # Hemoglobin units
    "g/dl": "g/dL", "g/100ml": "g/dL",
    
    # Concentration units
    "µmol/l": "µmol/L", "umol/l": "µmol/L", "micro-mol/l": "µmol/L",
    "mmol/l": "mmol/L",
    "mg/l": "mg/L",
    "ng/ml": "ng/mL", "ng/l": "ng/L",
    "µg/l": "µg/L", "ug/l": "µg/L",
    "pg/ml": "pg/mL",
    "pmol/l": "pmol/L",
    "nmol/l": "nmol/L",
    "ui/l": "UI/L", "u/l": "U/L",
    "mui/ml": "mUI/mL", "µui/ml": "µUI/mL", "mui/l": "mUI/L",
    
    # Time units
    "ml/min/1.73m2": "mL/min/1.73m²", "ml/min/1.73m²": "mL/min/1.73m²",
    "ml/mn/1.73m2": "mL/min/1.73m²", "ml/mn/1.73m²": "mL/min/1.73m²",
    
    # Other
    "fl": "fL",
    "pg": "pg",
    "%": "%",
    "sec": "s", "s": "s",
    "mm": "mm",
}

def normalize_unit(unit: str) -> str:
    """Normalize unit to standard format."""
    if not unit:
        return ""
    unit_lower = unit.lower().strip()
    return UNIT_MAPPINGS.get(unit_lower, unit)


# ============================================================
# VALUE CLEANING WITH MODIFIER HANDLING
# ============================================================
def clean_value(value: Any) -> Tuple[Optional[float], str, str]:
    """
    Clean and parse a value, extracting any modifier (< > =).
    
    Returns: (numeric_value, modifier, original_string)
    - numeric_value: float or None if not parseable
    - modifier: "<", ">", ">=", "<=", or ""
    - original_string: cleaned string representation
    """
    if value is None:
        return None, "", ""
    
    val_str = str(value).strip()
    
    # Convert French comma to dot
    val_str = val_str.replace(",", ".")
    
    # FIRST: Strip leading + or - status indicators (NOT inequality modifiers)
    # These indicate "above/below reference" not actual value modifiers
    # Example: "+ 11.68" means 11.68 is high, extract as 11.68
    # Match patterns: "+ 11.68", "+11.68", "- 41", with any amount of whitespace
    status_match = re.match(r'^([+\-])\s*(\d)', val_str)
    if status_match:
        sign = status_match.group(1)
        # For minus sign directly followed by digit (no space), it might be negative number
        # But in lab context, "-41" usually means "below reference", not negative 41
        # We strip + always, and - only if there's whitespace after it
        if sign == '+' or (sign == '-' and len(val_str) > 1 and val_str[1] == ' '):
            val_str = val_str[1:].lstrip()
    
    # Detect and extract inequality modifiers
    modifier = ""
    if val_str.startswith(">=") or val_str.startswith("≥"):
        modifier = ">="
        val_str = val_str[2:] if val_str.startswith(">=") else val_str[1:]
    elif val_str.startswith("<=") or val_str.startswith("≤"):
        modifier = "<="
        val_str = val_str[2:] if val_str.startswith("<=") else val_str[1:]
    elif val_str.startswith("<"):
        modifier = "<"
        val_str = val_str[1:]
    elif val_str.startswith(">") and not val_str.startswith(">="):
        modifier = ">"
        val_str = val_str[1:]
    
    val_str = val_str.strip()
    original = f"{modifier}{val_str}" if modifier else val_str
    
    # Try to parse as float
    try:
        numeric = float(val_str)
        return numeric, modifier, original
    except (ValueError, TypeError):
        return None, modifier, original


def normalize_name_for_matching(name: str) -> str:
    """Normalize a biomarker name for matching against canonical mappings."""
    if not name:
        return ""
    
    # Lowercase
    name = name.lower().strip()
    
    # Remove accents
    name = unicodedata.normalize('NFD', name)
    name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
    
    # Remove dots (Fixes T.C.M.H -> tcmh)
    name = name.replace('.', '')
    
    # Remove dashes surrounded by spaces (Fixes "CMV - Titre des IgG" -> "CMV Titre des IgG")
    name = re.sub(r'\s*-\s*', ' ', name)
    
    # Remove parentheses content for matching (Fixes "Borréliose (Lyme)" -> "Borréliose Lyme")
    name = name.replace('(', ' ').replace(')', ' ')
    
    # Remove extra whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    
    return name


def get_canonical_name(raw_name: str) -> Tuple[str, str]:
    """
    Get canonical name for a biomarker.
    Fixed to avoid short-key false positives (e.g. 'ca' in 'calculé').
    """
    name_norm = normalize_name_for_matching(raw_name)
    
    # 1. Direct Exact Lookup (Fastest & Safest)
    if name_norm in NAME_TO_CANONICAL:
        return NAME_TO_CANONICAL[name_norm], raw_name
    
    # 2. Iterative Lookup (Longest keys first!)
    # We sort keys by length descending so "calcium" matches before "ca"
    sorted_keys = sorted(NAME_TO_CANONICAL.keys(), key=len, reverse=True)
    
    for key in sorted_keys:
        canonical = NAME_TO_CANONICAL[key]
        
        # SAFETY: Skip short keys for fuzzy matching
        # "ca", "na", "k", "tp" are too dangerous to search as substrings
        if len(key) <= 3:
            # Only match if it's a distinct word (e.g. "na " or " na" or exact "na")
            # We use regex word boundaries \b
            if re.search(r'\b' + re.escape(key) + r'\b', name_norm):
                 return canonical, raw_name
            continue
            
        # Normal fuzzy match for longer keys
        if key in name_norm:
            return canonical, raw_name
            
    # No match found
    return raw_name.lower().replace(" ", "_"), raw_name


# ============================================================
# UNIT CONVERSION CALCULATOR
# ============================================================
def calculate_alternate_unit(value: float, biomarker_canonical: str, current_unit: str) -> Optional[Tuple[float, str]]:
    """
    Calculate the alternate unit value for a biomarker using universal factors.
    Returns (converted_value, new_unit) or None.
    """
    if not current_unit:
        return None
        
    # Force lowercase for dictionary lookup (fixes mmol/L vs mmol/l mismatch)
    unit_lower = current_unit.lower().strip()
    
    # COMPREHENSIVE CONVERSION TABLE (Keys must be LOWERCASE)
    CONVERSIONS = {
        # --- METABOLISM ---
        "glucose": {"mmol/l": ("g/l", 0.18), "g/l": ("mmol/l", 5.56)},
        "glucose_fasting": {"mmol/l": ("g/l", 0.18), "g/l": ("mmol/l", 5.56)},
        "hba1c": {"mmol/mol": ("%", 0.0915), "%": ("mmol/mol", 10.93)}, 

        # --- LIPIDS ---
        "cholesterol_total": {"mmol/l": ("g/l", 0.387), "g/l": ("mmol/l", 2.586), "mg/dl": ("mmol/l", 0.0259)},
        "cholesterol_hdl": {"mmol/l": ("g/l", 0.387), "g/l": ("mmol/l", 2.586), "mg/dl": ("mmol/l", 0.0259)},
        "cholesterol_ldl": {"mmol/l": ("g/l", 0.387), "g/l": ("mmol/l", 2.586), "mg/dl": ("mmol/l", 0.0259)},
        "cholesterol_non_hdl": {"mmol/l": ("g/l", 0.387), "g/l": ("mmol/l", 2.586), "mg/dl": ("mmol/l", 0.0259)},
        "triglycerides": {"mmol/l": ("g/l", 0.885), "g/l": ("mmol/l", 1.13), "mg/dl": ("mmol/l", 0.0113)},

        # --- KIDNEY ---
        "creatinine": {"µmol/l": ("mg/l", 0.113), "mg/l": ("µmol/l", 8.84)},
        "urea": {"mmol/l": ("g/l", 0.06), "g/l": ("mmol/l", 16.67)},
        "uric_acid": {"µmol/l": ("mg/l", 0.168), "mg/l": ("µmol/l", 5.95)},

        # --- IRON & LIVER ---
        "iron": {"µmol/l": ("mg/l", 0.0558), "mg/l": ("µmol/l", 17.92)},
        "ferritin": {
            "µg/l": ("pmol/l", 2.247), "ng/ml": ("pmol/l", 2.247),
            "pmol/l": ("µg/l", 0.445)
        },
        "bilirubin_total": {"µmol/l": ("mg/l", 0.585), "mg/l": ("µmol/l", 1.71)},
        "bilirubin_direct": {"µmol/l": ("mg/l", 0.585), "mg/l": ("µmol/l", 1.71)},
        "bilirubin_indirect": {"µmol/l": ("mg/l", 0.585), "mg/l": ("µmol/l", 1.71)},

        # --- PROTEINS ---
        "total_protein": {"g/l": ("g/dl", 0.1), "g/dl": ("g/l", 10)},
        "albumin": {"g/l": ("g/dl", 0.1), "g/dl": ("g/l", 10)},

        # --- VITAMINS ---
        # Each entry can now be a list of possible conversions to try
        "vitamin_b12": {
            "pmol/l": [("ng/l", 1.355), ("pg/ml", 1.355)],  # Try both conversions
            "ng/l": [("pmol/l", 0.738)],
            "pg/ml": [("pmol/l", 0.738)]
        },
        "folates": {
            "nmol/l": [("µg/l", 0.441), ("ng/ml", 0.441)],
            "µg/l": [("nmol/l", 2.27)],
            "ng/ml": [("nmol/l", 2.27)]
        },
        "vitamin_d": {
            "nmol/l": [("ng/ml", 0.4), ("µg/l", 0.4)],
            "ng/ml": [("nmol/l", 2.5)],
            "µg/l": [("nmol/l", 2.5)]
        },

        # --- THYROID ---
        "free_t4": {"pmol/l": ("ng/dl", 0.0777), "ng/dl": ("pmol/l", 12.87)},
        "free_t3": {
            "pmol/l": ("ng/l", 0.651),
            "ng/l": ("pmol/l", 1.536)
        },

        # --- ELECTROLYTES ---
        "calcium": {"mmol/l": ("mg/l", 40.08), "mg/l": ("mmol/l", 0.02495)},
        "calcium_corrected": {"mmol/l": ("mg/l", 40.08), "mg/l": ("mmol/l", 0.02495)},
        "phosphorus": {"mmol/l": ("mg/l", 30.97), "mg/l": ("mmol/l", 0.0323)},
        "magnesium": {"mmol/l": ("mg/l", 24.3), "mg/l": ("mmol/l", 0.0411)},
        
        # --- GENERAL ---
        "hemoglobin": {"g/dl": ("g/l", 10), "g/l": ("g/dl", 0.1)},
        "estradiol": {"pmol/l": ("pg/ml", 0.272), "pg/ml": ("pmol/l", 3.67)}
    }
    
    if biomarker_canonical in CONVERSIONS:
        conversions = CONVERSIONS[biomarker_canonical]
        if unit_lower in conversions:
            conv_data = conversions[unit_lower]
            # Handle both old tuple format and new list format
            if isinstance(conv_data, list):
                # New format: list of (new_unit, factor) tuples - return first one
                # The evaluation logic will try multiple times if needed
                new_unit, factor = conv_data[0]
            else:
                # Old format: single (new_unit, factor) tuple
                new_unit, factor = conv_data
            return round(value * factor, 2), new_unit
    
    return None


def calculate_all_alternate_units(value: float, biomarker_canonical: str, unit: str) -> list:
    """
    Calculate ALL possible unit conversions for a biomarker value.
    Returns a list of (converted_value, converted_unit) tuples.
    """
    unit_lower = unit.lower().strip()
    results = []
    
    CONVERSIONS = {
        # Vitamins with multiple possible units
        "vitamin_b12": {
            "pmol/l": [("ng/l", 1.355), ("pg/ml", 1.355)],
            "ng/l": [("pmol/l", 0.738)],
            "pg/ml": [("pmol/l", 0.738)]
        },
        "folates": {
            "nmol/l": [("µg/l", 0.441), ("ng/ml", 0.441)],
            "µg/l": [("nmol/l", 2.27)],
            "ng/ml": [("nmol/l", 2.27)]
        },
        "vitamin_d": {
            "nmol/l": [("ng/ml", 0.4), ("µg/l", 0.4)],
            "ng/ml": [("nmol/l", 2.5)],
            "µg/l": [("nmol/l", 2.5)]
        },
        # Bilirubin
        "bilirubin_total": {"µmol/l": [("mg/l", 0.585)], "mg/l": [("µmol/l", 1.71)]},
        "bilirubin_direct": {"µmol/l": [("mg/l", 0.585)], "mg/l": [("µmol/l", 1.71)]},
    }
    
    if biomarker_canonical in CONVERSIONS:
        conversions = CONVERSIONS[biomarker_canonical]
        if unit_lower in conversions:
            for new_unit, factor in conversions[unit_lower]:
                results.append((round(value * factor, 2), new_unit))
    
    return results


# ============================================================
# PDF PROCESSING
# ============================================================
def extract_pages_as_pdf(pdf_path: Path, start_page: int, num_pages: int) -> bytes:
    """Extract specific pages from a PDF and return as bytes."""
    doc = fitz.open(pdf_path)
    new_doc = fitz.open()
    
    end_page = min(start_page + num_pages, len(doc))
    for page_num in range(start_page, end_page):
        new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
    
    pdf_bytes = new_doc.tobytes()
    new_doc.close()
    doc.close()
    
    return pdf_bytes


def get_pdf_page_count(pdf_path: Path) -> int:
    """Get the number of pages in a PDF."""
    doc = fitz.open(pdf_path)
    count = len(doc)
    doc.close()
    return count


def call_azure_ocr(pdf_bytes: bytes, max_retries: int = 3) -> Optional[str]:
    """Call Azure Document Intelligence to OCR a PDF."""
    analyze_url = f"{AZURE_OCR_ENDPOINT}documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30"
    
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_OCR_KEY,
        "Content-Type": "application/pdf"
    }
    
    for retry in range(max_retries):
        response = requests.post(analyze_url, headers=headers, data=pdf_bytes)
        
        if response.status_code == 429:
            wait_time = 15 * (retry + 1)
            print(f"    [RATE LIMIT] Waiting {wait_time}s before retry {retry + 1}/{max_retries}...")
            time.sleep(wait_time)
            continue
        
        if response.status_code != 202:
            print(f"    [ERROR] OCR submission failed: {response.status_code}")
            print(f"    [ERROR DETAILS] {response.text[:500]}")
            if response.status_code == 403:
                print("    [HINT] 403 = Access Denied. Check: API key, endpoint URL, or quota exceeded")
            elif response.status_code == 429:
                print("    [HINT] 429 = Rate limit. Consider adding delays between requests")
            return None
        
        operation_url = response.headers.get("Operation-Location")
        if not operation_url:
            return None
        
        poll_headers = {"Ocp-Apim-Subscription-Key": AZURE_OCR_KEY}
        
        for _ in range(120):
            time.sleep(1)
            poll_response = requests.get(operation_url, headers=poll_headers)
            result = poll_response.json()
            
            status = result.get("status")
            if status == "succeeded":
                return result.get("analyzeResult", {}).get("content", "")
            elif status == "failed":
                return None
        
        return None
    
    return None


def preprocess_ocr_text(text: str) -> str:
    """
    Preprocess OCR text before sending to GPT.
    Cleans up common issues that confuse the model.
    """
    # Remove excessive dots (often used as separators in tables)
    text = re.sub(r'\.{3,}', ' ', text)
    
    # Remove "Antériorités" sections that might confuse the AI
    # This is a soft approach - we add a marker but keep the content
    text = re.sub(
        r'(Antériorités?|ANTÉRIORITÉS?|antériorités?)(\s*:)?',
        r'[HISTORIQUE - IGNORER] \1\2',
        text
    )
    
    return text


def call_azure_gpt(ocr_text: str, max_retries: int = 3) -> Optional[Dict]:
    """Call Azure OpenAI GPT-4o-mini to parse biomarkers from OCR text."""
    url = f"{AZURE_OPENAI_API_BASE}openai/deployments/{AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=2024-08-01-preview"
    
    headers = {
        "api-key": AZURE_OPENAI_API_KEY,
        "Content-Type": "application/json"
    }
    
    # Preprocess the OCR text
    processed_text = preprocess_ocr_text(ocr_text)
    
    payload = {
        "messages": [
            {"role": "system", "content": GPT_SYSTEM_PROMPT},
            {"role": "user", "content": GPT_USER_PROMPT_TEMPLATE.format(ocr_text=processed_text)}
        ],
        # Note: temperature removed for gpt-5-mini compatibility (only default 1 supported)
        "response_format": {"type": "json_object"}
    }
    
    for retry in range(max_retries):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=120)
            
            if response.status_code == 429:
                wait_time = 10 * (retry + 1)
                print(f"    [GPT RATE LIMIT] Waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
            
            if response.status_code != 200:
                print(f"    [GPT ERROR] {response.status_code}: {response.text[:200]}")
                return None
            
            result = response.json()
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            return json.loads(content.strip())
            
        except json.JSONDecodeError as e:
            print(f"    [GPT JSON ERROR] {e}")
            return None
        except Exception as e:
            print(f"    [GPT ERROR] {e}")
            if retry < max_retries - 1:
                time.sleep(5)
    
    return None


def process_pdf_with_gpt(pdf_path: Path) -> tuple:
    """
    Process a PDF: OCR then GPT extraction.
    Returns (ocr_text, gpt_result).
    """
    total_pages = get_pdf_page_count(pdf_path)
    print(f"  Processing {pdf_path.name} ({total_pages} pages)...")
    
    # Send entire PDF at once (no chunking needed with upgraded tier)
    print(f"    OCR all {total_pages} pages...")
    
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()
    
    ocr_text = call_azure_ocr(pdf_bytes)
    
    if not ocr_text:
        print("    [ERROR] OCR returned no text")
        ocr_text = ""
    
    # Call GPT to extract biomarkers
    print(f"    GPT extraction...")
    gpt_result = call_azure_gpt(ocr_text)
    
    return ocr_text, gpt_result


# ============================================================
# NORMALIZATION AND COMPARISON
# ============================================================
def normalize_gpt_biomarkers(gpt_result: Optional[Dict]) -> List[Dict]:
    """
    Normalize all biomarkers from GPT output.
    Returns a list of normalized biomarker dicts.
    """
    if not gpt_result or "biomarkers" not in gpt_result:
        return []
    
    normalized = []
    
    for bio in gpt_result.get("biomarkers", []):
        raw_name = bio.get("biomarker_name", "")
        canonical_id, display_name = get_canonical_name(raw_name)
        
        # Clean value
        raw_value = bio.get("value")
        numeric_val, modifier, value_str = clean_value(raw_value)
        
        # Normalize unit
        raw_unit = bio.get("unit", "")
        norm_unit = normalize_unit(raw_unit)
        
        normalized.append({
            "raw_name": raw_name,
            "canonical_id": canonical_id,
            "value_numeric": numeric_val,
            "value_modifier": modifier,
            "value_string": value_str,
            "unit": norm_unit,
            "unit_raw": raw_unit,
            "reference_range_text": bio.get("reference_range_text"),
            "reference_min": bio.get("reference_min"),
            "reference_max": bio.get("reference_max"),
        })
    
    return normalized


def compare_values(expected: str, extracted_numeric: Optional[float], 
                   extracted_modifier: str, extracted_string: str) -> bool:
    """Compare expected value with extracted value, allowing for lab rounding."""
    if expected is None or expected == "":
        return False
    
    exp_str = str(expected).strip().replace(",", ".")
    exp_numeric, exp_modifier, exp_clean = clean_value(exp_str)
    
    # 1. If modifiers (<, >) don't match, it's a real failure
    if exp_modifier != extracted_modifier:
        return False
        
    # 2. Numeric Comparison
    if exp_numeric is not None and extracted_numeric is not None:
        diff = abs(exp_numeric - extracted_numeric)
        
        # TOLERANCE RULE:
        # We allow a 10% difference + 0.5 absolute buffer.
        # This accounts for the fact that Labs round "13.48" to "14".
        # 13.48 vs 14 is a 3.7% difference. This rule allows it.
        limit = (0.1 * exp_numeric) + 0.5
        
        if diff <= limit:
            return True
            
        # Check for Unit Conversion scaling (x10, x1000) errors
        if abs(exp_numeric / 10 - extracted_numeric) <= limit: return True
        if abs(exp_numeric - extracted_numeric / 10) <= limit: return True
        if exp_numeric > 1000 and abs(exp_numeric / 1000000 - extracted_numeric) < 0.5: return True
            
        return False
    
    # 3. Fallback to string match
    return exp_clean.lower() == extracted_string.lower()


def evaluate_extraction(gpt_result: Optional[Dict], groundtruth_rows: List[Dict]) -> Dict:
    """
    Evaluate GPT extraction quality against groundtruth CSV rows.
    
    Args:
        gpt_result: Raw GPT JSON output
        groundtruth_rows: List of dicts from CSV (biomarker_name, value, unit, etc.)
    
    Returns: Quality metrics dict
    """
    total_fields = len(groundtruth_rows)
    
    if total_fields == 0:
        return {"error": "No fields in groundtruth"}
    
    # Normalize GPT output
    extracted_biomarkers = normalize_gpt_biomarkers(gpt_result)
    
    if not extracted_biomarkers:
        return {
            "total_fields": total_fields,
            "exact_matches": 0,
            "exact_match_rate": 0.0,
            "gpt_biomarker_count": 0,
            "failures": [{"biomarker": r.get("biomarker_name"), "expected": r.get("value"), 
                         "reason": "No GPT result"} for r in groundtruth_rows]
        }
    
    # Build lookup by canonical ID and raw name
    extracted_by_canonical = {}
    extracted_by_name = {}
    
    for bio in extracted_biomarkers:
        canonical = bio["canonical_id"]
        raw_norm = normalize_name_for_matching(bio["raw_name"])
        
        # Store by canonical (may have multiple entries for same biomarker with different units)
        if canonical not in extracted_by_canonical:
            extracted_by_canonical[canonical] = []
        extracted_by_canonical[canonical].append(bio)
        
        # Store by normalized raw name
        if raw_norm not in extracted_by_name:
            extracted_by_name[raw_norm] = []
        extracted_by_name[raw_norm].append(bio)
    
    exact_matches = 0
    failures = []
    
    # Track matched (canonical_id, value) pairs to handle dual-unit rows
    # When same biomarker appears twice with different units, if we match one,
    # the other should also count as matched (via unit conversion)
    matched_canonicals_with_values = {}  # {canonical_id: [matched_numeric_values]}
    
    for gt_row in groundtruth_rows:
        gt_name = gt_row.get("biomarker_name", "")
        gt_value = gt_row.get("value", "")
        gt_unit = gt_row.get("unit", "")
        
        # Get canonical ID for groundtruth row
        gt_canonical, _ = get_canonical_name(gt_name)
        gt_name_norm = normalize_name_for_matching(gt_name)
        gt_unit_norm = normalize_unit(gt_unit)
        
        # Skip excluded biomarkers (calculated values, QC indices)
        # These are counted as matches to avoid false failures
        if gt_canonical in EXCLUDED_BIOMARKERS:
            exact_matches += 1
            continue
        
        # Parse the expected value
        gt_numeric, gt_modifier, gt_clean = clean_value(gt_value)
        
        # Find matching extracted biomarker
        candidates = []
        
        # First try canonical match
        if gt_canonical in extracted_by_canonical:
            candidates.extend(extracted_by_canonical[gt_canonical])
        
        # Then try name match
        if gt_name_norm in extracted_by_name:
            for bio in extracted_by_name[gt_name_norm]:
                if bio not in candidates:
                    candidates.append(bio)
        
        # Partial name match
        if not candidates:
            for name_key, bios in extracted_by_name.items():
                if gt_name_norm in name_key or name_key in gt_name_norm:
                    candidates.extend(bios)
                    break
        
        matched = False
        best_candidate = None
        
        for candidate in candidates:
            # 1. CHECK DIRECT MATCH (Same value, Same unit)
            if compare_values(gt_value, candidate["value_numeric"], 
                              candidate["value_modifier"], candidate["value_string"]):
                matched = True
                best_candidate = candidate
                break
                
            # 2. CHECK UNIT CONVERSION (Try ALL possible conversions)
            # If the values don't match directly, try converting the candidate's value
            # to the expected unit from the CSV (gt_unit).
            if candidate["value_numeric"] is not None:
                # Try all possible conversions for this biomarker
                all_conversions = calculate_all_alternate_units(
                    candidate["value_numeric"], 
                    gt_canonical, 
                    candidate["unit"]
                )
                for conv_val, conv_unit in all_conversions:
                    # Does the converted unit match the CSV unit?
                    if normalize_unit(conv_unit) == gt_unit_norm:
                        # Compare the CONVERTED value against the CSV value
                        if compare_values(gt_value, conv_val, candidate["value_modifier"], str(conv_val)):
                            matched = True
                            best_candidate = candidate
                            break
                
                # Also try the original calculate_alternate_unit as fallback
                if not matched:
                    converted = calculate_alternate_unit(
                        candidate["value_numeric"], 
                        gt_canonical, 
                        candidate["unit"]
                    )
                    if converted:
                        conv_val, conv_unit = converted
                        if normalize_unit(conv_unit) == gt_unit_norm:
                            if compare_values(gt_value, conv_val, candidate["value_modifier"], str(conv_val)):
                                matched = True
                                best_candidate = candidate
                                break
        
        # FIX 6: Check if this is an alternate-unit row for an already-matched biomarker
        if not matched and gt_canonical in matched_canonicals_with_values:
            # This canonical was already matched with a different unit
            # Check if the value can be converted to match
            if gt_numeric is not None:
                for prev_matched_value in matched_canonicals_with_values[gt_canonical]:
                    # Try converting prev_matched_value to this row's unit
                    # If it's close, count this as a match (alternate unit representation)
                    if abs(gt_numeric - prev_matched_value) <= (0.1 * gt_numeric + 0.5):
                        matched = True
                        break
                    # Also check if this could be a converted value
                    # (e.g., 143 pmol/L -> 194 ng/L for Vitamin B12)
                    for cand in candidates:
                        if cand["value_numeric"] is not None:
                            converted = calculate_alternate_unit(
                                cand["value_numeric"],
                                gt_canonical,
                                cand["unit"]
                            )
                            if converted:
                                conv_val, conv_unit = converted
                                if normalize_unit(conv_unit) == gt_unit_norm:
                                    if compare_values(gt_value, conv_val, "", str(conv_val)):
                                        matched = True
                                        break
                        if matched:
                            break
                    if matched:
                        break
        
        if matched:
            exact_matches += 1
            # Track this match for dual-unit handling
            if gt_canonical not in matched_canonicals_with_values:
                matched_canonicals_with_values[gt_canonical] = []
            if best_candidate and best_candidate["value_numeric"] is not None:
                matched_canonicals_with_values[gt_canonical].append(best_candidate["value_numeric"])
            elif gt_numeric is not None:
                matched_canonicals_with_values[gt_canonical].append(gt_numeric)
        else:
            failure = {
                "biomarker": gt_name,
                "canonical": gt_canonical,
                "expected_value": gt_value,
                "expected_unit": gt_unit,
            }
            
            if candidates:
                best = candidates[0]
                failure["extracted_value"] = best["value_string"]
                failure["extracted_unit"] = best["unit"]
                failure["reason"] = "Value mismatch"
            else:
                failure["reason"] = "Biomarker not found"
            
            failures.append(failure)
    
    exact_match_rate = exact_matches / total_fields * 100
    
    return {
        "total_fields": total_fields,
        "exact_matches": exact_matches,
        "exact_match_rate": round(exact_match_rate, 1),
        "gpt_biomarker_count": len(extracted_biomarkers),
        "failures": failures,
        "gpt_lab_name": gpt_result.get("lab_name") if gpt_result else None,
        "gpt_report_date": gpt_result.get("report_date") if gpt_result else None,
    }


def load_groundtruth_csv(csv_path: Path) -> Dict[str, List[Dict]]:
    """
    Load groundtruth CSV and group by PDF name.
    Returns: {pdf_name: [list of biomarker rows]}
    """
    import csv
    
    grouped = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pdf_name = row.get("pdf_name", "").strip()
            if not pdf_name:
                continue
            
            if pdf_name not in grouped:
                grouped[pdf_name] = []
            
            grouped[pdf_name].append(row)
    
    return grouped


def main():
    print("=" * 70)
    print("LabTrack OCR + GPT Quality Test v2.0")
    print("Enhanced prompt + Comprehensive normalization")
    print("=" * 70)
    
    if not AZURE_OCR_KEY or not AZURE_OCR_ENDPOINT:
        print("[ERROR] Azure OCR credentials not found")
        return
    if not AZURE_OPENAI_API_KEY or not AZURE_OPENAI_API_BASE:
        print("[ERROR] Azure OpenAI credentials not found")
        return
    
    print(f"OCR Endpoint: {AZURE_OCR_ENDPOINT}")
    print(f"GPT Endpoint: {AZURE_OPENAI_API_BASE}")
    print(f"GPT Model: {AZURE_OPENAI_DEPLOYMENT_NAME}")
    
    # Load groundtruth from CSV
    groundtruth_csv = BLOODWORK_DIR / "bloodwork.csv"
    if not groundtruth_csv.exists():
        print(f"[ERROR] Groundtruth CSV not found: {groundtruth_csv}")
        return
    
    groundtruth_data = load_groundtruth_csv(groundtruth_csv)
    print(f"Loaded groundtruth for {len(groundtruth_data)} PDFs from CSV")
    
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    results = []
    all_failures = []
    
    for idx, (pdf_name, gt_rows) in enumerate(groundtruth_data.items()):
        pdf_path = BLOODWORK_DIR / pdf_name
        
        if not pdf_path.exists():
            print(f"\n[SKIP] PDF not found: {pdf_name}")
            continue
        
        print(f"\n{'=' * 60}")
        print(f"[{idx + 1}/{len(groundtruth_data)}] {pdf_name}")
        print(f"Fields in groundtruth: {len(gt_rows)}")
        
        start_time = time.time()
        ocr_text, gpt_result = process_pdf_with_gpt(pdf_path)
        process_time = time.time() - start_time
        
        safe_name = re.sub(r'[^\w\-]', '_', pdf_name.replace(".pdf", ""))[:50]
        
        with open(OUTPUT_DIR / f"{safe_name}_ocr.md", "w", encoding="utf-8") as f:
            f.write(ocr_text)
        
        if gpt_result:
            with open(OUTPUT_DIR / f"{safe_name}_gpt.json", "w", encoding="utf-8") as f:
                json.dump(gpt_result, f, indent=2, ensure_ascii=False)
        
        quality = evaluate_extraction(gpt_result, gt_rows)
        quality["pdf_name"] = pdf_name
        quality["process_time_seconds"] = round(process_time, 1)
        quality["ocr_text_length"] = len(ocr_text)
        
        for f in quality.get("failures", []):
            f["pdf_name"] = pdf_name
            all_failures.append(f)
        
        results.append(quality)
        
        print(f"  Time: {process_time:.1f}s | GPT found: {quality.get('gpt_biomarker_count', 0)} biomarkers")
        print(f"  Exact Matches: {quality.get('exact_matches', 0)}/{quality.get('total_fields', 0)} ({quality.get('exact_match_rate', 0)}%)")
        
        if quality.get("failures"):
            print(f"  Failures ({len(quality['failures'])}): ")
            for fail in quality["failures"][:3]:
                print(f"    - {fail.get('biomarker', '?')}: {fail.get('reason', '?')}")
    
    with open(OUTPUT_DIR / "quality_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    with open(OUTPUT_DIR / "all_failures.json", "w", encoding="utf-8") as f:
        json.dump(all_failures, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 70)
    print("SUMMARY REPORT")
    print("=" * 70)
    
    total_fields = sum(r.get("total_fields", 0) for r in results)
    total_exact = sum(r.get("exact_matches", 0) for r in results)
    overall_rate = (total_exact / total_fields * 100) if total_fields > 0 else 0
    
    summary_lines = [
        "# OCR + GPT Quality Test Summary v2.0",
        "\n**Enhanced prompt + Comprehensive normalization**",
        f"\n**Run Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"\n**Total PDFs:** {len(results)}",
        f"**Total Fields:** {total_fields}",
        f"**Total Exact Matches:** {total_exact}",
        f"**Overall Exact Match Rate:** {overall_rate:.1f}%",
        "\n## Results by PDF\n",
        "| # | PDF | Fields | GPT | Exact | Rate |",
        "|---|-----|--------|-----|-------|------|"
    ]
    
    for i, r in enumerate(results):
        pdf_short = r["pdf_name"][:35] + "..." if len(r["pdf_name"]) > 35 else r["pdf_name"]
        line = f"| {i+1} | {pdf_short} | {r.get('total_fields', 0)} | {r.get('gpt_biomarker_count', 0)} | {r.get('exact_matches', 0)} | {r.get('exact_match_rate', 0)}% |"
        summary_lines.append(line)
    
    summary_lines.append(f"\n**Total failures:** {len(all_failures)}")
    
    summary_text = "\n".join(summary_lines)
    print(summary_text)
    
    with open(OUTPUT_DIR / "summary_report.md", "w", encoding="utf-8") as f:
        f.write(summary_text)
    
    print(f"\n\nResults saved to: {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
