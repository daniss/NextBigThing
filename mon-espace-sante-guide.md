# Mon Espace Santé Integration Guide for Startups

## Complete Practical Guide for Third-Party Health App Integration

**Last Updated**: December 2025

---

## EXECUTIVE SUMMARY

**Mon Espace Santé (MES)** is France's national digital health record platform, launched February 2022. For a startup wanting to integrate, here's the reality:

| Factor | Assessment |
|--------|------------|
| **Market Size** | 68+ million accounts, 16+ million activated (23%) |
| **Current Catalog** | 36 referenced solutions (as of Dec 2025) |
| **Timeline** | 6-18 months realistic for full integration |
| **Cost** | €50,000 - €200,000+ (HDS hosting, compliance, legal, technical) |
| **Complexity** | HIGH - regulatory maze, multiple certifications required |
| **Recommendation** | Consider alternative strategies before pursuing full MES integration |

---

## 1. WHAT IS MON ESPACE SANTÉ?

### Overview
Mon Espace Santé is the personal digital health space for all French citizens (opt-out system since Feb 2022).

### Components
1. **DMP (Dossier Médical Partagé)** - Shared medical record
2. **Secure Messaging** - MSSanté integration
3. **Service Catalog** - Third-party apps (36 currently referenced)
4. **Health Agenda** - Appointments and reminders
5. **Prevention Pathways** - Personalized health programs

### Key Statistics
- 68+ million accounts created
- 16+ million activated (23% activation rate)
- 36 solutions currently in catalog
- 50+ interconnectable apps planned by end 2026

---

## 2. THE REFERENCING PROCESS (5 STEPS)

### Step 1: Create Account on Industriels Santé Connect (iSC)
- Register at: https://isconnect.esante.gouv.fr/enrollement/user/start
- Access to Convergence platform, Gazelle testing, etc.
- **Timeline**: ~2 weeks for validation

### Step 2: Sign Convention + Submit Request
- Sign convention with **GIE SESAM-Vitale**
- Complete referencing request form
- **Timeline**: 2-4 weeks

### Step 3: Complete 6 Thematic Questionnaires
Evaluated on ~100 criteria across:

| Questionnaire | Focus |
|--------------|-------|
| 1. Interoperability | CI-SIS compliance, FHIR standards |
| 2. Urbanization | Integration architecture |
| 3. Security Maturity | PGSSI-S compliance, penetration testing |
| 4. Ethics | Responsible AI, data usage |
| 5. RGPD | Privacy compliance, DPO |
| 6. Data Exchange | Only if exchanging data with MES |

**Timeline**: 4-8 weeks (depends on preparation)

### Step 4: Technical API Testing
- Test in sandbox (Bac à Sable) environment
- Use test certificates and identities
- Validate all technical integrations
- **Timeline**: 4-12 weeks

### Step 5: Commission Decision
- Review by referencing commission
- Decision on catalog inclusion
- **Timeline**: 4-8 weeks for decision

### Total Realistic Timeline: 6-18 months

---

## 3. MANDATORY CERTIFICATIONS & REQUIREMENTS

### A. HDS Certification (Hébergeur de Données de Santé)
**MANDATORY if you host health data for third parties**

#### What is HDS?
Certification required for any organization hosting personal health data collected during prevention, diagnosis, care, or medical-social follow-up.

#### Two Types of HDS Certificates:
1. **Infrastructure Hosting** (Activities 1-2)
   - Physical site hosting
   - Hardware infrastructure
   
2. **Managed Services** (Activities 3-6)
   - Virtual infrastructure
   - Application platform hosting
   - System administration
   - Data backup

#### HDS Certification Process:
1. Choose COFRAC-accredited certification body
2. **Documentary audit** (system review)
3. **On-site audit** (evidence collection)
4. 3 months to correct non-conformities
5. Certificate valid for **3 years** (annual surveillance audits)

