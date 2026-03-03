/*
  ============================================================
  FILE: main.js
  PURPOSE: All the behavior and interactivity of the website.
  JavaScript is the BRAIN of the page — it responds to user
  actions (clicks, typing, scrolling) and updates what they see.

  KEY CONCEPTS USED HERE:
  - querySelector / getElementById: Finding HTML elements
  - addEventListener: Listening for user actions (click, scroll, etc.)
  - classList.add/remove: Changing CSS classes to change appearance
  - fetch(): Making HTTP requests to our Node.js backend
  - FormData: Collecting form input values
  ============================================================
*/


/* ============================================================
  SECTION 1: WAIT FOR PAGE TO LOAD
  We wrap everything in DOMContentLoaded so our code runs AFTER
  the HTML has been parsed. If we didn't do this, we'd try to
  find HTML elements that don't exist yet.
============================================================ */
document.addEventListener('DOMContentLoaded', function () {

  // ---- Initialize everything when page loads ----
  initNavbar();
  initHamburger();
  initUploadZone();
  initFormValidation();
  updateProgressBar(); // Set initial progress bar to step 1
  console.log('✅ MediScan website initialized.');

});


/* ============================================================
  SECTION 2: NAVBAR BEHAVIOR
  Makes the navbar change style when user scrolls down.
============================================================ */
function initNavbar() {
  // Get the navbar element by its id
  const navbar = document.getElementById('navbar');

  // 'scroll' event fires every time the user scrolls
  window.addEventListener('scroll', function () {
    // window.scrollY = how many pixels the user has scrolled down
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');    // add dark background
    } else {
      navbar.classList.remove('scrolled'); // remove it when back at top
    }
  });
}


/* ============================================================
  SECTION 3: HAMBURGER MENU (Mobile navigation)
  Toggles the mobile nav open/closed.
============================================================ */
function initHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (!hamburger) return; // Safety check

  hamburger.addEventListener('click', function () {
    // Toggle the 'open' class (CSS handles the actual visual change)
    navLinks.classList.toggle('open');
  });

  // Close the mobile menu when a link is clicked
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
    });
  });
}


/* ============================================================
  SECTION 4: MULTI-STEP FORM NAVIGATION
  Controls moving between the 4 form steps.

  STEP FLOW:
  Step 1 (Personal) → Step 2 (Medical) → Step 3 (Files) → Step 4 (Review)

  currentStep keeps track of where we are.
============================================================ */

// This variable tracks which step the user is on (1-4)
let currentStep = 1;

// Total number of steps
const TOTAL_STEPS = 4;

// Stores the uploaded files (array of File objects)
let uploadedFiles = [];

/**
 * Move to the NEXT step.
 * Called when user clicks "Continue →"
 * @param {number} fromStep - The step we're leaving
 */
