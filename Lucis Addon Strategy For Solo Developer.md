# **Strategic Ecosystem Analysis: Opportunities for Third-Party Integrations and Value-Added Services within the European Preventative Health Stack**

## **1\. Executive Summary: The Strategic Imperative of Complementarity**

The European digital health landscape is currently witnessing a tectonic shift, characterized by the transition from reactive, symptom-based medicine to proactive, data-driven preventative care. This paradigm shift has been significantly accelerated by the recent capital injection into **Lucis**, a French startup that secured an **$8.5 million (€7.2 million)** Seed funding round in December 2025\.1 Led by General Catalyst—a venture capital firm explicitly championing a thesis of "Health Assurance"—and supported by Y Combinator, Lucis is positioning itself as the "Function Health of Europe," aiming to democratize access to comprehensive biomarker analysis and longevity protocols.3  
For independent developers, software entrepreneurs, and existing health tech entities, the emergence of a well-capitalized, dominant player like Lucis presents a classic strategic bifurcation: engage in direct competition or pursue a strategy of complementarity. The analysis detailed in this report overwhelmingly supports the latter. Attempting to replicate Lucis’s logistical infrastructure—a network of 400+ partner laboratories, phlebotomy logistics, and clinical review teams—requires capital expenditure and operational complexity that is prohibitive for new entrants without comparable venture backing. Conversely, the "addon" strategy—creating supplementary services that enhance the Lucis user experience—offers an asymmetric upside with significantly lower capital risk.  
This report validates the viability of building an "ecosystem of addons" by identifying structural gaps inherent in early-stage platforms. Specifically, Lucis, like its American counterpart Function Health, currently operates as a "walled garden".4 While it provides sophisticated dashboards, it likely restricts raw data portability to retain user attention. This creates a friction point for the platform's core demographic: the "biohacker" and the "quantified self" enthusiast—users who demand data interoperability with Apple Health, Oura, Garmin, and other telemetry streams.  
However, the execution of this strategy in the European market is fraught with unique complexities that do not exist in the United States. The regulatory moat created by the **Hébergement de Données de Santé (HDS)** certification requirements in France and the **Medical Device Regulation (MDR)** across the EU fundamentally alters the technical architecture required for such addons.7 A simple app that interprets blood test results risks being classified as a Class IIa medical device, triggering rigorous conformity assessments and clinical evaluation requirements that could bankrupt an unprepared venture.9  
Consequently, this report outlines a roadmap for a "Grey API" integration strategy. In the absence of official public APIs from Lucis 1, developers must leverage user-authorized data extraction technologies, specifically advanced Optical Character Recognition (OCR) tools like **Surya** and **PaddleOCR**, to parse PDF medical reports.11 By processing this data locally on the user's device ("Local-First Architecture"), developers can bypass the prohibitive costs of HDS-certified cloud hosting while simultaneously exempting themselves from the most onerous data residency requirements.13  
The following sections provide an exhaustive analysis of the market opportunity, the technical implementation pathways, the regulatory constraints, and the financial models necessary to build a sustainable, compliant, and valuable partner ecosystem around Lucis.

## ---

**2\. Market Dynamics: The Lucis Platform and the "Walled Garden" Theory**

To successfully build upon the Lucis platform, one must first deconstruct its business model, its target demographic, and the inevitable limitations of its early-stage product architecture. Understanding what Lucis is incentivized *not* to build is the key to identifying sustainable addon opportunities.

### **2.1 The Value Proposition: Vertical Integration of Diagnostics**

Lucis was founded by Maxime Berthelot, Baptiste Debever, and Max Guerois to solve a specific inefficiency in the European healthcare model: the difficulty of obtaining preventative diagnostics.3 In France, as in much of Europe, the healthcare system is highly efficient at treating acute illness but friction-heavy regarding elective, preventative screening. A patient typically cannot walk into a lab and request a 180-biomarker panel without a prescription, and obtaining such a prescription for "curiosity" or "optimization" is difficult within the public insurance framework.  
Lucis bypasses this by operating as a vertical integrator.

* **Logistics Layer:** It aggregates demand and routes it to a network of 400+ partner laboratories (likely major chains like Synlab, Biogroup, or Cerba).1  
* **Clinical Layer:** It employs a medical team to review results, satisfying the legal requirement for medical oversight.3  
* **Digital Layer:** It presents data not as a static PDF but as a dynamic dashboard with "Action Plans" focused on nutrition, sleep, and movement.16