#### Certified HDS Providers (Can Partner With):
- **2,383 certified providers** as of Dec 2025
- Major cloud providers: AWS, Azure (Microsoft), Google Cloud, OVHcloud
- French options: OVHcloud, Scaleway, Clever Cloud
- Full list: https://esante.gouv.fr/offres-services/hds/liste-des-herbergeurs-certifies

#### Cost Estimate for HDS:
- Using certified provider: €500-2,000/month (managed hosting)
- Self-certification: €50,000-150,000+ (audit + compliance + infrastructure)

**Recommendation for Startups**: Use an existing HDS-certified cloud provider rather than pursuing your own certification.

---

### B. Pro Santé Connect (PSC) Integration
**MANDATORY for "sensitive" health services since January 2023**

#### What is PSC?
- OpenID-standard identity provider for healthcare professionals
- Enables authentication via e-CPS (mobile app) or physical CPS card
- 586+ services connected, 180,000+ monthly users

#### Why Required?
- Mandatory for services handling sensitive health data
- Provides standardized, secure authentication
- Builds trust with healthcare ecosystem

#### PSC Integration Steps:
1. Create iSC account
2. Submit Datapass request (API access)
3. Activate Espace Authentifié
4. Request sandbox (BAS) access
5. Obtain test credentials (CPS cards or e-CPS test identities)
6. Complete testing
7. Request production access

#### Timeline: 4-8 weeks for basic integration

#### Cost: Free (PSC is a government service)

---

### C. CI-SIS Compliance (Interoperability Framework)

#### What is CI-SIS?
The **Cadre d'Interopérabilité des Systèmes d'Information de Santé** defines rules for health IT communication across health, medico-social, and social sectors.

#### Three Layers:
1. **Business Layer** (Couche Métier)
   - Medical document formats (CDA, FHIR)
   - Lab results, imaging reports, prescriptions, etc.
   
2. **Service Layer** (Couche Service)
   - Document sharing (XDS, PDSm)
   - Notifications, agenda management
   - Health measures (FHIR format for MES)
   
3. **Transport Layer** (Couche Transport)
   - Synchronous transport for client applications
   - REST API transport specifications

#### Key Specifications for MES Integration:
- **Health Measures** (Mesures de santé) v3.0.1 - FHIR format
- **FrObservation** profiles for health data
- Document sharing via XDS/PDSm

#### Resources:
- CI-SIS Publication Space: https://esante.gouv.fr/interoperabilite/ci-sis/espace-publication
- Contact: ci-sis@esante.gouv.fr

---

### D. PGSSI-S Compliance (Security Policy)

#### What is PGSSI-S?
**Politique Générale de Sécurité des Systèmes d'Information de Santé** - Security framework for health IT systems.

#### Key Requirements:
- Security maturity assessment
- Identification and authentication standards
- Data protection measures
- Audit trails and logging

#### Identity Requirements (RIE v2.0 coming T2 2026):
- Electronic identification of healthcare professionals
- Patient/user identity verification
- Authentication levels based on data sensitivity

---

### E. RGPD (GDPR) Compliance

#### Requirements:
- Data Protection Officer (DPO) designation
- Privacy impact assessment (PIA)
- Consent management
- Data subject rights handling
- Breach notification procedures

---

### F. CE Marking (if Medical Device)

#### When Required:
If your app makes clinical claims (diagnose, treat, predict disease), it's a **Software as Medical Device (SaMD)** under EU MDR.

#### Classification:
- Class I: Low risk (wellness, general health)
- Class IIa/IIb: Medium risk (clinical decision support)
- Class III: High risk (life-critical)

#### Timeline: 12-36 months for MDR compliance

**Recommendation**: Position as wellness/information tool to avoid medical device classification if possible.

---

## 4. TECHNICAL REQUIREMENTS

### Data Formats
| Type | Format | Standard |
|------|--------|----------|
| Health Measures | FHIR | FrObservation profile |
| Medical Documents | CDA R2 | CI-SIS specifications |
| Document Exchange | XDS/FHIR | PDSm (FHIR) or XDS |
| Messaging | MSSanté | Secure health messaging |