function nextStep(fromStep) {
  // First, validate the current step. If invalid, don't proceed.
  if (!validateStep(fromStep)) return;

  // If we're on step 4, don't go further (submit instead)
  if (fromStep >= TOTAL_STEPS) return;

  // Hide the current step
  document.getElementById('step' + fromStep).classList.remove('active');

  // Mark current step as completed (adds ✓ checkmark)
  document.querySelector('.progress-step[data-step="' + fromStep + '"]').classList.remove('active');
  document.querySelector('.progress-step[data-step="' + fromStep + '"]').classList.add('completed');

  // Move to next step
  currentStep = fromStep + 1;

  // Show the next step
  document.getElementById('step' + currentStep).classList.add('active');

  // Highlight the new active step in the progress bar
  document.querySelector('.progress-step[data-step="' + currentStep + '"]').classList.add('active');
  document.querySelector('.progress-step[data-step="' + currentStep + '"]').classList.remove('completed');

  // Update the animated progress bar width
  updateProgressBar();

  // If going to Step 4, populate the review section
  if (currentStep === 4) {
    populateReview();
  }

  // Scroll back to the top of the form
  document.getElementById('assessment').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Move to the PREVIOUS step.
 * Called when user clicks "← Back"
 * @param {number} fromStep - The step we're leaving
 */
function prevStep(fromStep) {
  if (fromStep <= 1) return; // Can't go before step 1

  // Hide current step
  document.getElementById('step' + fromStep).classList.remove('active');
  document.querySelector('.progress-step[data-step="' + fromStep + '"]').classList.remove('active');

  // Go back
  currentStep = fromStep - 1;

  // Show previous step
  document.getElementById('step' + currentStep).classList.add('active');

  // Move the "completed" status back to active
  document.querySelector('.progress-step[data-step="' + currentStep + '"]').classList.remove('completed');
  document.querySelector('.progress-step[data-step="' + currentStep + '"]').classList.add('active');

  updateProgressBar();
}

/**
 * Updates the progress bar width based on current step.
 * The bar fills from 0% (step 1) to 100% (step 4).
 */
function updateProgressBar() {
  const fill = document.getElementById('progressFill');
  if (!fill) return;
  // Calculate percentage: step 1 = 0%, step 2 = 33%, step 3 = 66%, step 4 = 100%
  const percent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  fill.style.width = percent + '%';
}


/* ============================================================
  SECTION 5: FORM VALIDATION
  Checks that required fields are filled before moving forward.
  Shows helpful error messages under the fields.
============================================================ */

/**
 * Validates a specific step's required fields.
 * Returns true if valid, false if there are errors.
 * @param {number} step - Which step to validate
 */
function validateStep(step) {
  let isValid = true;

  if (step === 1) {
    // Validate Step 1: Age and Gender are required
    isValid = validateRequired('age', 'ageError', 'Age is required.') && isValid;
    isValid = validateRequired('gender', 'genderError', 'Please select your biological sex.') && isValid;

    // Extra check: age must be a reasonable number
    const age = parseInt(document.getElementById('age').value);
    if (age && (age < 1 || age > 120)) {
      showError('ageError', 'Please enter a valid age (1-120).');
      isValid = false;
    }

  } else if (step === 2) {
    // Validate Step 2: Smoking status is required
    isValid = validateRequired('smoking', 'smokingError', 'Please select your smoking status.') && isValid;
  }

  // Steps 3 & 4 have no required validation (files are optional)
  return isValid;
}

/**
 * Checks if an input field has a value.
 * Shows an error message if empty.
 */
function validateRequired(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);

  if (!field || !field.value.trim()) {
    showError(errorId, message);
    field.closest('.form-group').classList.add('has-error'); // red border
    return false;
  } else {
    clearError(errorId);
    field.closest('.form-group').classList.remove('has-error');
    return true;
  }
}

/** Shows an error message under a field */
function showError(errorId, message) {
  const el = document.getElementById(errorId);
  if (el) el.textContent = message;
}

/** Clears an error message under a field */
function clearError(errorId) {
  const el = document.getElementById(errorId);
  if (el) el.textContent = '';
}

/** Set up real-time validation (clears error as user types) */
function initFormValidation() {
  // When user types in age field, clear the error
  const ageField = document.getElementById('age');
  if (ageField) {
    ageField.addEventListener('input', () => {
      clearError('ageError');
      ageField.closest('.form-group').classList.remove('has-error');
    });
  }

  const genderField = document.getElementById('gender');
  if (genderField) {
    genderField.addEventListener('change', () => {
      clearError('genderError');
      genderField.closest('.form-group').classList.remove('has-error');
    });
  }
}


/* ============================================================
  SECTION 6: FILE UPLOAD HANDLER
  Handles drag-and-drop and file browser for Step 3.
============================================================ */
function initUploadZone() {
  const zone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');

  if (!zone || !fileInput) return;

  // When user picks files through the browser dialog
  fileInput.addEventListener('change', function (e) {
    handleFiles(e.target.files);
  });

  // Drag and drop events
  // 'dragover' fires repeatedly while dragging over the zone
  zone.addEventListener('dragover', function (e) {
    e.preventDefault(); // MUST prevent default to allow drop
    zone.classList.add('drag-over');
  });

  // 'dragleave' fires when dragged item leaves the zone
  zone.addEventListener('dragleave', function () {
    zone.classList.remove('drag-over');
  });

  // 'drop' fires when user releases the dragged file
  zone.addEventListener('drop', function (e) {
    e.preventDefault(); // Prevent browser from opening the file
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files); // e.dataTransfer.files = dropped files
  });
}

/**
 * Processes selected/dropped files.
 * Adds them to uploadedFiles array and shows preview.
 * @param {FileList} files - Native browser FileList object
 */