The "Action Plan" is the core value retention mechanism. By telling the user *what to do* (e.g., "Take Magnesium Glycinate"), Lucis shifts from a lab utility to a lifestyle subscription.

### **2.2 The "Walled Garden" Architecture**

Platforms in the "Health Assurance" sector (a term coined by General Catalyst 5) tend to prioritize data integrity and user retention over interoperability during their growth phase.

* **Data Siloing:** Evidence from the US market suggests that platforms like **Function Health** actively block the release of data to third-party aggregators or patient portals (like MyQuest) to force users to engage with their proprietary app.6 Users report frustration that their expensive data is "trapped" in a web interface, unable to be exported to Excel or synced with Apple Health for correlation with sleep data.  
* **The API Void:** A thorough review of Lucis's public documentation reveals no evidence of a developer API or OAuth2 provider program.1 This is typical for Seed/Series A health startups, which must prioritize HIPAA/GDPR compliance and security over open ecosystem development.  
* **The Opportunity:** This "closed" architecture creates a massive, underserved market for **Data Liberation Middleware**. The "power users" of Lucis—likely crossing over with the customer bases of Oura, Whoop, and Levels—will inevitably demand that their blood data live alongside their sleep and glucose data. Lucis cannot build integrations for every niche wearable or app; they must focus on the mass market. This leaves the "long tail" of integrations open to third-party developers.

### **2.3 The "Function Health of Europe" Narrative**

Lucis explicitly markets itself as the "Function Health of Europe".4 This comparison is instructive for predicting user behavior.

* **User Demographics:** Function Health's users are highly vocal, technically literate, and demanding. They congregate on platforms like Reddit to share "hacky" scripts for data export and complain about generic clinical notes.17  
* **Product Gaps:** Function Health users frequently cite the "cookie-cutter" nature of recommendations as a weakness. An AI that suggests "eat more spinach" for low iron is useful for a novice but redundant for a biohacker.  
* **Implication for Addons:** There is immediate demand for "Second Opinion" tools—software that takes the raw data from Lucis (liberated from the PDF) and applies different, perhaps more aggressive or niche, interpretative frameworks (e.g., functional medicine ranges vs. standard clinical ranges).

## ---

**3\. Technical Feasibility: Engineering the "Grey API"**

In the absence of a sanctioned public API, the integration strategy for a Lucis addon must rely on **User-Authorized Data Extraction**. The primary vector for this is the medical report document (PDF), which users are legally entitled to download under GDPR data portability rights.19

### **3.1 The PDF Parsing Pipeline: Beyond Standard OCR**

Medical reports are among the most difficult documents to parse programmatically. They are dense with tabular data, use irregular column layouts, mix fonts (headers vs. data), and often contain visual noise (logos, signatures). Standard text extraction libraries (like pypdf) often return a "soup" of text where the relationship between a biomarker (e.g., "Ferritin") and its value (e.g., "30 ng/mL") is lost.

#### **3.1.1 The Superiority of Vision-Based OCR**

To build a reliable "addon," the developer must employ Optical Character Recognition (OCR) engines that support **Document Layout Analysis (DLA)**. The research highlights distinct tiers of technology available for this purpose:

* **Surya OCR:** This is the current state-of-the-art for open-source document understanding.11  
  * *Architecture:* Surya uses a SegFormer-based architecture for layout analysis and a Vision Encoder-Decoder for text recognition. Unlike Tesseract, which reads line-by-line, Surya understands the *concept* of a table.  
  * *Performance:* Benchmarks indicate Surya achieves \~97% accuracy on complex invoice-like documents (similar to lab reports), significantly outperforming Tesseract's \~87%.12 It excels at row/column detection, ensuring that a result is correctly associated with its reference range.  
  * *Resource Intensity:* The trade-off is computational cost. Surya is GPU-dependent. On a standard CPU, processing a single page can take over two minutes; on an Nvidia T4 GPU, it takes seconds.12 This dictates the hosting architecture (discussed in Section 6).  
