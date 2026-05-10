/**
 * Medical Dictionaries for Entity Recognition
 * 
 * Comprehensive drug and disease/symptom dictionaries for dictionary-based NER.
 * Sources: Common medications (DrugBank), diseases/symptoms (MedDRA, ICD-10 common terms).
 */

// ============ DRUG DICTIONARY ============
// Organized by therapeutic class for maintainability
export const DRUG_NAMES: string[] = [
  // Analgesics & Anti-inflammatories (NSAIDs)
  "aspirin", "ibuprofen", "naproxen", "acetaminophen", "celecoxib", "diclofenac", "meloxicam",
  "indomethacin", "ketorolac", "piroxicam",
  
  // Opioid Analgesics
  "tramadol", "oxycodone", "hydrocodone", "morphine", "codeine", "fentanyl", "methadone",
  "buprenorphine", "naltrexone", "naloxone",
  
  // Cardiovascular - Antihypertensives
  "lisinopril", "amlodipine", "losartan", "valsartan", "ramipril", "enalapril", "benazepril",
  "metoprolol", "atenolol", "carvedilol", "propranolol", "nifedipine", "diltiazem", "verapamil",
  "hydrochlorothiazide", "chlorthalidone", "furosemide", "spironolactone", "clonidine",
  
  // Cardiovascular - Cholesterol
  "atorvastatin", "simvastatin", "rosuvastatin", "pravastatin", "ezetimibe", "fenofibrate",
  
  // Cardiovascular - Anticoagulants & Antiplatelets
  "warfarin", "clopidogrel", "rivaroxaban", "apixaban", "ticagrelor", "enoxaparin", "heparin",
  
  // Cardiovascular - Other
  "digoxin", "amiodarone", "nitroglycerin",
  
  // Diabetes Medications
  "metformin", "insulin", "glipizide", "glimepiride", "pioglitazone", "sitagliptin",
  "empagliflozin", "dapagliflozin", "canagliflozin", "liraglutide", "semaglutide",
  "dulaglutide", "saxagliptin", "linagliptin", "acarbose",
  
  // Gastrointestinal
  "omeprazole", "pantoprazole", "lansoprazole", "esomeprazole", "ranitidine", "famotidine",
  "sucralfate", "metoclopramide", "ondansetron", "loperamide", "docusate", "bismuth subsalicylate",
  "mesalamine",
  
  // Antibiotics
  "amoxicillin", "azithromycin", "ciprofloxacin", "levofloxacin", "doxycycline", "minocycline",
  "cephalexin", "clindamycin", "trimethoprim", "nitrofurantoin", "erythromycin", "penicillin",
  "mupirocin", "sulfasalazine", "metronidazole",
  
  // Antifungals
  "fluconazole", "clotrimazole", "nystatin", "terbinafine",
  
  // Antivirals
  "acyclovir", "valacyclovir", "oseltamivir", "tamiflu",
  
  // Respiratory
  "albuterol", "salbutamol", "montelukast", "fluticasone", "budesonide", "tiotropium",
  "beclomethasone", "ipratropium", "dextromethorphan", "benzonatate", "theophylline",
  
  // Allergy & Antihistamines
  "loratadine", "cetirizine", "fexofenadine", "diphenhydramine", "hydroxyzine",
  "levocetirizine", "meclizine",
  
  // Antidepressants
  "sertraline", "fluoxetine", "escitalopram", "citalopram", "paroxetine",
  "venlafaxine", "duloxetine", "bupropion", "mirtazapine", "trazodone",
  "amitriptyline", "nortriptyline", "desvenlafaxine",
  
  // Anxiolytics & Sedatives
  "alprazolam", "clonazepam", "diazepam", "lorazepam", "buspirone", "zolpidem", "melatonin",
  
  // Antipsychotics
  "quetiapine", "olanzapine", "risperidone", "aripiprazole", "clozapine", "haloperidol",
  "ziprasidone",
  
  // Anticonvulsants / Mood Stabilizers
  "gabapentin", "pregabalin", "topiramate", "lamotrigine", "carbamazepine", "phenytoin",
  "levetiracetam", "divalproex", "lithium", "valproic acid",
  
  // ADHD Medications
  "methylphenidate", "lisdexamfetamine", "amphetamine", "atomoxetine",
  
  // Muscle Relaxants
  "cyclobenzaprine", "baclofen", "methocarbamol", "tizanidine",
  
  // Corticosteroids
  "prednisone", "prednisolone", "hydrocortisone", "dexamethasone", "methylprednisolone",
  "clobetasol",
  
  // Immunosuppressants / Biologics
  "methotrexate", "azathioprine", "hydroxychloroquine", "adalimumab", "etanercept",
  "infliximab", "cyclosporine",
  
  // Prostate
  "tamsulosin", "finasteride", "dutasteride",
  
  // Thyroid
  "levothyroxine", "methimazole", "propylthiouracil",
  
  // Anti-gout
  "allopurinol", "colchicine", "febuxostat",
  
  // Osteoporosis
  "alendronate", "risedronate", "teriparatide", "denosumab",
  
  // Parkinsons
  "levodopa", "carbidopa", "pramipexole", "ropinirole",
  
  // Alzheimers
  "donepezil", "memantine", "rivastigmine", "galantamine",
  
  // Dermatology
  "isotretinoin", "accutane",
  
  // Other
  "sildenafil", "tadalafil", "oxybutynin", "mirabegron", "desmopressin",
  "ferrous sulfate", "prazosin", "brimonidine", "latanoprost", "timolol",
];