### API Integration
- Authentication: Pro Santé Connect (OpenID)
- Data Exchange: FHIR R4 APIs
- Document Sharing: IHE XDS or PDSm
- Test Environment: Bac à Sable (BAS)

### Security Requirements
- TLS 1.2+ encryption
- mTLS recommended for API calls
- Certificate management via IGC-Santé (PFCNG)
- Penetration testing required

---

## 5. REGULATORY REFERENCES

### Primary Legislation:
- **Loi n° 2019-774** (July 24, 2019) - Health system transformation
- **Décret n° 2021-1047** (August 4, 2021) - MES creation
- **Décret n° 2021-1048** (August 4, 2021) - MES implementation
- **Arrêté du 26 avril 2022** - Mandatory DMP documents
- **Arrêté du 19 juin 2025** - Updated referencing criteria (V4)
- **Décret 2018-137** (February 26, 2018) - HDS certification
- **Arrêté du 26 avril 2024** - Updated HDS referential (v2.0)

### Code de la Santé Publique:
- Articles R. 1111-26 to R. 1111-52 (DMP/MES rules)
- Article L.1111-8 (HDS requirements)

---

## 6. COST ESTIMATES FOR STARTUPS

### Minimum Budget (Using Existing Infrastructure):
| Item | Cost Range |
|------|------------|
| HDS-certified hosting | €6,000-24,000/year |
| Legal/compliance consulting | €10,000-30,000 |
| Technical development | €20,000-50,000 |
| Security audit/penetration testing | €5,000-15,000 |
| DPO services | €3,000-10,000/year |
| Certification fees | €2,000-5,000 |
| **TOTAL (Year 1)** | **€46,000-134,000** |

### If Pursuing Own HDS Certification:
Add €50,000-150,000 for certification process + ongoing compliance.

### If Medical Device (CE Marking):
Add €100,000-500,000+ for MDR compliance + notified body fees.

---

## 7. TIMELINE ESTIMATES

### Best Case (Wellness App, Experienced Team):
- Preparation: 2 months
- Referencing Process: 4 months
- **Total: 6 months**

### Realistic Case (Standard Health App):
- Preparation: 3-4 months
- HDS setup: 2-3 months
- Referencing Process: 6-9 months
- **Total: 12-15 months**

### Worst Case (Medical Device, Complex Integration):
- MDR compliance: 12-24 months
- HDS certification: 6-12 months
- Referencing: 6-12 months
- **Total: 18-36+ months**

---

## 8. PRACTICAL BARRIERS FOR STARTUPS

### 1. Complexity Overload
- 6 different questionnaires with ~100 criteria
- Multiple certifications required simultaneously
- Documentation largely in French only
- Fragmented information across multiple platforms

### 2. Cost Prohibitive
- Minimum €50,000+ for basic compliance
- HDS hosting significantly more expensive than standard cloud
- Legal/consulting costs high for navigating French health regulations

### 3. Timeline Risk
- 6-18 months before market access
- Regulatory changes can reset progress (V4 criteria updated June 2025)
- Commission decisions can be delayed

### 4. Technical Burden
- FHIR/CDA expertise required
- Pro Santé Connect integration mandatory
- Specific French health data standards (CI-SIS)

### 5. Market Access Limitations
- Only 36 apps currently referenced
- New simplified process only opened July 2023
- Competition for limited catalog spots

---

## 9. ALTERNATIVE STRATEGIES

### Option A: Partner with Referenced Solution
- Find existing referenced app to integrate with
- White-label or API partnership
- Bypass referencing process entirely

### Option B: B2B Through Healthcare Providers
- Sell to hospitals/clinics already connected to MES
- They handle compliance, you provide technology
- Faster market access

### Option C: Wellness Positioning (Avoid MES Initially)
- Stay outside health data scope
- Consumer wellness app without MES integration
- Build user base, then pursue MES later

### Option D: Geographic Pivot
- Start in markets with lighter regulation (UK, US wellness)
- Prove product-market fit first
- Return to France with resources for compliance

---