function handleFiles(files) {
  // Convert FileList to a regular Array so we can use .forEach()
  Array.from(files).forEach(function (file) {
    // Check file size (10MB limit = 10 * 1024 * 1024 bytes)
    if (file.size > 10 * 1024 * 1024) {
      alert(file.name + ' is too large. Max size is 10MB.');
      return; // skip this file
    }

    // Avoid duplicates by name
    if (uploadedFiles.find(f => f.name === file.name)) return;

    uploadedFiles.push(file);
    renderFileItem(file);
  });
}

/**
 * Renders a single file item in the file list UI.
 * @param {File} file - A File object
 */
function renderFileItem(file) {
  const list = document.getElementById('fileList');

  // Create a new div element for this file
  const item = document.createElement('div');
  item.className = 'file-item';
  item.id = 'file-' + file.name.replace(/\W/g, '_'); // safe ID

  // Choose an emoji icon based on file type
  const icon = file.type.includes('image') ? '🖼️' : '📄';

  // Format file size (bytes → KB/MB)
  const size = file.size > 1024 * 1024
    ? (file.size / 1024 / 1024).toFixed(1) + ' MB'
    : (file.size / 1024).toFixed(0) + ' KB';

  // innerHTML sets the HTML content of the element
  item.innerHTML = `
    <span class="file-item-icon">${icon}</span>
    <span class="file-item-name">${file.name}</span>
    <span class="file-item-size">${size}</span>
    <button class="file-item-remove" onclick="removeFile('${file.name}')" title="Remove">✕</button>
  `;

  list.appendChild(item); // Add to the DOM
}

/**
 * Removes a file from the uploaded list.
 * @param {string} fileName - Name of the file to remove
 */
function removeFile(fileName) {
  // Remove from our array
  uploadedFiles = uploadedFiles.filter(f => f.name !== fileName);

  // Remove the UI element
  const item = document.getElementById('file-' + fileName.replace(/\W/g, '_'));
  if (item) item.remove();
}


/* ============================================================
  SECTION 7: REVIEW PAGE POPULATION
  Fills in Step 4's review card with the data from Steps 1-3.
============================================================ */
function populateReview() {
  // Helper to get form field value
  const val = (id) => {
    const el = document.getElementById(id);
    return el ? (el.value || '—') : '—';
  };

  // Helper to get a select's display text (not the value)
  const selectText = (id) => {
    const el = document.getElementById(id);
    return el && el.selectedIndex > 0 ? el.options[el.selectedIndex].text : '—';
  };

  // Calculate BMI if height and weight are provided
  const height = parseFloat(val('height'));
  const weight = parseFloat(val('weight'));
  let bmi = '—';
  if (height > 0 && weight > 0) {
    const bmiVal = weight / ((height / 100) ** 2);
    bmi = bmiVal.toFixed(1);
  }

  // Get family history checkboxes
  const checkedBoxes = document.querySelectorAll('input[name="familyHistory"]:checked');
  const familyHistory = checkedBoxes.length > 0
    ? Array.from(checkedBoxes).map(cb => cb.value.replace(/_/g, ' ')).join(', ')
    : 'None selected';

  // Populate Personal Info review
  document.getElementById('reviewPersonal').innerHTML = `
    <div class="review-item"><span class="review-label">Name</span><span class="review-value">${val('fullName')}</span></div>
    <div class="review-item"><span class="review-label">Age</span><span class="review-value">${val('age')} years</span></div>
    <div class="review-item"><span class="review-label">Sex</span><span class="review-value">${selectText('gender')}</span></div>
    <div class="review-item"><span class="review-label">Height</span><span class="review-value">${val('height')} cm</span></div>
    <div class="review-item"><span class="review-label">Weight</span><span class="review-value">${val('weight')} kg</span></div>
    <div class="review-item"><span class="review-label">BMI</span><span class="review-value">${bmi}</span></div>
    <div class="review-item"><span class="review-label">Ethnicity</span><span class="review-value">${selectText('ethnicity')}</span></div>
  `;

  // Populate Medical History review
  document.getElementById('reviewMedical').innerHTML = `
    <div class="review-item"><span class="review-label">Smoking</span><span class="review-value">${selectText('smoking')}</span></div>
    <div class="review-item"><span class="review-label">Alcohol</span><span class="review-value">${selectText('alcohol')}</span></div>
    <div class="review-item"><span class="review-label">Activity</span><span class="review-value">${selectText('exercise')}</span></div>
    <div class="review-item"><span class="review-label">Blood Pressure</span><span class="review-value">${val('bloodPressure')} mmHg</span></div>
    <div class="review-item"><span class="review-label">Blood Sugar</span><span class="review-value">${val('bloodSugar')} mg/dL</span></div>
    <div class="review-item"><span class="review-label">Cholesterol</span><span class="review-value">${val('cholesterol')} mg/dL</span></div>
    <div class="review-item" style="grid-column:1/-1"><span class="review-label">Family History</span><span class="review-value">${familyHistory}</span></div>
  `;

  // Populate Files review
  const reviewFiles = document.getElementById('reviewFiles');
  if (uploadedFiles.length === 0) {
    reviewFiles.innerHTML = '<p class="review-none">No files uploaded.</p>';
  } else {
    reviewFiles.innerHTML = uploadedFiles
      .map(f => `<p style="font-size:0.85rem; color: var(--text-secondary); margin-bottom:0.3rem;">📎 ${f.name}</p>`)
      .join('');
  }

  // Store patient name for results heading
  window.patientName = val('fullName') !== '—' ? val('fullName') : 'Patient';
}