* **PaddleOCR:** A lightweight alternative developed by Baidu.20 It supports 80+ languages and is robust against rotated text. While excellent for general text, its table recognition capabilities are slightly less specialized for the dense, grid-like structure of Western medical reports compared to Surya's DLA models.  
* **Large Language Models (Vision-LLMs):** Models like GPT-4o or open-source variants (LLaVA, Qwen-VL) offer the highest accuracy by "reading" the image like a human.  
  * *Pros:* They can infer context (e.g., understanding that "Hgb" means "Hemoglobin").  
  * *Cons:* **Privacy and Cost.** Sending a user's full medical report to an external API (OpenAI) introduces significant GDPR and HDS compliance liabilities. For an indie developer, this creates a "toxic asset" of unencrypted health data flowing through third-party servers.

### **3.2 Data Normalization: The FHIR Standard**

Extracting the text is only step one. To make the data useful (e.g., for graphing trends), it must be normalized.

* **The Problem:** One lab might report "Vitamin D," another "25-Hydroxy Vitamin D," and a third "Vit D3."  
* **The Solution:** The addon must map these diverse strings to a standardized ontology. The industry standard is **LOINC** (Logical Observation Identifiers Names and Codes) wrapped in **FHIR** (Fast Healthcare Interoperability Resources) resources.21  
* **Implementation:** An addon should locally store a mapping table. When the OCR detects "Ferritin," it tags the data with LOINC code 2276-4. This ensures that if the user later imports data from a different source (e.g., a hospital visit), the two "Ferritin" values are recognized as the same biomarker.

### **3.3 Integration Vectors: Apple Health & Google Connect**

The ultimate "feature" for a Lucis addon is not just displaying data, but syncing it to the user's operating system health repository.

* **Apple HealthKit:** Allows apps to write blood test results (e.g., HKQuantityTypeIdentifierBloodGlucose) directly to the user's Health app.  
* **Strategic Advantage:** Once the data is in Apple Health, the user can use *any* other app to visualize it. The addon becomes the essential "bridge" or "adapter" that makes Lucis compatible with the rest of the ecosystem. This utility is high-value and low-liability.

## ---

**4\. The Regulatory Landscape: Navigating the French Compliance Moat**

Operating in the French health tech market requires navigating a "regulatory minefield" that is significantly more rigorous than the US market. The two primary pillars are **HDS (Health Data Hosting)** and **MDR (Medical Device Regulation)**.

### **4.1 Hébergement de Données de Santé (HDS)**

France treats health data as a sovereign asset requiring specific protection measures. Article L.1111-8 of the Public Health Code mandates that *any* person or entity hosting personal health data collected during prevention, diagnosis, or care must use a certified HDS provider.7

#### **4.1.1 Scope and Applicability**

This requirement applies not just to hospitals but to **any startup** or software publisher managing identifiable patient data.

* *Strict Liability:* If an app uploads a user's PDF report to a cloud server for OCR processing, that server *must* be HDS certified. Using a standard AWS S3 bucket or a DigitalOcean droplet is illegal and carries criminal penalties.23  
* *The "Local-Only" Exemption:* Crucially, CNIL (the French data protection authority) and HDS regulations generally apply to the *hosting* of data on behalf of others. If an app is architected as "Local-First"—meaning the data is processed and stored *exclusively* on the user's smartphone and never touches a central server—it may be exempt from HDS requirements because the user remains the sole custodian of their data.13

#### **4.1.2 The Cost of Compliance**

For an addon that requires cloud features (e.g., web access, cross-device sync), the developer must use HDS-certified infrastructure.

* **Scalingo:** A French Platform-as-a-Service (PaaS) that offers a compliant, HDS-certified environment. It is popular among French startups because it abstracts the complexity of physical security and ISO 27001 compliance.24 However, pricing for HDS-compliant tiers is significantly higher than standard hosting (often starting at \~€150-200/month minimum for the necessary support and contract structure).25  
* **OVHcloud:** Offers "Healthcare" private cloud solutions, but the entry price is often in the hundreds or thousands of euros per month, targeting enterprise healthcare rather than indie developers.27

**Strategic Implication:** For a bootstrapper or solo developer, the cost of HDS hosting effectively kills the viability of a cloud-based app. The only economically viable path is a **mobile-only, on-device app** where the processing (OCR) happens locally on the phone's processor.

### **4.2 Medical Device Regulation (MDR)**

The EU MDR (Regulation 2017/745) poses the single greatest operational risk to a "value-added" service.

#### **4.2.1 Rule 11 and Classification**

MDR Rule 11 (Annex VIII) specifically targets software. It states that software intended to provide information which is used to take decisions with diagnosis or therapeutic purposes is classified as **Class IIa** (moderate risk) or higher.9

