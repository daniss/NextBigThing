#!/usr/bin/env python3
"""
LOINC Prompt Injection Test - Experimental
Tests the new approach where LOINC codes are injected into the GPT prompt
and GPT performs normalization during extraction.

This is a SEPARATE test that doesn't modify the working code.
"""
import os
import json
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv('.env.local')

AZURE_OCR_KEY = os.getenv('AZURE_OCR_KEY')
AZURE_OCR_ENDPOINT = os.getenv('AZURE_OCR_ENDPOINT')
AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
AZURE_OPENAI_API_BASE = os.getenv('AZURE_OPENAI_API_BASE')
AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME')

BLOODWORK_DIR = Path("bloodwork")


def load_loinc_context(max_entries: int = 6000) -> str:
    """Load LOINC context from CSV and format for prompt injection."""
    loinc_path = Path("loinc_fr_context.csv")
    if not loinc_path.exists():
        return ""
    
    entries = []
    with open(loinc_path, 'r', encoding='utf-8') as f:
        next(f)  # Skip header
        for i, line in enumerate(f):
            if i >= max_entries:
                break
            parts = line.strip().split('|')
            if len(parts) >= 2:
                code, name = parts[0], parts[1]
                unit = parts[2] if len(parts) > 2 else ""
                entries.append(f"{code}|{name}|{unit}")
    
    return "\n".join(entries)


def build_loinc_system_prompt(loinc_context: str) -> str:
    """Build system prompt with LOINC context injection."""
    return f"""Tu es un expert médical spécialisé dans l'extraction de données de bilans sanguins français.
Extrais TOUS les biomarqueurs du document en JSON avec le format suivant:

{{
  "biomarkers": [
    {{"loinc_code": "718-7", "name": "Hémoglobine", "value": "13.5", "unit": "g/L"}}
  ]
}}

## RÈGLES D'EXTRACTION

1. **UTILISE LES CODES LOINC** de la liste ci-dessous pour identifier chaque biomarqueur
2. Si le biomarqueur est dans la liste, utilise son code LOINC exact
3. Si le biomarqueur N'EST PAS dans la liste, utilise "UNKNOWN" comme code et extrait le nom tel quel
4. Extrais TOUTES les valeurs numériques avec leurs unités
5. Convertis les virgules en points (1,85 → 1.85)
6. Garde les symboles < et > si présents (ex: "<5")
7. Ignore les colonnes "Antériorités" / valeurs historiques
8. Scanne TOUTES les pages, colonnes gauche ET droite

## LISTE DES CODES LOINC (Code|Nom français|Unité)
{loinc_context}

## FORMAT DE SORTIE
JSON strict avec: loinc_code, name, value, unit
"""


def call_azure_ocr(pdf_bytes: bytes) -> str:
    """Call Azure Document Intelligence for OCR."""
    analyze_url = f"{AZURE_OCR_ENDPOINT}documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30"
    
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_OCR_KEY,
        "Content-Type": "application/pdf"
    }
    
    response = requests.post(analyze_url, headers=headers, data=pdf_bytes)
    
    if response.status_code != 202:
        print(f"    [OCR ERROR] {response.status_code}: {response.text[:200]}")
        return ""
    
    operation_url = response.headers.get("Operation-Location")
    poll_headers = {"Ocp-Apim-Subscription-Key": AZURE_OCR_KEY}
    
    for _ in range(120):
        time.sleep(1)
        poll_response = requests.get(operation_url, headers=poll_headers)
        result = poll_response.json()
        
        if result.get("status") == "succeeded":
            content = result.get("analyzeResult", {}).get("content", "")
            return content
        elif result.get("status") == "failed":
            return ""
    
    return ""