/* ============================================================
  SECTION 8: FORM SUBMISSION
  Sends data to the Node.js backend via a fetch() API call.
============================================================ */

// Intercept the form submit event
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('assessmentForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault(); // STOP the default browser form submission (which would reload the page)
      submitAssessment();
    });
  }
});

/**
 * Collects all form data and sends it to the backend.
 * The backend returns risk percentages which we display.
 */
async function submitAssessment() {
  const submitBtn = document.getElementById('submitBtn');
  const spinner = document.getElementById('btnSpinner');

  // Show loading state
  submitBtn.disabled = true;
  spinner.classList.add('visible');
  submitBtn.childNodes[0].textContent = 'Analyzing... ';

  // ---- Collect all form data ----

  // Get family history values (checked checkboxes)
  const familyHistory = Array.from(
    document.querySelectorAll('input[name="familyHistory"]:checked')
  ).map(cb => cb.value);

  // Build a data object with all patient info
  const patientData = {
    // Personal info
    fullName: document.getElementById('fullName').value,
    age: parseInt(document.getElementById('age').value),
    gender: document.getElementById('gender').value,
    height: parseFloat(document.getElementById('height').value) || null,
    weight: parseFloat(document.getElementById('weight').value) || null,
    ethnicity: document.getElementById('ethnicity').value,

    // Medical history
    smoking: document.getElementById('smoking').value,
    alcohol: document.getElementById('alcohol').value,
    exercise: document.getElementById('exercise').value,
    bloodPressure: parseFloat(document.getElementById('bloodPressure').value) || null,
    bloodSugar: parseFloat(document.getElementById('bloodSugar').value) || null,
    cholesterol: parseFloat(document.getElementById('cholesterol').value) || null,
    familyHistory: familyHistory,
    symptoms: document.getElementById('symptoms').value,

    // Scan info
    scanType: document.getElementById('scanType').value,
    filesUploaded: uploadedFiles.map(f => f.name)
  };

  /*
    FormData is used to send files along with the JSON data.
    It's the standard way to upload files via HTTP.
  */
  const formData = new FormData();

  // Add the JSON data as a string field
  formData.append('patientData', JSON.stringify(patientData));

  // Add each uploaded file
  uploadedFiles.forEach(function (file) {
    formData.append('files', file);
  });

  try {
    /*
      fetch() makes an HTTP POST request to our Node.js backend.
      The backend URL is 'http://localhost:5000/api/analyze'.
      In production, replace 'localhost:5000' with your server URL.

      WHAT HAPPENS:
      1. Browser sends the data to the backend
      2. Backend runs the risk calculation logic
      3. Backend returns a JSON response with risk percentages
    */
    const response = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      body: formData
      // Note: When using FormData, DO NOT set Content-Type header.
      // The browser sets it automatically with the correct boundary.
    });

    // Check if the server returned an error status code
    if (!response.ok) {
      throw new Error('Server error: ' + response.status);
    }

    // Parse the JSON response body
    const result = await response.json();

    console.log('📊 Risk analysis result:', result);

    // Display the results
    displayResults(result);

  } catch (error) {
    /*
      If the backend is not running, we use PLACEHOLDER DATA
      so the frontend still works for demo/development purposes.
      When you connect the real backend, this fallback runs only on error.
    */
    console.warn('⚠️ Backend not reachable. Using placeholder risk data.', error.message);

    const placeholderResult = generatePlaceholderRisks(patientData);
    displayResults(placeholderResult);

  } finally {
    // Always re-enable the button (whether success or error)
    submitBtn.disabled = false;
    spinner.classList.remove('visible');
    submitBtn.childNodes[0].textContent = 'Generate Report ';
  }
}