* *The Threshold:* If an app says, "Your cholesterol is high, take Omega-3s," it is influencing a therapeutic decision. It is a medical device.  
* *The Consequence:* Class IIa devices require a Notified Body audit, a Quality Management System (ISO 13485), and clinical evaluation. This costs tens of thousands of euros and takes 12-18 months.8

#### **4.2.2 The "Wellness" Exemption**

Software can remain unregulated (or Class I, low risk) if it is strictly for "lifestyle and well-being" purposes and does *not* claim to diagnose or treat disease.28

* *Example:* An app that tracks trends ("Your Vitamin D is trending up") is likely wellness. An app that flags risk ("You are at risk of osteoporosis") is a device.  
* *Legal Strategy:* To remain a "wellness addon," the software must function as a "digital file cabinet" or "calculator." It can visualize data but must avoid interpretative algorithms that mimic a doctor's judgment. The "Intended Purpose" statement in the app's documentation is the legal shield.29

### **4.3 GDPR and Data Sovereignty**

Beyond HDS and MDR, the General Data Protection Regulation (GDPR) imposes strict rules on health data (Article 9).

* **Explicit Consent:** Users must provide explicit, granular consent for their data to be processed.30  
* **Data Portability:** Article 20 gives users the right to move their data. Lucis creates friction here; an addon removes it. By positioning the addon as a tool for "exercising GDPR rights to data portability," the developer aligns themselves with EU law, making it politically difficult for Lucis to block the tool.19

## ---

**5\. Strategic Opportunities: The "Addon" Taxonomy**

Based on the intersection of user needs (data liberation) and regulatory constraints (MDR/HDS), three distinct product categories emerge.

### **5.1 Opportunity A: The "Data Bridge" (High Viability / Low Risk)**

* **Concept:** A mobile utility app that imports Lucis PDF reports, uses on-device OCR to extract the data, and syncs it to Apple Health / Google Fit.  
* **Value Proposition:** "Own your data. Sync your Lucis results with your Oura sleep data in Apple Health." This solves the \#1 complaint of "biohackers" who hate data silos.  
* **Technical Stack:** React Native or Swift. On-device OCR via Apple's Vision Framework (free, fast, private) or a quantized version of Surya (if table structure requires it). No backend server.  
* **Regulatory Profile:**  
  * *MDR:* Non-device. It is a data format converter.  
  * *HDS:* Exempt. Data never leaves the device.  
* **Business Model:** One-time purchase (€5-10) or annual subscription (€10/year) for "Pro" export features (CSV/JSON generation).

### **5.2 Opportunity B: The "Contextual Dashboard" (Medium Viability / Medium Risk)**

* **Concept:** A visualization tool that overlays blood biomarkers with wearable data to show correlations. "See how your Marathon training affected your Cortisol."  
* **Value Proposition:** Lucis has the blood data; Oura has the sleep data. Neither has the full picture. This addon bridges the gap.  
* **Technical Stack:** Likely requires a backend to store historical data if the local storage is insufficient, but ideally keeps everything local to avoid HDS costs.  
* **Regulatory Profile:**  
  * *MDR:* Borderline. If it makes causal claims ("Running raised your cortisol"), it risks being a device. If it just plots two lines on a graph, it is a visualization tool.  
  * *HDS:* Exempt if local-only.  
* **Business Model:** SaaS Subscription (€5/month).

### **5.3 Opportunity C: The "Clinical Interpreter" (Low Viability / High Risk)**

* **Concept:** An AI "Second Opinion" that reads the Lucis report and gives functional medicine advice or "root cause" analysis.  
* **Value Proposition:** "Lucis said you're 'normal', but optimal Thyroid levels are actually X. Take Selenium."  
* **Regulatory Profile:**  
  * *MDR:* **Class IIa Medical Device.** It is providing therapeutic advice. Explicitly regulated under Rule 11\.  
  * *Liability:* High risk of being shut down by regulators or sued if advice is wrong.  
* **Recommendation:** **Avoid.** This requires a clinical board, insurance, and significant capital.

## ---

**6\. Financial Analysis and Implementation Roadmap**

### **6.1 Cost Structure Analysis**

The choice of hosting determines the burn rate. The following table contrasts the cost of a compliant backend (Scalingo) versus a standard "Indie Hacker" setup (DigitalOcean), highlighting why the **Local-First** approach is critical for bootstrapping.