## 10. KEY CONTACTS & RESOURCES

### Platforms:
- **Convergence**: https://convergence.esante.gouv.fr/mon-espace-sante
- **Industriels Portal**: https://industriels.esante.gouv.fr
- **iSC Registration**: https://isconnect.esante.gouv.fr/enrollement/user/start
- **GNIUS (Innovation Guide)**: https://gnius.esante.gouv.fr

### Documentation:
- **CI-SIS Specifications**: https://esante.gouv.fr/interoperabilite/ci-sis/espace-publication
- **HDS Provider List**: https://esante.gouv.fr/offres-services/hds/liste-des-herbergeurs-certifies
- **PSC Documentation**: https://industriels.esante.gouv.fr/produits-et-services/pro-sante-connect

### Support:
- **CI-SIS Questions**: ci-sis@esante.gouv.fr
- **Industriels Support**: https://industriels.esante.gouv.fr/contactez-nous
- **Weekly PSC Exchange**: Fridays 15h-16h (Teams, subscribe via portal)

---

## 11. VERDICT FOR SOLO DEVELOPER / STARTUP

### Should You Pursue MES Integration?

**PROCEED IF:**
- You have €100,000+ budget and 12+ months runway
- Your core value proposition requires MES data access
- You have French healthcare domain expertise
- You're targeting B2B (clinics, hospitals) who will co-invest in compliance

**AVOID OR DELAY IF:**
- You're bootstrapped or pre-seed
- You can deliver value without MES integration
- You're testing product-market fit
- You don't have French regulatory expertise in-house

### Recommended Approach:
1. **Start as wellness app** (no MES, no HDS, faster to market)
2. **Validate product-market fit** in France or other markets
3. **Raise funding** with proven traction
4. **Then pursue MES integration** with resources for compliance

---

## 12. COMPARISON: MES vs. OTHER MARKETS

| Factor | France (MES) | US (Apple Health/FHIR) | UK (NHS App) |
|--------|--------------|------------------------|--------------|
| Market Size | 68M accounts | 300M+ potential | 66M population |
| Compliance Cost | €50-200K+ | €10-30K | €20-50K |
| Timeline | 6-18 months | 2-4 months | 3-6 months |
| Required Certs | HDS, PSC, PGSSI-S | HIPAA (if PHI) | DCB0129 |
| Complexity | HIGH | MEDIUM | MEDIUM |

**For solo developers**: US wellness market or UK NHS ecosystem may offer faster paths to market with lower regulatory burden.

---

## CONCLUSION

Mon Espace Santé represents a significant market opportunity (68M+ accounts) but comes with substantial barriers for startups:

1. **High compliance costs** (€50-200K+)
2. **Long timelines** (6-18 months)
3. **Complex multi-certification requirements** (HDS, PSC, CI-SIS, PGSSI-S, RGPD)
4. **French-specific standards** requiring specialized expertise

For most early-stage startups, the recommendation is to **validate product-market fit first** through alternative channels, then pursue MES integration once you have:
- Proven demand
- Sufficient funding (€100K+ compliance budget)
- Healthcare domain expertise
- 12-18 month runway for integration process

The regulatory complexity is navigable but requires significant resources that most solo developers or early-stage startups don't have.

---

## REFERENCES

1. https://esante.gouv.fr/produits-services/ci-sis
2. https://esante.gouv.fr/produits-services/hds  
3. https://esante.gouv.fr/produits-services/pro-sante-connect
4. https://esante.gouv.fr/produits-services/pgssi-s
5. https://industriels.esante.gouv.fr/produits-et-services/referencement-mon-espace-sante
6. https://industriels.esante.gouv.fr/produits-et-services/pro-sante-connect
7. https://gnius.esante.gouv.fr/fr/le-parcours-guide-mon-espace-sante
8. https://convergence.esante.gouv.fr/mon-espace-sante
9. https://esante.gouv.fr/interoperabilite/ci-sis/espace-publication
10. https://esante.gouv.fr/offres-services/hds/liste-des-herbergeurs-certifies