/* ============================================================
  SECTION 9: PLACEHOLDER RISK GENERATOR
  This is the TEMPORARY logic that runs when the backend is offline.
  WHEN YOU PLUG IN YOUR ML MODEL: replace this logic with real predictions.
  The output format must remain the same (same fields) so the UI still works.
============================================================ */

/**
 * Generates placeholder risk scores based on patient data.
 * This uses simple rule-based logic as a stand-in for ML models.
 * @param {Object} data - Patient data object
 * @returns {Object} - Risk result object
 */
function generatePlaceholderRisks(data) {
  // Helper to clamp a value between min and max
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  // Start with a base risk for each disease
  let risks = {
    diabetes: 10,
    hypertension: 8,
    heartDisease: 7,
    stroke: 5,
    kidneyDisease: 6,
    liverDisease: 5,
    obesity: 5,
    lungDisease: 4,
    thyroidDisorder: 8,
  };

  // --- Apply risk modifiers based on patient data ---

  // Age increases many risks
  const age = data.age || 30;
  if (age > 60) {
    risks.diabetes     += 20;
    risks.hypertension += 25;
    risks.heartDisease += 30;
    risks.stroke       += 25;
    risks.kidneyDisease += 15;
  } else if (age > 40) {
    risks.diabetes     += 10;
    risks.hypertension += 12;
    risks.heartDisease += 15;
    risks.stroke       += 10;
  }

  // Smoking increases lung and heart disease risk
  if (data.smoking === 'current_heavy') {
    risks.lungDisease  += 35;
    risks.heartDisease += 20;
    risks.stroke       += 15;
  } else if (data.smoking === 'current_light') {
    risks.lungDisease  += 20;
    risks.heartDisease += 10;
  } else if (data.smoking === 'former') {
    risks.lungDisease  += 10;
    risks.heartDisease += 5;
  }

  // Heavy alcohol use affects liver
  if (data.alcohol === 'heavy') {
    risks.liverDisease += 30;
    risks.hypertension += 10;
  }

  // Sedentary lifestyle raises several risks
  if (data.exercise === 'sedentary') {
    risks.diabetes     += 12;
    risks.heartDisease += 10;
    risks.obesity      += 15;
  } else if (data.exercise === 'active') {
    risks.diabetes     -= 5;
    risks.heartDisease -= 5;
    risks.obesity      -= 10;
  }

  // High blood pressure reading
  if (data.bloodPressure > 140) {
    risks.hypertension += 30;
    risks.stroke       += 20;
    risks.heartDisease += 15;
  } else if (data.bloodPressure > 120) {
    risks.hypertension += 15;
    risks.heartDisease += 8;
  }

  // High blood sugar → diabetes risk
  if (data.bloodSugar > 126) {
    risks.diabetes += 35;
  } else if (data.bloodSugar > 100) {
    risks.diabetes += 15;
  }

  // High cholesterol
  if (data.cholesterol > 240) {
    risks.heartDisease += 20;
    risks.stroke       += 10;
  } else if (data.cholesterol > 200) {
    risks.heartDisease += 8;
  }

  // BMI calculation
  if (data.height && data.weight) {
    const bmi = data.weight / ((data.height / 100) ** 2);
    if (bmi > 35) {
      risks.obesity   += 40;
      risks.diabetes  += 20;
      risks.heartDisease += 15;
    } else if (bmi > 30) {
      risks.obesity   += 25;
      risks.diabetes  += 10;
    }
  }

  // Family history multipliers
  if (data.familyHistory.includes('diabetes'))      risks.diabetes  += 15;
  if (data.familyHistory.includes('heart_disease')) risks.heartDisease += 15;
  if (data.familyHistory.includes('hypertension'))  risks.hypertension += 12;
  if (data.familyHistory.includes('stroke'))        risks.stroke    += 12;
  if (data.familyHistory.includes('kidney_disease')) risks.kidneyDisease += 12;
  if (data.familyHistory.includes('cancer'))        risks.liverDisease += 5;

  // Clamp all values to 0-95% (no 100% certainty from placeholder)
  Object.keys(risks).forEach(key => {
    risks[key] = clamp(Math.round(risks[key]), 2, 95);
  });

  // Generate recommendations based on highest risks
  const recommendations = generateRecommendations(risks, data);

  return {
    success: true,
    patientName: data.fullName || 'Patient',
    risks: risks,
    recommendations: recommendations,
    generatedAt: new Date().toISOString(),
    note: 'Placeholder risk engine. Plug in ML model for clinical accuracy.'
  };
}