// ============ DISEASE / SYMPTOM DICTIONARY ============
export const DISEASE_NAMES: string[] = [
  // Pain
  "headache", "migraine", "back pain", "chronic pain", "chest pain", "joint pain",
  "nerve pain", "muscle pain", "neck pain", "abdominal pain", "stomach pain",
  "menstrual cramps", "face pain", "knee pain",
  
  // Cardiovascular
  "hypertension", "high blood pressure", "heart failure", "heart attack", "stroke",
  "atrial fibrillation", "arrhythmia", "heart palpitations", "angina",
  "blood clots", "deep vein thrombosis", "pulmonary embolism",
  "coronary artery disease", "peripheral artery disease",
  
  // Diabetes
  "diabetes", "type 1 diabetes", "type 2 diabetes", "diabetes insipidus",
  "hypoglycemia", "hyperglycemia", "diabetic neuropathy",
  
  // Cholesterol
  "high cholesterol", "cholesterol", "hyperlipidemia",
  
  // Respiratory
  "asthma", "COPD", "bronchitis", "pneumonia", "croup", "wheezing",
  "shortness of breath", "cough",
  
  // Gastrointestinal
  "acid reflux", "GERD", "heartburn", "nausea", "vomiting", "diarrhea",
  "constipation", "stomach ulcer", "gastritis", "Crohn's disease",
  "ulcerative colitis", "IBS", "irritable bowel syndrome", "gastroparesis",
  "food poisoning", "Barrett's esophagus",
  
  // Mental Health
  "depression", "anxiety", "panic attacks", "bipolar disorder", "schizophrenia",
  "PTSD", "OCD", "ADHD", "insomnia", "sleep disorder",
  
  // Infections
  "UTI", "urinary tract infection", "sinus infection", "sinusitis",
  "skin infection", "tooth infection", "bladder infection", "yeast infection",
  "conjunctivitis", "pink eye", "strep throat", "Lyme disease", "MRSA",
  "herpes", "cold sores",
  
  // Allergies & Immune
  "allergies", "hay fever", "hives", "rash", "eczema", "dermatitis",
  "contact dermatitis", "poison ivy", "anaphylaxis",
  
  // Autoimmune
  "rheumatoid arthritis", "lupus", "multiple sclerosis", "psoriasis",
  "Raynaud's disease",
  
  // Musculoskeletal
  "arthritis", "osteoarthritis", "osteoporosis", "gout", "fibromyalgia",
  "muscle spasms", "back spasms", "spasticity",
  
  // Neurological
  "epilepsy", "seizures", "Parkinson's", "Alzheimer's", "dementia",
  "trigeminal neuralgia", "neuropathy", "vertigo", "tremors",
  
  // Kidney / Urinary
  "kidney disease", "edema", "overactive bladder", "enlarged prostate",
  
  // Endocrine
  "thyroid", "hypothyroidism", "hyperthyroidism",
  
  // Cancer
  "cancer", "breast cancer", "colon cancer",
  
  // Eye
  "glaucoma", "cataract",
  
  // Blood
  "anemia", "iron deficiency",
  
  // Skin Specific
  "acne", "hair loss",
  
  // Side Effects (commonly mentioned as conditions)
  "dizziness", "drowsiness", "fatigue", "weight gain", "weight loss",
  "dry mouth", "blurry vision", "stomach upset", "insomnia",
  "muscle cramps", "swelling", "bruising", "brain fog",
  "photosensitivity", "hot flashes", "liver damage",
  "GI bleeding", "stomach bleeding",
];

