/*
  ============================================================
  FILE: routes/analyze.js
  PURPOSE: Handles the POST /api/analyze endpoint.

  This is where the CORE LOGIC lives:
  1. Receive patient data from the frontend
  2. Parse structured data (age, BP, cholesterol, etc.)
  3. Process unstructured text (symptoms, notes)  ← NLP hook
  4. Process uploaded medical images              ← ML/CV hook
  5. Compute disease risk scores                  ← ML model hook
  6. Return the results as JSON

  WHEN YOU PLUG IN ML:
  Look for comments marked "🔌 ML HOOK" — that's where you
  replace the placeholder logic with real model calls.
  ============================================================
*/

const express = require('express');

/*
  express.Router() creates a mini-app that handles routes.
  We export this and mount it in server.js at '/api/analyze'.
*/
const router = express.Router();

const path = require('path');
const fs   = require('fs');


// ============================================================
// POST /api/analyze
// The main route — receives patient data + files, returns risks.
// ============================================================

router.post('/', function (req, res) {
  /*
    We access the multer upload middleware from app.locals
    (we attached it there in server.js).
    upload.array('files', 10) means: accept up to 10 files in the 'files' field.
  */
  const upload = req.app.locals.upload;

  /*
    Multer handles the multipart/form-data request.
    We call upload.array() as middleware here instead of in server.js
    so that each route can customize its file handling independently.
  */
  upload.array('files', 10)(req, res, async function (uploadError) {

    // If multer encountered an error, return it
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(400).json({
        success: false,
        error: 'File upload failed: ' + uploadError.message
      });
    }

    try {
      // ---- STEP 1: Parse Patient Data ----

      /*
        The frontend sends patientData as a JSON string in a form field.
        We need to parse it back into a JavaScript object.
        JSON.parse() converts a JSON string → JavaScript object.
      */
      let patientData;
      try {
        patientData = JSON.parse(req.body.patientData || '{}');
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid patient data format. Expected JSON.'
        });
      }

      console.log('\n📋 New Assessment Request:');
      console.log('   Patient:', patientData.fullName || 'Anonymous');
      console.log('   Age:', patientData.age);
      console.log('   Files uploaded:', req.files ? req.files.length : 0);

      // ---- STEP 2: Validate Required Fields ----
      /*
        We check that the most critical fields are present.
        If they're missing, we can't do a meaningful analysis.
      */
      const validationErrors = validatePatientData(patientData);
      if (validationErrors.length > 0) {
        return res.status(422).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
      }

      // ---- STEP 3: Process Structured Data ----
      /*
        "Structured data" = data in a known format (numbers, categories).
        Example: age=35, bloodPressure=130, smoking="current_heavy"
        This goes directly into the risk calculation formulas.
      */
      const structuredFeatures = extractStructuredFeatures(patientData);
      console.log('   Structured features extracted:', Object.keys(structuredFeatures).length);


      // ---- STEP 4: Process Unstructured Text (NLP) ----
      /*
        "Unstructured data" = free-form text (symptoms, doctor notes).
        Example: "patient reports chest pain, shortness of breath, fatigue"

        🔌 ML HOOK: Replace processUnstructuredText() with an actual NLP call.
        Options:
        - Send to your Python NLP service: await axios.post('http://nlp-service/analyze', text)
        - Call OpenAI/Claude API for text analysis
        - Use a local model with transformers.js

        The function currently does simple keyword matching as a placeholder.
      */
      const textFeatures = processUnstructuredText(patientData.symptoms || '');
      console.log('   Text symptoms detected:', textFeatures.detectedSymptoms);


      // ---- STEP 5: Process Uploaded Files (Computer Vision) ----
      /*
        🔌 ML HOOK: Replace processUploadedFiles() with real image analysis.
        Options:
        - Send image to a Python Flask service with TensorFlow/PyTorch
        - Use a medical imaging API (Google Cloud Healthcare, AWS HealthLake)
        - Use a pre-trained chest X-ray model (CheXNet, etc.)

        Currently just returns metadata about the files.
      */
      const fileAnalysis = await processUploadedFiles(req.files || [], patientData.scanType);
      console.log('   File analysis complete. Files processed:', fileAnalysis.filesProcessed);


      // ---- STEP 6: Compute Risk Scores ----
      /*
        🔌 ML HOOK: Replace computeRiskScores() with your trained ML model.
        Options:
        - Call a Python ML API (scikit-learn, XGBoost model)
        - Use TensorFlow.js to run a model directly in Node.js
        - Call a cloud AI service

        Current implementation uses rule-based logic (no ML).
      */
      const riskScores = computeRiskScores(structuredFeatures, textFeatures, fileAnalysis);
      console.log('   Risk scores computed:', riskScores);


      // ---- STEP 7: Generate Recommendations ----
      /*
        🔌 LLM HOOK: Replace generateRecommendations() with an LLM call.
        Example: Send risk scores + patient data to Claude or GPT
        and ask it to generate personalized clinical recommendations.
      */
      const recommendations = generateRecommendations(riskScores, patientData);


      // ---- STEP 8: Build and Send Response ----
      const responsePayload = {
        success: true,
        patientName: patientData.fullName || 'Patient',
        generatedAt: new Date().toISOString(),
        risks: riskScores,
        recommendations: recommendations,
        metadata: {
          filesProcessed: fileAnalysis.filesProcessed,
          symptomsDetected: textFeatures.detectedSymptoms,
          modelVersion: 'placeholder-v1.0',
          note: 'Risk scores are from a placeholder rule engine. Plug in ML model for clinical accuracy.'
        }
      };

      console.log('   ✅ Response sent successfully.\n');

      /*
        res.json() converts the JavaScript object to JSON and sends it.
        The frontend receives this and calls displayResults().
      */
      res.json(responsePayload);

      // ---- STEP 9: Cleanup Uploaded Files (Optional) ----
      /*
        In a real system, you might move files to permanent storage
        (AWS S3, Google Cloud Storage) instead of deleting them.
        For demo purposes, we clean up after 5 minutes.
      */
      if (req.files && req.files.length > 0) {
        scheduleFileCleanup(req.files, 5 * 60 * 1000); // 5 minutes
      }

    } catch (error) {
      // Catch any unexpected errors in the try block
      console.error('❌ Analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during analysis.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});


// ============================================================
// HELPER FUNCTIONS
// These keep the route handler above clean and focused.
// ============================================================

/**
 * Validates that required patient data fields are present.
 * Returns an array of error messages. Empty array = valid.
 * @param {Object} data - Patient data object
 * @returns {string[]} - Array of error strings
 */
function validatePatientData(data) {
  const errors = [];

  if (!data.age || isNaN(data.age)) {
    errors.push('Age is required and must be a number.');
  } else if (data.age < 1 || data.age > 120) {
    errors.push('Age must be between 1 and 120.');
  }

  if (!data.gender) {
    errors.push('Gender/biological sex is required.');
  }

  if (!data.smoking) {
    errors.push('Smoking status is required.');
  }

  return errors;
}


/**
 * Extracts and normalizes structured numerical/categorical features.
 * This is what gets fed directly into the risk model.
 * @param {Object} data - Raw patient data from frontend
 * @returns {Object} - Normalized feature object
 */
function extractStructuredFeatures(data) {
  /*
    parseFloat() converts a string "120" to the number 120.
    We use || null (fallback) for optional fields — if missing, they're null
    and we handle null in the risk calculator.
  */
  const features = {
    // Demographics
    age:           parseInt(data.age) || 0,
    gender:        data.gender || 'unknown',
    ethnicity:     data.ethnicity || 'unknown',

    // Vitals (using null for missing data)
    bloodPressure: parseFloat(data.bloodPressure) || null,
    bloodSugar:    parseFloat(data.bloodSugar) || null,
    cholesterol:   parseFloat(data.cholesterol) || null,

    // Anthropometrics
    height:        parseFloat(data.height) || null,
    weight:        parseFloat(data.weight) || null,
    bmi:           null, // calculated below

    // Lifestyle (categorical)
    smokingStatus: data.smoking || 'unknown',
    alcoholUse:    data.alcohol || 'unknown',
    exerciseLevel: data.exercise || 'unknown',

    // Family history (boolean flags — true if in the array)
    familyDiabetes:      (data.familyHistory || []).includes('diabetes'),
    familyHeartDisease:  (data.familyHistory || []).includes('heart_disease'),
    familyCancer:        (data.familyHistory || []).includes('cancer'),
    familyHypertension:  (data.familyHistory || []).includes('hypertension'),
    familyStroke:        (data.familyHistory || []).includes('stroke'),
    familyKidneyDisease: (data.familyHistory || []).includes('kidney_disease'),
  };

  // Calculate BMI if we have height and weight
  if (features.height && features.weight && features.height > 0) {
    // BMI formula: weight(kg) / height(m)^2
    features.bmi = parseFloat(
      (features.weight / Math.pow(features.height / 100, 2)).toFixed(1)
    );
  }

  return features;
}


/**
 * Processes unstructured symptom text using keyword detection.
 *
 * 🔌 ML HOOK: Replace this with an NLP model (BERT, spaCy, GPT, etc.)
 * that can extract medical entities (symptoms, conditions, medications)
 * from free-form text.
 *
 * @param {string} text - Free text from the symptoms field
 * @returns {Object} - Detected symptoms and their disease associations
 */
function processUnstructuredText(text) {
  const lowerText = text.toLowerCase();

  /*
    Symptom → Disease mapping.
    Each keyword maps to a list of diseases it's associated with.
    The risk engine adds extra weight if these are detected.
  */
  const symptomMap = {
    'chest pain':       ['heartDisease', 'stroke'],
    'shortness of breath': ['heartDisease', 'lungDisease'],
    'fatigue':          ['diabetes', 'thyroidDisorder', 'heartDisease'],
    'frequent urination': ['diabetes', 'kidneyDisease'],
    'blurred vision':   ['diabetes', 'hypertension'],
    'headache':         ['hypertension', 'stroke'],
    'dizziness':        ['hypertension', 'stroke'],
    'swollen feet':     ['heartDisease', 'kidneyDisease'],
    'weight gain':      ['thyroidDisorder', 'diabetes'],
    'weight loss':      ['diabetes', 'liverDisease'],
    'nausea':           ['liverDisease', 'kidneyDisease'],
    'jaundice':         ['liverDisease'],
    'cough':            ['lungDisease'],
    'wheezing':         ['lungDisease'],
    'palpitations':     ['heartDisease', 'thyroidDisorder'],
    'excessive thirst': ['diabetes'],
    'numbness':         ['diabetes', 'stroke'],
    'memory problems':  ['stroke'],
  };

  const detectedSymptoms = [];
  const diseaseSignals = {}; // tracks which diseases were mentioned

  // Check each symptom keyword
  Object.entries(symptomMap).forEach(function ([symptom, diseases]) {
    if (lowerText.includes(symptom)) {
      detectedSymptoms.push(symptom);
      diseases.forEach(function (disease) {
        // Count how many symptoms point to each disease
        diseaseSignals[disease] = (diseaseSignals[disease] || 0) + 1;
      });
    }
  });

  return {
    rawText: text,
    detectedSymptoms: detectedSymptoms,
    diseaseSignals: diseaseSignals,
    /*
      🔌 LLM HOOK: In the future, you could also return:
      - nlpEntities: ['chest pain', 'hypertension'] (extracted by NLP)
      - sentiment: 'concerned' (patient's tone)
      - urgency: 'high' (how urgent the symptoms are)
    */
  };
}


/**
 * Processes uploaded medical files.
 * Currently extracts metadata only.
 *
 * 🔌 ML HOOK: Replace with real image analysis:
 * - For X-rays: Use CheXNet or a custom CNN
 * - For MRIs: Use a segmentation model
 * - For PDFs: Use OCR (Tesseract) to extract lab values
 * - Send image bytes to a Python ML service
 *
 * @param {Object[]} files - Array of multer file objects
 * @param {string} scanType - Type of scan (from form)
 * @returns {Object} - Analysis results from files
 */
async function processUploadedFiles(files, scanType) {
  if (!files || files.length === 0) {
    return {
      filesProcessed: 0,
      findings: [],
      fileSignals: {}
    };
  }

  const findings = [];
  const fileSignals = {};

  for (const file of files) {
    /*
      Each multer file object has:
      - file.originalname: original filename from user's computer
      - file.filename: the new name we gave it (with UUID)
      - file.path: full path on disk
      - file.mimetype: e.g., "image/jpeg"
      - file.size: size in bytes
    */

    const fileInfo = {
      originalName: file.originalname,
      storedName: file.filename,
      type: file.mimetype,
      size: file.size,
      scanType: scanType || 'unknown',
      /*
        🔌 ML HOOK: This is where you'd add real analysis results.
        Example:
        mlFindings: await callMLService(file.path, scanType),
        ocrText: await extractTextFromPDF(file.path),
        imageFeatures: await runImageClassifier(file.path),
      */
    };

    findings.push(fileInfo);

    // Placeholder: Use scan type to add disease signals
    if (scanType === 'chest_xray') {
      fileSignals['lungDisease'] = (fileSignals['lungDisease'] || 0) + 5;
      fileSignals['heartDisease'] = (fileSignals['heartDisease'] || 0) + 3;
    } else if (scanType === 'ecg') {
      fileSignals['heartDisease'] = (fileSignals['heartDisease'] || 0) + 8;
    } else if (scanType === 'blood_report') {
      fileSignals['diabetes'] = (fileSignals['diabetes'] || 0) + 5;
      fileSignals['kidneyDisease'] = (fileSignals['kidneyDisease'] || 0) + 5;
    }
  }

  return {
    filesProcessed: files.length,
    findings: findings,
    fileSignals: fileSignals
  };
}


/**
 * Computes disease risk percentages from all available features.
 *
 * 🔌 ML HOOK: Replace this entire function with a call to your ML model.
 *
 * Example Python ML service call:
 * const response = await axios.post('http://ml-service:8000/predict', {
 *   features: structuredFeatures,
 *   textFeatures: textFeatures,
 *   fileSignals: fileAnalysis.fileSignals
 * });
 * return response.data.predictions;
 *
 * @param {Object} sf - Structured features (age, BP, etc.)
 * @param {Object} tf - Text features (detected symptoms)
 * @param {Object} fa - File analysis results
 * @returns {Object} - Disease name → risk percentage (0-100)
 */
function computeRiskScores(sf, tf, fa) {
  // Utility: clamp a value between min and max
  const clamp = (val, min, max) => Math.min(Math.max(Math.round(val), min), max);

  // Start with baseline risks (everyone has some base risk)
  const risks = {
    diabetes:      10,
    hypertension:  8,
    heartDisease:  7,
    stroke:        5,
    kidneyDisease: 6,
    liverDisease:  5,
    obesity:       5,
    lungDisease:   4,
    thyroidDisorder: 8,
  };

  // ---- AGE FACTOR ----
  // Risk increases significantly with age
  const age = sf.age;
  if (age > 70) {
    risks.heartDisease  += 35; risks.stroke       += 30;
    risks.hypertension  += 30; risks.kidneyDisease += 20;
    risks.diabetes      += 20; risks.thyroidDisorder += 15;
  } else if (age > 60) {
    risks.heartDisease  += 25; risks.stroke       += 20;
    risks.hypertension  += 22; risks.kidneyDisease += 15;
    risks.diabetes      += 15;
  } else if (age > 45) {
    risks.heartDisease  += 15; risks.stroke       += 12;
    risks.hypertension  += 12; risks.diabetes     += 10;
  } else if (age > 35) {
    risks.heartDisease  += 8;  risks.hypertension += 6;
    risks.diabetes      += 5;
  }

  // ---- GENDER FACTOR ----
  // Some diseases have gender-specific epidemiology
  if (sf.gender === 'male') {
    risks.heartDisease += 8;
    risks.stroke       += 5;
    risks.liverDisease += 5;
  } else if (sf.gender === 'female') {
    risks.thyroidDisorder += 12; // thyroid disorders are more common in women
    risks.obesity         += 3;
  }

  // ---- SMOKING ----
  if (sf.smokingStatus === 'current_heavy') {
    risks.lungDisease   += 40; risks.heartDisease += 22;
    risks.stroke        += 18; risks.kidneyDisease += 8;
  } else if (sf.smokingStatus === 'current_light') {
    risks.lungDisease   += 22; risks.heartDisease += 12;
    risks.stroke        += 10;
  } else if (sf.smokingStatus === 'former') {
    risks.lungDisease   += 10; risks.heartDisease += 6;
  }

  // ---- ALCOHOL ----
  if (sf.alcoholUse === 'heavy') {
    risks.liverDisease  += 35; risks.hypertension += 12;
    risks.kidneyDisease += 8;
  } else if (sf.alcoholUse === 'moderate') {
    risks.liverDisease  += 10;
  }

  // ---- EXERCISE / PHYSICAL ACTIVITY ----
  if (sf.exerciseLevel === 'sedentary') {
    risks.diabetes      += 15; risks.heartDisease += 12;
    risks.obesity       += 20; risks.hypertension += 8;
  } else if (sf.exerciseLevel === 'light') {
    risks.diabetes      += 5;  risks.obesity      += 5;
  } else if (sf.exerciseLevel === 'active') {
    risks.diabetes      -= 8;  risks.heartDisease -= 8;
    risks.obesity       -= 15; risks.hypertension -= 5;
  }

  // ---- BLOOD PRESSURE ----
  if (sf.bloodPressure !== null) {
    if (sf.bloodPressure >= 160) {
      risks.hypertension  += 40; risks.stroke       += 30;
      risks.heartDisease  += 20; risks.kidneyDisease += 15;
    } else if (sf.bloodPressure >= 140) {
      risks.hypertension  += 28; risks.stroke       += 20;
      risks.heartDisease  += 12;
    } else if (sf.bloodPressure >= 120) {
      risks.hypertension  += 12; risks.heartDisease += 5;
    }
  }

  // ---- BLOOD SUGAR ----
  if (sf.bloodSugar !== null) {
    if (sf.bloodSugar >= 200)       risks.diabetes += 50;      // likely diabetic
    else if (sf.bloodSugar >= 126)  risks.diabetes += 35;      // fasting diabetes threshold
    else if (sf.bloodSugar >= 100)  risks.diabetes += 15;      // pre-diabetes
  }

  // ---- CHOLESTEROL ----
  if (sf.cholesterol !== null) {
    if (sf.cholesterol >= 280) {
      risks.heartDisease  += 25; risks.stroke       += 15;
    } else if (sf.cholesterol >= 240) {
      risks.heartDisease  += 18; risks.stroke       += 10;
    } else if (sf.cholesterol >= 200) {
      risks.heartDisease  += 8;  risks.stroke       += 4;
    }
  }

  // ---- BMI ----
  if (sf.bmi !== null) {
    if (sf.bmi >= 40) {
      risks.obesity       += 50; risks.diabetes    += 25;
      risks.heartDisease  += 20; risks.hypertension += 15;
    } else if (sf.bmi >= 35) {
      risks.obesity       += 35; risks.diabetes    += 18;
      risks.heartDisease  += 12;
    } else if (sf.bmi >= 30) {
      risks.obesity       += 22; risks.diabetes    += 12;
    } else if (sf.bmi >= 25) {
      risks.obesity       += 10; risks.diabetes    += 5;
    }
  }

  // ---- FAMILY HISTORY ----
  if (sf.familyDiabetes)      risks.diabetes      += 18;
  if (sf.familyHeartDisease)  risks.heartDisease  += 18;
  if (sf.familyHypertension)  risks.hypertension  += 15;
  if (sf.familyStroke)        risks.stroke        += 15;
  if (sf.familyKidneyDisease) risks.kidneyDisease += 15;
  if (sf.familyCancer)        risks.liverDisease  += 8;

  // ---- SYMPTOMS FROM TEXT (NLP output) ----
  const signals = tf.diseaseSignals || {};
  Object.entries(signals).forEach(function ([disease, count]) {
    if (risks[disease] !== undefined) {
      // Each symptom mention adds 6% to the risk (capped by clamp later)
      risks[disease] += count * 6;
    }
  });

  // ---- SIGNALS FROM UPLOADED FILES ----
  const fileSignals = fa.fileSignals || {};
  Object.entries(fileSignals).forEach(function ([disease, bonus]) {
    if (risks[disease] !== undefined) {
      risks[disease] += bonus;
    }
  });

  // ---- CLAMP all values to realistic range (2% - 95%) ----
  // We use 2% minimum because no risk is truly 0.
  // We cap at 95% because we're not a clinical tool — uncertainty is real.
  Object.keys(risks).forEach(function (key) {
    risks[key] = clamp(risks[key], 2, 95);
  });

  return risks;
}


/**
 * Generates personalized textual recommendations.
 *
 * 🔌 LLM HOOK: Replace this with an API call to GPT/Claude.
 * Example prompt:
 * "Given these disease risk scores: {risks} and patient data: {data},
 *  generate 5 personalized clinical recommendations in simple English."
 *
 * @param {Object} risks - Computed risk scores
 * @param {Object} data - Original patient data
 * @returns {string[]} - Array of recommendation strings
 */
function generateRecommendations(risks, data) {
  const recs = [];

  // Sort diseases by risk, highest first
  const sorted = Object.entries(risks).sort((a, b) => b[1] - a[1]);

  // Generate specific recommendations for high-risk areas
  sorted.forEach(function ([disease, pct]) {
    if (pct >= 50) {
      // High risk recommendations
      switch (disease) {
        case 'diabetes':
          recs.push('🩸 Diabetes (HIGH): Schedule an HbA1c and oral glucose tolerance test immediately. A dietitian referral is recommended.');
          break;
        case 'heartDisease':
          recs.push('❤️ Cardiac (HIGH): Request a stress test, ECG, and echocardiogram. Consider cardiologist referral.');
          break;
        case 'hypertension':
          recs.push('🩺 Hypertension (HIGH): Monitor BP twice daily. Reduce sodium to <1500mg/day. Discuss medication with your doctor.');
          break;
        case 'stroke':
          recs.push('🧠 Stroke (HIGH): Urgent lifestyle intervention needed. Ask your doctor about antiplatelet therapy eligibility.');
          break;
        case 'obesity':
          recs.push('⚖️ Obesity (HIGH): Consider a structured weight management program. Aim for 0.5–1 kg/week loss.');
          break;
        case 'lungDisease':
          recs.push('🫁 Lung (HIGH): Spirometry test recommended. Immediate smoking cessation is critical.');
          break;
        case 'liverDisease':
          recs.push('🫀 Liver (HIGH): Request LFT (liver function tests) and abdominal ultrasound. Reduce alcohol to zero.');
          break;
      }
    } else if (pct >= 30) {
      // Moderate risk — monitoring recommendations
      switch (disease) {
        case 'diabetes':
          recs.push('🩸 Diabetes (MODERATE): Annual fasting blood glucose test. Reduce refined carbohydrates and sugary drinks.');
          break;
        case 'heartDisease':
          recs.push('❤️ Cardiac (MODERATE): Annual cholesterol panel. Include omega-3 rich foods and regular aerobic exercise.');
          break;
        case 'hypertension':
          recs.push('🩺 Blood Pressure (MODERATE): Check BP monthly. Limit alcohol and reduce stress with mindfulness or yoga.');
          break;
        case 'thyroidDisorder':
          recs.push('🦋 Thyroid (MODERATE): Annual TSH blood test recommended, especially for women over 35.');
          break;
      }
    }
  });

  // Lifestyle-based general recommendations
  if (data.smoking && data.smoking.startsWith('current')) {
    recs.push('🚭 Smoking Cessation: This is the single most impactful change you can make. Speak to your doctor about nicotine replacement therapy.');
  }

  if (data.exercise === 'sedentary') {
    recs.push('🏃 Physical Activity: Begin with 30 minutes of brisk walking 5 days a week. This reduces risk of 6+ chronic diseases.');
  }

  // Default if no major risks
  if (recs.length === 0) {
    recs.push('✅ Your risk profile appears generally favorable. Continue maintaining a healthy lifestyle.');
    recs.push('📅 Schedule annual health checkups to track key biomarkers (glucose, cholesterol, blood pressure).');
  }

  // Always add disclaimer
  recs.push('⚕️ IMPORTANT: These are AI-generated suggestions based on statistical risk factors. Always consult a licensed physician for medical decisions.');

  // Limit to 6 recommendations to keep the report clean
  return recs.slice(0, 6);
}


/**
 * Schedules deletion of uploaded files after a delay.
 * This prevents the server from filling up with patient files.
 * @param {Object[]} files - Array of multer file objects
 * @param {number} delayMs - Delay in milliseconds
 */
function scheduleFileCleanup(files, delayMs) {
  setTimeout(function () {
    files.forEach(function (file) {
      fs.unlink(file.path, function (err) {
        if (err) {
          console.warn('Could not delete file:', file.path, err.message);
        } else {
          console.log('🗑️  Cleaned up file:', file.filename);
        }
      });
    });
  }, delayMs);
}


// Export the router so server.js can mount it
module.exports = router;