/**
 * Generates textual recommendations based on risk scores.
 * @param {Object} risks - Disease risk scores
 * @param {Object} data - Patient data
 */
function generateRecommendations(risks, data) {
  const recs = [];

  if (risks.diabetes > 30)
    recs.push('Monitor fasting blood glucose regularly; consider HbA1c test if not done recently.');

  if (risks.hypertension > 30 || risks.heartDisease > 25)
    recs.push('Monitor blood pressure at home; reduce sodium intake and avoid processed foods.');

  if (risks.heartDisease > 30)
    recs.push('Request a full lipid panel and ECG from your cardiologist.');

  if (data.smoking && data.smoking.startsWith('current'))
    recs.push('Smoking cessation is strongly recommended — this is the single highest-impact lifestyle change.');

  if (data.exercise === 'sedentary')
    recs.push('Begin with 20–30 minutes of moderate walking daily to reduce cardiovascular and metabolic risk.');

  if (risks.liverDisease > 25)
    recs.push('Limit alcohol consumption; request liver function tests (LFT) at your next checkup.');

  if (risks.kidney_disease > 25)
    recs.push('Stay well-hydrated and request a kidney function panel (creatinine, BUN) from your doctor.');

  if (recs.length === 0)
    recs.push('Your current risk profile appears generally low. Maintain a healthy lifestyle and schedule annual checkups.');

  recs.push('⚕️ This report is AI-generated and for informational purposes only. Consult a licensed physician for diagnosis.');

  return recs;
}


/* ============================================================
  SECTION 10: DISPLAY RESULTS
  Shows the risk chart and cards after analysis is complete.
============================================================ */

// Store Chart.js instance so we can destroy it if re-submitted
let riskChartInstance = null;

/**
 * Renders the results section with a bar chart and risk cards.
 * @param {Object} result - The result object from backend or placeholder
 */