def call_azure_gpt_loinc(ocr_text: str, loinc_prompt: str):
    """Call Azure GPT with LOINC-injected prompt."""
    url = f"{AZURE_OPENAI_API_BASE}openai/deployments/{AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=2024-08-01-preview"
    
    headers = {
        "api-key": AZURE_OPENAI_API_KEY,
        "Content-Type": "application/json"
    }
    
    user_prompt = f"""Extrais tous les biomarqueurs de ce bilan sanguin.
Utilise les codes LOINC de la liste fournie pour chaque biomarqueur identifié.

Texte OCR:
{ocr_text}"""
    
    payload = {
        "messages": [
            {"role": "system", "content": loinc_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"}
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        
        if response.status_code == 429:
            print("    [RATE LIMIT] Waiting 15s...")
            time.sleep(15)
            response = requests.post(url, headers=headers, json=payload, timeout=120)
        
        if response.status_code != 200:
            print(f"    [GPT ERROR] {response.status_code}: {response.text[:200]}")
            return None
        
        result = response.json()
        
        # Token economics logging
        usage = result.get("usage", {})
        if usage:
            cached = usage.get('prompt_tokens_details', {}).get('cached_tokens', 0)
            total_input = usage.get('prompt_tokens', 0)
            new_tokens = total_input - cached
            output_tokens = usage.get('completion_tokens', 0)
            print(f"\n    --- TOKEN ECONOMICS ---")
            print(f"    Input Tokens: {total_input:,} (Cached: {cached:,}, New: {new_tokens:,})")
            print(f"    Output Tokens: {output_tokens:,}")
            print(f"    ---------------------------")
        
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        return json.loads(content.strip())
        
    except Exception as e:
        print(f"    [GPT ERROR] {e}")
        return None


def main():
    print("=" * 70)
    print("LOINC Prompt Injection Test - FULL 5300 entries")
    print("=" * 70)
    
    # Load ALL LOINC entries
    print("Loading LOINC context...")
    loinc_context = load_loinc_context(max_entries=6000)
    loinc_entries = len(loinc_context.split('\n'))
    print(f"Loaded {loinc_entries} LOINC entries")
    
    # Build system prompt
    loinc_prompt = build_loinc_system_prompt(loinc_context)
    prompt_tokens = len(loinc_prompt) / 4
    print(f"System prompt: ~{int(prompt_tokens)} tokens")
    
    # Get ALL PDFs from bloodwork directory
    all_pdfs = sorted([p.name for p in BLOODWORK_DIR.glob("*.pdf")])
    print(f"Found {len(all_pdfs)} PDFs to test")
    
    total_biomarkers = 0
    total_loinc_matched = 0
    total_unknown = 0
    
    for i, pdf_name in enumerate(all_pdfs, 1):
        pdf_path = BLOODWORK_DIR / pdf_name
        if not pdf_path.exists():
            print(f"\n[{i}/{len(all_pdfs)}] {pdf_name[:50]}... NOT FOUND")
            continue
            
        print(f"\n[{i}/{len(all_pdfs)}] {pdf_name[:50]}...")
        print("-" * 70)
        
        # OCR
        print("  Running OCR...")
        with open(pdf_path, 'rb') as f:
            pdf_bytes = f.read()
        
        ocr_text = call_azure_ocr(pdf_bytes)
        if not ocr_text:
            print("  OCR failed!")
            continue
        
        ocr_tokens = len(ocr_text) / 4
        print(f"  OCR text: ~{int(ocr_tokens)} tokens")
        
        # GPT Extraction with LOINC
        print("  Running GPT with LOINC injection...")
        result = call_azure_gpt_loinc(ocr_text, loinc_prompt)
        
        if result:
            biomarkers = result.get("biomarkers", [])
            loinc_matches = sum(1 for b in biomarkers if b.get('loinc_code', 'UNKNOWN') != 'UNKNOWN')
            unknown_count = sum(1 for b in biomarkers if b.get('loinc_code', 'UNKNOWN') == 'UNKNOWN')
            
            total_biomarkers += len(biomarkers)
            total_loinc_matched += loinc_matches
            total_unknown += unknown_count
            
            match_rate = loinc_matches / len(biomarkers) * 100 if biomarkers else 0
            
            print(f"  ✅ {len(biomarkers)} biomarkers | {loinc_matches} LOINC matched | {unknown_count} unknown | {match_rate:.1f}%")
            
            # Show unknowns if any
            if unknown_count > 0:
                unknowns = [b.get('name', '?') for b in biomarkers if b.get('loinc_code', 'UNKNOWN') == 'UNKNOWN']
                print(f"  Unknown: {', '.join(unknowns[:5])}" + (" ..." if len(unknowns) > 5 else ""))
            
            # Save result
            output_path = Path("ocr_gpt_test_results") / f"loinc_test_{pdf_path.stem[:30]}.json"
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
        else:
            print("  ❌ GPT extraction failed!")
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total biomarkers: {total_biomarkers}")
    print(f"LOINC matched: {total_loinc_matched}")
    print(f"Unknown: {total_unknown}")
    if total_biomarkers > 0:
        print(f"Overall LOINC match rate: {total_loinc_matched/total_biomarkers*100:.1f}%")


if __name__ == "__main__":
    main()
