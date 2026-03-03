# 🏥 MediScan — Medical Risk Assessment Website

> A full-stack PBL (Project-Based Learning) medical website with intelligent disease risk assessment, file upload, and downloadable PDF reports.

---

## 📁 Project Structure

```
medical-app/
│
├── frontend/                  ← The website (runs in browser)
│   ├── index.html             ← Main HTML page (structure)
│   ├── style.css              ← All visual styling
│   └── main.js                ← All interactivity & PDF generation
│
└── backend/                   ← The server (runs in terminal)
    ├── server.js              ← Entry point — starts the server
    ├── package.json           ← Project config & dependencies
    ├── uploads/               ← Where uploaded files go (auto-created)
    └── routes/
        ├── analyze.js         ← POST /api/analyze  (risk engine)
        └── report.js          ← POST /api/report/pdf (server PDF)
```

---

## 🚀 How to Run

### Step 1 — Open the Frontend
Just open `frontend/index.html` in any browser.
- Double-click the file, OR
- Use VS Code Live Server (Right-click → Open with Live Server)

The website works **without** the backend — it uses placeholder risk data if the backend is offline.

---

### Step 2 — Run the Backend (Optional but recommended)

You need **Node.js** installed. Download from https://nodejs.org

```bash
# Navigate to the backend folder
cd backend

# Install all required packages (only needed once)
npm install

# Start the development server (auto-restarts on file changes)
npm run dev

# OR: Start the production server
npm start
```

Server will start at: **http://localhost:5000**

You can verify it's running by visiting: http://localhost:5000

---

## 🔌 Plugging in Your ML / LLM Models
The code has been written with clear hook points. Search for **"🔌 ML HOOK"** comments in:

### `backend/routes/analyze.js`

| Function | What to Replace With |
|---|---|
| `processUnstructuredText()` | NLP model (BERT, spaCy, GPT, Claude API) |
| `processUploadedFiles()` | Computer Vision model (CheXNet, custom CNN) |
| `computeRiskScores()` | Trained ML model (scikit-learn, XGBoost, TensorFlow) |
| `generateRecommendations()` | LLM API call (OpenAI GPT, Claude, Gemini) |

### Example: Calling a Python ML Service

```javascript
// In computeRiskScores(), replace the rule-based logic with:
const mlResponse = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ features: structuredFeatures })
});
const predictions = await mlResponse.json();
return predictions.risks;
```

### Example: Calling Claude API for Recommendations

```javascript
// In generateRecommendations(), add:
const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Generate 5 personalized health recommendations for a patient with these risks: ${JSON.stringify(risks)}`
    }]
  })
});
const data = await claudeResponse.json();
return data.content[0].text.split('\n').filter(l => l.trim());
```

---

## 🌐 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/` | Server status check |
| GET | `/api/health` | Health check with uptime |
| POST | `/api/analyze` | Submit patient data → get risk scores |
| POST | `/api/report/pdf` | Generate server-side PDF report |

### POST `/api/analyze` — Request Body

Sent as `multipart/form-data`:

```
patientData (JSON string):
{
  "fullName": "Ahmed Al-Rashid",
  "age": 45,
  "gender": "male",
  "height": 175,
  "weight": 82,
  "smoking": "former",
  "alcohol": "occasional",
  "exercise": "moderate",
  "bloodPressure": 128,
  "bloodSugar": 105,
  "cholesterol": 215,
  "familyHistory": ["diabetes", "hypertension"],
  "symptoms": "occasional chest tightness and fatigue after exercise"
}

files: [file1.jpg, file2.pdf, ...]  (optional)
```

### POST `/api/analyze` — Response

```json
{
  "success": true,
  "patientName": "Ahmed Al-Rashid",
  "generatedAt": "2025-10-15T10:30:00.000Z",
  "risks": {
    "diabetes": 28,
    "hypertension": 34,
    "heartDisease": 42,
    "stroke": 22,
    "kidneyDisease": 14,
    "liverDisease": 8,
    "obesity": 18,
    "lungDisease": 12,
    "thyroidDisorder": 10
  },
  "recommendations": [
    "❤️ Cardiac (MODERATE): Annual cholesterol panel...",
    "🩺 Blood Pressure (MODERATE): Check BP monthly..."
  ],
  "metadata": {
    "filesProcessed": 1,
    "symptomsDetected": ["chest pain", "fatigue"],
    "modelVersion": "placeholder-v1.0"
  }
}
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, JavaScript | Website structure & styling |
| Charts | Chart.js | Risk visualization bar chart |
| PDF (client) | jsPDF + autotable | Browser-side PDF generation |
| Backend | Node.js + Express | API server |
| File Upload | Multer | Multipart form handling |
| PDF (server) | PDFKit | Server-side PDF generation |

---

## 🎓 Learning Notes (For Beginners)

### What is "Structured Data"?
Data in a fixed format with known fields:
- Age = 35 (number)
- Blood pressure = 130 (number)
- Smoking = "current_heavy" (category)

Machines can process this directly.

### What is "Unstructured Data"?
Free-form text or images:
- "Patient reports chest pain and difficulty breathing after exercise"
- An X-ray image

Requires NLP (text) or Computer Vision (images) to extract meaning.

### What is an API?
An **Application Programming Interface** — a way for two programs to talk.
Our frontend (browser) talks to our backend (server) via HTTP API calls.

### What is REST?
**Representational State Transfer** — the most common style for APIs.
Uses HTTP verbs: GET (read), POST (create), PUT (update), DELETE (remove).

---

## ⚕️ Medical Disclaimer

This website is a **PBL (Project-Based Learning) educational project**.

- It is NOT a medical device
- Risk scores use placeholder/rule-based logic, NOT trained clinical models
- Results should NEVER be used for actual medical decisions
- Always consult a licensed healthcare professional

---

## 📝 Future Enhancements (Plug-in Points)

- [ ] Connect Python ML model (XGBoost/Random Forest) for risk prediction
- [ ] Integrate LLM (Claude/GPT) for personalized recommendation generation
- [ ] Add DICOM file support with medical imaging viewer
- [ ] Add OCR for extracting values from PDF lab reports
- [ ] Connect database (MongoDB/PostgreSQL) to store patient history
- [ ] Add user authentication (JWT tokens)
- [ ] Deploy backend to cloud (Railway, Render, AWS)
- [ ] Add multi-language support (Arabic, French, etc.)