function displayResults(result) {
  // Hide the form
  document.getElementById('assessmentForm').style.display = 'none';

  // Show the results section
  const resultsSection = document.getElementById('resultsSection');
  resultsSection.style.display = 'block';

  // Update patient name in results header
  document.getElementById('resultsPatientName').textContent =
    'Patient: ' + (result.patientName || window.patientName || 'Unknown');

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth' });

  // Prepare chart data
  const diseases = Object.keys(result.risks);
  const percentages = Object.values(result.risks);

  // Friendly display names for diseases
  const diseaseLabels = {
    diabetes: 'Diabetes',
    hypertension: 'Hypertension',
    heartDisease: 'Heart Disease',
    stroke: 'Stroke',
    kidneyDisease: 'Kidney Disease',
    liverDisease: 'Liver Disease',
    obesity: 'Obesity',
    lungDisease: 'Lung Disease',
    thyroidDisorder: 'Thyroid Disorder'
  };

  // Color each bar based on risk level
  const barColors = percentages.map(p => {
    if (p >= 60) return '#FF6B6B';       // high risk = red
    if (p >= 35) return '#FFB347';       // medium = orange
    return '#00C9A7';                     // low = teal
  });

  // ---- Build Chart.js Bar Chart ----

  // If a chart already exists (re-submission), destroy it first
  if (riskChartInstance) {
    riskChartInstance.destroy();
  }

  const ctx = document.getElementById('riskChart').getContext('2d');

  riskChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      // Display names on x-axis
      labels: diseases.map(d => diseaseLabels[d] || d),
      datasets: [{
        label: 'Risk %',
        data: percentages,
        backgroundColor: barColors,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            // Custom tooltip text
            label: ctx => ` ${ctx.raw}% risk`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: '#8eb8a8',
            callback: val => val + '%'
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: {
            color: '#8eb8a8',
            font: { size: 11 }
          },
          grid: { display: false }
        }
      }
    }
  });

  // ---- Build Risk Cards ----
  const cardsGrid = document.getElementById('riskCardsGrid');
  cardsGrid.innerHTML = ''; // clear old cards

  diseases.forEach(function (disease) {
    const pct = result.risks[disease];
    // Pick card color based on risk level
    const color = pct >= 60 ? '#FF6B6B' : pct >= 35 ? '#FFB347' : '#00C9A7';
    const label = pct >= 60 ? 'High Risk' : pct >= 35 ? 'Moderate Risk' : 'Low Risk';

    const card = document.createElement('div');
    card.className = 'risk-card';
    card.style.setProperty('--risk-color', color);

    card.innerHTML = `
      <div class="risk-card-disease">${diseaseLabels[disease] || disease}</div>
      <div class="risk-card-percent">${pct}%</div>
      <div class="risk-card-label">${label}</div>
    `;

    cardsGrid.appendChild(card);
  });

  // ---- Show Recommendations ----
  const recList = document.getElementById('recommendationsList');
  recList.innerHTML = '';

  result.recommendations.forEach(function (rec) {
    const li = document.createElement('li');
    li.textContent = rec;
    recList.appendChild(li);
  });

  // Save result globally so the PDF generator can access it
  window.lastResult = result;
}


/* ============================================================
  SECTION 11: PDF REPORT GENERATOR
  Uses jsPDF (loaded from CDN) to create a downloadable PDF.
  This runs entirely in the browser — no server needed.
============================================================ */

/**
 * Generates and downloads a PDF report using jsPDF.
 * Called when user clicks "Download PDF Report".
 */