// ============ ENTITY MATCHING FUNCTIONS ============

export interface DetectedEntity {
  id: number;
  text: string;
  type: "drug" | "disease";
  startIndex: number;
  endIndex: number;
  confidence: number;
}

/**
 * Extract drug and disease entities from text using dictionary matching.
 * Uses word boundary matching and case-insensitive comparison.
 * Handles multi-word entities and returns position info.
 */
export function extractEntities(text: string): DetectedEntity[] {
  const entities: DetectedEntity[] = [];
  let idCounter = 1;
  const textLower = text.toLowerCase();

  // Sort dictionaries by length (longest first) to prioritize multi-word matches
  const sortedDrugs = [...DRUG_NAMES].sort((a, b) => b.length - a.length);
  const sortedDiseases = [...DISEASE_NAMES].sort((a, b) => b.length - a.length);

  // Track matched ranges to prevent overlapping
  const matchedRanges: Array<[number, number]> = [];

  const isOverlapping = (start: number, end: number): boolean => {
    return matchedRanges.some(([s, e]) =>
      (start >= s && start < e) || (end > s && end <= e) || (start <= s && end >= e)
    );
  };

  // Match drugs
  for (const drug of sortedDrugs) {
    const escapedDrug = drug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedDrug}\\b`, 'gi');
    let match;

    while ((match = regex.exec(textLower)) !== null) {
      const startIdx = match.index;
      const endIdx = startIdx + match[0].length;

      if (!isOverlapping(startIdx, endIdx)) {
        // Get original text casing
        const originalText = text.substring(startIdx, endIdx);
        entities.push({
          id: idCounter++,
          text: originalText,
          type: "drug",
          startIndex: startIdx,
          endIndex: endIdx,
          confidence: 0.95, // Dictionary match = high confidence
        });
        matchedRanges.push([startIdx, endIdx]);
      }
    }
  }

  // Match diseases
  for (const disease of sortedDiseases) {
    const escapedDisease = disease.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedDisease}\\b`, 'gi');
    let match;

    while ((match = regex.exec(textLower)) !== null) {
      const startIdx = match.index;
      const endIdx = startIdx + match[0].length;

      if (!isOverlapping(startIdx, endIdx)) {
        const originalText = text.substring(startIdx, endIdx);
        entities.push({
          id: idCounter++,
          text: originalText,
          type: "disease",
          startIndex: startIdx,
          endIndex: endIdx,
          confidence: 0.90,
        });
        matchedRanges.push([startIdx, endIdx]);
      }
    }
  }

  // Sort by position in text
  entities.sort((a, b) => a.startIndex - b.startIndex);

  return entities;
}

/**
 * Check if a given text contains any known drug name
 */
export function containsDrug(text: string): boolean {
  const textLower = text.toLowerCase();
  return DRUG_NAMES.some(drug => {
    const regex = new RegExp(`\\b${drug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(textLower);
  });
}

/**
 * Check if a given text contains any known disease name
 */
export function containsDisease(text: string): boolean {
  const textLower = text.toLowerCase();
  return DISEASE_NAMES.some(disease => {
    const regex = new RegExp(`\\b${disease.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(textLower);
  });
}

/**
 * Get drug names count
 */
export function getDrugCount(): number {
  return DRUG_NAMES.length;
}

/**
 * Get disease names count
 */
export function getDiseaseCount(): number {
  return DISEASE_NAMES.length;
}