| Cost Category | HDS Compliant (Scalingo) | Standard Cloud (DigitalOcean) | Local-First (On-Device) |
| :---- | :---- | :---- | :---- |
| **Compute** | €20 \- €50 / month (Container) | $4 \- $10 / month (Droplet) | **€0** (User Device) |
| **Database** | €30 \- €50 / month (Managed) | $15 / month (Managed) | **€0** (SQLite/Realm) |
| **Compliance Overhead** | \~€100+ / month (Implicit) | **Illegal for Health Data** | **Exempt** |
| **OCR Processing** | API Costs (AWS Textract) or GPU | GPU Droplet ($1.50/hr) | **€0** (Apple Vision) |
| **Total Monthly Burn** | **\~€200+** | **\~$30+ (Non-Compliant)** | **\~€99/year (Apple Dev Fee)** |

**Insight:** The HDS requirement creates a "floor" of roughly €200/month for even a dormant app if it uses a server. A local-first app costs nothing to run until it has users.

### **6.2 Recommended Roadmap**

**Phase 1: The "Trojan Horse" (Months 1-3)**

* **Objective:** Build the *Data Bridge* (Opportunity A).  
* **Action:** Develop a simple iOS/Android app that accepts a Lucis PDF, runs on-device OCR to extract the 10 most common biomarkers (Cholesterol, Ferritin, Vitamin D), and writes them to Apple Health.  
* **Marketing:** Post in biohacker forums and Reddit communities where Lucis users congregate. Position it as a "Privacy-First Exporter."  
* **Goal:** Acquire 500-1,000 users. Validate that people want the data out of Lucis.

**Phase 2: The "Enrichment" Layer (Months 4-6)**

* **Objective:** Add visualization (Opportunity B).  
* **Action:** Allow users to connect Oura/Garmin (read-only) and plot their steps/sleep against their blood data within the app.  
* **Monetization:** Introduce a "Pro" tier for advanced correlations.  
* **Partnership Pitch:** Once you have a user base, approach Lucis. The pitch is: "I have 1,000 of your power users. They love my app because it connects your data to their daily life. Let's make this an official integration."

**Phase 3: The "Ecosystem" (Year 1+)**

* **Objective:** Expand to other labs (Neko, Biogroup).  
* **Action:** Make the parser agnostic. Allow any French lab report to be imported. Become the "Wallet" for European health data.

## ---

**7\. Conclusion: The "Switzerland" Strategy**

The user's intuition to follow Lucis's success through partnership is sound, but the execution requires surgical precision to avoid regulatory landmines. The "addon" opportunity lies not in competing on diagnostics (where Lucis has an $8.5M lead) but in competing on **interoperability**.  
Lucis, by its nature as a platform, will want to keep data *in*. Users, by their nature, want data *everywhere*. The addon that bridges this gap—extracting data from the Lucis "walled garden" and piping it into the broader ecosystem of Apple Health and wearables—provides immense value.  
Final Recommendation:  
Do not build a medical advisor. Build a Data Bridge.

1. **Go Local:** Avoid HDS costs and liabilities by keeping all data on the user's phone.  
2. **Go Niche:** Target the specific frustration of "data portability" that plagues early adopters of health platforms.  
3. **Go Agnostic:** Start with Lucis, but architect the OCR engine to handle PDFs from *any* French lab (Biogroup, Cerba).

By becoming the neutral "Switzerland" of health data—the tool that makes incompatible systems talk to each other—you build a strategic asset that is valuable to the user, defensible against regulation, and ultimately an attractive acquisition target for the platform itself.

### ---

**Appendix: Key Risk Matrix**

| Risk Factor | Probability | Impact | Mitigation Strategy |
| :---- | :---- | :---- | :---- |
| **MDR Classification (Class IIa)** | High | Critical | Strictly avoid diagnostic claims. Use "Informational Use Only" labeling. Do not interpret results. |
| **HDS Non-Compliance** | Medium | Critical | Use **Local-First** architecture. If cloud is needed, use Scalingo (not AWS/DO without config). |
| **Platform "Sherlocking"** | High | Moderate | Lucis may build export features eventually. Counter by integrating *multiple* data sources (e.g., Lucis \+ Neko) which Lucis cannot do. |
| **OCR Technical Failure** | Medium | Moderate | Medical PDFs are messy. Use **Surya OCR** or Apple Vision Framework rather than simple text scraping. |