function downloadPDF() {
  /*
    jsPDF is available as window.jspdf.jsPDF
    We create a new "document" object — think of it like a blank paper.
  */
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const result = window.lastResult;
  if (!result) {
    alert('No results to export. Please complete the assessment first.');
    return;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;

  // ---- COLOR PALETTE ----
  const teal   = [0, 201, 167];
  const navy   = [10, 22, 40];
  const dark   = [30, 58, 95];
  const white  = [255, 255, 255];
  const gray   = [130, 184, 168];

  // ---- PAGE BACKGROUND ----
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageWidth, 297, 'F'); // full A4 page fill

  // ---- HEADER BAND ----
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageWidth, 48, 'F');

  // Header accent line
  doc.setFillColor(...teal);
  doc.rect(0, 48, pageWidth, 2, 'F');

  // Logo / brand name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...teal);
  doc.text('MediScan', margin, 22);

  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text('Intelligent Health Risk Assessment', margin, 30);

  // Report title on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  doc.text('HEALTH RISK REPORT', pageWidth - margin, 22, { align: 'right' });

  // Generated date
  const genDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  doc.setFontSize(8);
  doc.text('Generated: ' + genDate, pageWidth - margin, 30, { align: 'right' });

  // ---- PATIENT INFO BOX ----
  let y = 60;

  doc.setFillColor(...dark);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 36, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...teal);
  doc.text('PATIENT INFORMATION', margin + 6, y + 8);

  // Get form values
  const name    = document.getElementById('fullName').value || '—';
  const age     = document.getElementById('age').value || '—';
  const gender  = document.getElementById('gender');
  const genderText = gender && gender.selectedIndex > 0 ? gender.options[gender.selectedIndex].text : '—';
  const bp      = document.getElementById('bloodPressure').value || '—';
  const sugar   = document.getElementById('bloodSugar').value || '—';
  const chol    = document.getElementById('cholesterol').value || '—';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...white);

  const infoCol1X = margin + 6;
  const infoCol2X = pageWidth / 2;

  doc.text(`Name:   ${name}`, infoCol1X, y + 17);
  doc.text(`Age:    ${age} years`, infoCol1X, y + 25);
  doc.text(`Sex:    ${genderText}`, infoCol2X, y + 17);

  doc.text(`BP: ${bp} mmHg  |  Sugar: ${sugar} mg/dL  |  Cholesterol: ${chol} mg/dL`, infoCol1X, y + 32);

  y += 48;

  // ---- SECTION TITLE: DISEASE RISK SCORES ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...teal);
  doc.text('Disease Risk Assessment', margin, y);

  y += 6;
  doc.setFillColor(...teal);
  doc.rect(margin, y, 40, 0.5, 'F');
  y += 8;

  // ---- RISK TABLE ----
  const diseaseLabels = {
    diabetes: 'Diabetes Mellitus',
    hypertension: 'Hypertension',
    heartDisease: 'Coronary Heart Disease',
    stroke: 'Stroke / TIA',
    kidneyDisease: 'Chronic Kidney Disease',
    liverDisease: 'Liver Disease',
    obesity: 'Obesity',
    lungDisease: 'Lung Disease',
    thyroidDisorder: 'Thyroid Disorder'
  };

  // Prepare table rows
  const tableRows = Object.entries(result.risks).map(([key, pct]) => {
    const level = pct >= 60 ? 'HIGH' : pct >= 35 ? 'MODERATE' : 'LOW';
    return [diseaseLabels[key] || key, pct + '%', level];
  });

  // Use autoTable plugin to draw the table
  doc.autoTable({
    startY: y,
    head: [['Disease / Condition', 'Risk Score', 'Level']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: dark,
      textColor: teal,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fillColor: [15, 33, 64],
      textColor: white,
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [20, 40, 75],
    },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    // Color the "Level" column cells based on risk
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 2) {
        const val = data.cell.text[0];
        if (val === 'HIGH')     data.cell.styles.textColor = [255, 107, 107];
        if (val === 'MODERATE') data.cell.styles.textColor = [255, 179, 71];
        if (val === 'LOW')      data.cell.styles.textColor = [0, 201, 167];
      }
    }
  });

  // ---- RECOMMENDATIONS ----
  y = doc.lastAutoTable.finalY + 14;

  // Check if we need a new page
  if (y > 230) {
    doc.addPage();
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 297, 'F');
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...teal);
  doc.text('Recommendations', margin, y);

  y += 6;
  doc.setFillColor(...teal);
  doc.rect(margin, y, 40, 0.5, 'F');
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);

  result.recommendations.forEach(function (rec) {
    // splitTextToSize wraps long text at the given width
    const lines = doc.splitTextToSize('→  ' + rec, pageWidth - margin * 2 - 6);
    doc.text(lines, margin + 3, y);
    y += lines.length * 5.5 + 2;

    if (y > 260) {
      doc.addPage();
      doc.setFillColor(...navy);
      doc.rect(0, 0, pageWidth, 297, 'F');
      y = 20;
    }
  });

  // ---- FOOTER ----
  const footerY = 285;
  doc.setFillColor(...dark);
  doc.rect(0, footerY - 6, pageWidth, 18, 'F');

  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(
    'DISCLAIMER: This report is generated by an AI placeholder engine for educational purposes only. It is NOT a medical diagnosis.',
    margin, footerY
  );
  doc.text(
    'Always consult a qualified healthcare professional. MediScan © 2025',
    margin, footerY + 5
  );

  // ---- SAVE THE PDF ----
  const filename = 'MediScan_Report_' + (name.replace(/\s+/g, '_') || 'Patient') + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
  doc.save(filename); // triggers browser download
}


/* ============================================================
  SECTION 12: RESET FORM
  Clears everything and takes user back to Step 1.
============================================================ */
function resetForm() {
  // Reset the form fields
  document.getElementById('assessmentForm').reset();

  // Clear uploaded files
  uploadedFiles = [];
  document.getElementById('fileList').innerHTML = '';

  // Reset to step 1
  currentStep = 1;

  // Hide all steps, show step 1
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step1').classList.add('active');

  // Reset progress bar
  document.querySelectorAll('.progress-step').forEach((s, i) => {
    s.classList.remove('active', 'completed');
    if (i === 0) s.classList.add('active');
  });
  updateProgressBar();

  // Hide results, show form
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('assessmentForm').style.display = 'block';

  // Scroll to assessment section
  document.getElementById('assessment').scrollIntoView({ behavior: 'smooth' });
}