#### **Sources des citations**

1. French startup Lucis raises $8.5M to expand preventive healthcare ..., consulté le décembre 25, 2025, [https://www.vestbee.com/insights/articles/lucis-raises-8-5-m](https://www.vestbee.com/insights/articles/lucis-raises-8-5-m)  
2. Lucis Raises $8.5M Seed Round To Expand Preventive Healthcare Across Europe, consulté le décembre 25, 2025, [https://startuprise.co.uk/lucis-raises-8-5m-seed-round-to-expand-preventive-healthcare-across-europe/](https://startuprise.co.uk/lucis-raises-8-5m-seed-round-to-expand-preventive-healthcare-across-europe/)  
3. Lucis Raises $8.5M for Preventive Health Testing in Europe \- Startup Researcher, consulté le décembre 25, 2025, [https://www.startupresearcher.com/news/lucis-raises-usd8-5-million-to-expand-preventive-health-testing-in-europe](https://www.startupresearcher.com/news/lucis-raises-usd8-5-million-to-expand-preventive-health-testing-in-europe)  
4. Lucis Lands $8.5M to Build Europe's Personal Health OS | Fitt Insider, consulté le décembre 25, 2025, [https://insider.fitt.co/lucis-lands-8-5m-to-build-europes-personal-health-os/](https://insider.fitt.co/lucis-lands-8-5m-to-build-europes-personal-health-os/)  
5. Seeding the Future with Lucis \- General Catalyst, consulté le décembre 25, 2025, [https://www.generalcatalyst.com/stories/seeding-the-future-with-lucis](https://www.generalcatalyst.com/stories/seeding-the-future-with-lucis)  
6. Buyer Beware: Function Health is a predatory business and does not allow you to use your data as you wish. : r/Function\_Health \- Reddit, consulté le décembre 25, 2025, [https://www.reddit.com/r/Function\_Health/comments/1pl2aum/buyer\_beware\_function\_health\_is\_a\_predatory/](https://www.reddit.com/r/Function_Health/comments/1pl2aum/buyer_beware_function_health_is_a_predatory/)  
7. HDS Certification | Exoscale, consulté le décembre 25, 2025, [https://www.exoscale.com/compliance/hds/](https://www.exoscale.com/compliance/hds/)  
8. Guide: Is your software a medical device?, consulté le décembre 25, 2025, [https://quickbirdmedical.com/en/medizinprodukt-app-software-mdr/](https://quickbirdmedical.com/en/medizinprodukt-app-software-mdr/)  
9. MDR Classification Rule 11: The classification nightmare? \- Johner Institute, consulté le décembre 25, 2025, [https://blog.johner-institute.com/regulatory-affairs/mdr-rule-11/](https://blog.johner-institute.com/regulatory-affairs/mdr-rule-11/)  
10. Classification of software medical devices: MDR Guideline, consulté le décembre 25, 2025, [https://quickbirdmedical.com/en/medical-device-class-software-app-mdr/](https://quickbirdmedical.com/en/medical-device-class-software-app-mdr/)  
11. datalab-to/surya: OCR, layout analysis, reading order, table recognition in 90+ languages \- GitHub, consulté le décembre 25, 2025, [https://github.com/datalab-to/surya](https://github.com/datalab-to/surya)  
12. Comparing PyTesseract, PaddleOCR, and Surya OCR: Performance on Invoices \- Researchify.io | Solving research problems with the power of AI, consulté le décembre 25, 2025, [https://researchify.io/blog/comparing-pytesseract-paddleocr-and-surya-ocr-performance-on-invoices](https://researchify.io/blog/comparing-pytesseract-paddleocr-and-surya-ocr-performance-on-invoices)  
13. Recommandation relative aux applications mobiles \- CNIL, consulté le décembre 25, 2025, [https://www.cnil.fr/sites/cnil/files/2024-09/recommandation-applications-mobiles.pdf](https://www.cnil.fr/sites/cnil/files/2024-09/recommandation-applications-mobiles.pdf)  
14. HDS Certification Explained: Scalingo's Guide to Hosting Health Data in France, consulté le décembre 25, 2025, [https://scalingo.com/blog/health-data-hosting](https://scalingo.com/blog/health-data-hosting)  
15. The company \- Biogroup Investors, consulté le décembre 25, 2025, [https://invest.biogroup.fr/the-company/](https://invest.biogroup.fr/the-company/)  
16. French preventive healthcare startup Lucis raises €7.2 million from General Catalyst, Y Combinator, others, consulté le décembre 25, 2025, [https://www.eu-startups.com/2025/12/french-preventive-healthcare-startup-lucis-raises-e7-2-million-from-general-catalyst-y-combinator-others/](https://www.eu-startups.com/2025/12/french-preventive-healthcare-startup-lucis-raises-e7-2-million-from-general-catalyst-y-combinator-others/)  
17. Function Health \- My One Year Review : r/Function\_Health \- Reddit, consulté le décembre 25, 2025, [https://www.reddit.com/r/Function\_Health/comments/1ok0gtb/function\_health\_my\_one\_year\_review/](https://www.reddit.com/r/Function_Health/comments/1ok0gtb/function_health_my_one_year_review/)  
18. Function health \- thoughts? : r/PeterAttia \- Reddit, consulté le décembre 25, 2025, [https://www.reddit.com/r/PeterAttia/comments/1c3ue3z/function\_health\_thoughts/](https://www.reddit.com/r/PeterAttia/comments/1c3ue3z/function_health_thoughts/)  
19. 9 key things about GDPR that eHealth App developers should know \- Chino.io, consulté le décembre 25, 2025, [https://www.chino.io/post/9-key-things-about-gdpr-that-health-app-developers-need-to-know](https://www.chino.io/post/9-key-things-about-gdpr-that-health-app-developers-need-to-know)  
20. PaddlePaddle/PaddleOCR: Turn any PDF or image document into structured data for your AI. A powerful, lightweight OCR toolkit that bridges the gap between images/PDFs and LLMs. Supports 100+ languages. \- GitHub, consulté le décembre 25, 2025, [https://github.com/PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)  
21. How to Access Our APIs & Data | Anthem, consulté le décembre 25, 2025, [https://www.anthem.com/developers](https://www.anthem.com/developers)  
22. HDS & ASIP Santé \- Compliance \- Google Cloud, consulté le décembre 25, 2025, [https://cloud.google.com/security/compliance/hds](https://cloud.google.com/security/compliance/hds)  
23. Certification HDS « Hébergement de Données de Santé » \- \- IRD Data, consulté le décembre 25, 2025, [https://data.ird.fr/certification-hds-hebergement-de-donnees-de-sante/](https://data.ird.fr/certification-hds-hebergement-de-donnees-de-sante/)  
24. Clever-cloud \- Pricing, Features, and Details in 2025 \- SoftwareSuggest, consulté le décembre 25, 2025, [https://www.softwaresuggest.com/clever-cloud](https://www.softwaresuggest.com/clever-cloud)  
25. Pricing on the PaaS Scalingo \- Scalingo, consulté le décembre 25, 2025, [https://scalingo.com/pricing](https://scalingo.com/pricing)  
26. Scalingo's Startup Program, consulté le décembre 25, 2025, [https://scalingo.com/startup-program](https://scalingo.com/startup-program)  
27. Our VMware prices | OVHcloud Worldwide, consulté le décembre 25, 2025, [https://www.ovhcloud.com/en/hosted-private-cloud/vmware/prices/](https://www.ovhcloud.com/en/hosted-private-cloud/vmware/prices/)  
28. EU MDR and IVDR: Classifying Medical Device Software (MDSW) \- NAMSA, consulté le décembre 25, 2025, [https://namsa.com/resources/blog/eu-mdr-and-ivdr-classifying-medical-device-software-mdsw/](https://namsa.com/resources/blog/eu-mdr-and-ivdr-classifying-medical-device-software-mdsw/)  
29. Medical device software \- Läkemedelsverket, consulté le décembre 25, 2025, [https://www.lakemedelsverket.se/en/medical-devices/which-rules-apply-to-me/medical-device-software](https://www.lakemedelsverket.se/en/medical-devices/which-rules-apply-to-me/medical-device-software)  
30. Quelles formalités pour les traitements de données de santé ? | CNIL, consulté le décembre 25, 2025, [https://www.cnil.fr/fr/quelles-formalites-pour-les-traitements-de-donnees-de-sante](https://www.cnil.fr/fr/quelles-formalites-pour-les-traitements-de-donnees-de-sante)