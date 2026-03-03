/*

  WHY SERVER-SIDE PDF?
  The frontend already generates PDFs with jsPDF (client-side).
  This backend route provides a SERVER-SIDE alternative:
  - Useful for sending reports via email
  - Better for complex layouts
  - Required if you want to store reports in a database
  - Can be used if user's browser doesn't support jsPDF

  HOW IT WORKS:
  1. Frontend sends POST /api/report/pdf with patient data + risks
  2. Backend uses PDFKit to build the PDF in memory
  3. PDF is streamed back as a file download
  ============================================================
*/

const express = require('express');
const router  = express.Router();

/*
  PDFKit: A Node.js library for creating PDF files programmatically.
  Think of it like a canvas — you draw text, shapes, and images at exact coordinates.
  Coordinates are in POINTS (1 inch = 72 points).
*/
const PDFDocument = require('pdfkit');


// ============================================================
// POST /api/report/pdf
// Generates a server-side PDF report and returns it as a download.
// ============================================================

router.post('/pdf', function (req, res) {
  try {
    /*
      Extract data from the request body.
      The frontend sends this as JSON (application/json).
    */
    const { patientData, risks, recommendations, generatedAt } = req.body;

    if (!risks || typeof risks !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid risk data. Please provide risks object.'
      });
    }

    // Patient info with fallbacks
    const patientName   = (patientData && patientData.fullName) || 'Patient';
    const patientAge    = (patientData && patientData.age) || '—';
    const patientGender = (patientData && patientData.gender) || '—';
    const reportDate    = new Date(generatedAt || Date.now()).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // ---- SET UP HTTP RESPONSE HEADERS ----
    /*
      These headers tell the browser HOW to handle the response:
      - Content-Type: this is a PDF file
      - Content-Disposition: treat it as a download, with this filename
    */
    const filename = `MediScan_Report_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // ---- CREATE THE PDF DOCUMENT ----
    /*
      PDFDocument creates a new PDF.
      We pipe it directly to the HTTP response (res) — this streams the PDF
      to the browser as it's being created, without storing it on disk.
    */
    const doc = new PDFDocument({
      size: 'A4',          // standard A4 paper (595 x 842 points)
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'MediScan Health Risk Assessment Report',
        Author: 'MediScan AI System',
        Subject: `Health Risk Report for ${patientName}`,
        Keywords: 'medical, health, risk assessment, MediScan',
      }
    });

    // Pipe the PDF content to the response (streams bytes as they're generated)
    doc.pipe(res);


    // ============================================================
    // BUILD PDF CONTENT
    // PDFKit uses a coordinate system: (0,0) is top-left.
    // doc.x and doc.y track the current position.
    // ============================================================

    const pageWidth  = doc.page.width;    // 595 points for A4
    const leftMargin = 50;
    const rightMargin = pageWidth - 50;
    const contentWidth = rightMargin - leftMargin;


    // ---- HEADER BACKGROUND ----
    // Draw a dark rectangle as the header background
    doc.rect(0, 0, pageWidth, 110)
       .fill('#0a1628');  // navy color

    // Teal accent bar at the bottom of the header
    doc.rect(0, 108, pageWidth, 3)
       .fill('#00C9A7');


    // ---- BRAND LOGO TEXT ----
    doc.font('Helvetica-Bold')
       .fontSize(24)
       .fillColor('#00C9A7')
       .text('MediScan', leftMargin, 28, { continued: false });

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#8eb8a8')
       .text('Intelligent Health Risk Assessment', leftMargin, 56);


    // ---- REPORT TITLE (right-aligned) ----
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor('#8eb8a8')
       .text('HEALTH RISK REPORT', leftMargin, 28, { align: 'right', width: contentWidth });

    doc.font('Helvetica')
       .fontSize(9)
       .fillColor('#8eb8a8')
       .text(reportDate, leftMargin, 46, { align: 'right', width: contentWidth });


    // ---- PATIENT INFO SECTION ----
    let y = 130; // y position after the header

    // Patient info box background
    doc.rect(leftMargin, y, contentWidth, 70)
       .fill('#0f2140');

    // Box border
    doc.rect(leftMargin, y, 3, 70)
       .fill('#00C9A7');

    // Patient info text
    doc.font('Helvetica-Bold')
       .fontSize(8)
       .fillColor('#00C9A7')
       .text('PATIENT INFORMATION', leftMargin + 12, y + 10);

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#e8f4f1');

    // Patient name (large)
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .text(patientName, leftMargin + 12, y + 22);

    // Patient details in smaller text
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor('#8eb8a8')
       .text(
         `Age: ${patientAge}  |  Sex: ${patientGender}  |  BP: ${(patientData && patientData.bloodPressure) || '—'} mmHg  |  Blood Sugar: ${(patientData && patientData.bloodSugar) || '—'} mg/dL  |  Cholesterol: ${(patientData && patientData.cholesterol) || '—'} mg/dL`,
         leftMargin + 12, y + 42
       );

    y += 90;


    // ---- RISK SCORES TABLE ----
    doc.font('Helvetica-Bold')
       .fontSize(13)
       .fillColor('#00C9A7')
       .text('Disease Risk Assessment', leftMargin, y);

    // Underline
    y += 18;
    doc.rect(leftMargin, y, 120, 1).fill('#00C9A7');
    y += 10;

    // Disease display names
    const diseaseLabels = {
      diabetes:       'Diabetes Mellitus',
      hypertension:   'Hypertension',
      heartDisease:   'Coronary Heart Disease',
      stroke:         'Stroke / TIA',
      kidneyDisease:  'Chronic Kidney Disease',
      liverDisease:   'Liver Disease',
      obesity:        'Obesity',
      lungDisease:    'Lung Disease',
      thyroidDisorder:'Thyroid Disorder',
    };

    // Table header row
    doc.rect(leftMargin, y, contentWidth, 22).fill('#0f2140');

    doc.font('Helvetica-Bold')
       .fontSize(8)
       .fillColor('#00C9A7')
       .text('DISEASE / CONDITION', leftMargin + 8, y + 7)
       .text('RISK SCORE', leftMargin + 250, y + 7)
       .text('RISK LEVEL', leftMargin + 340, y + 7)
       .text('VISUAL', leftMargin + 430, y + 7);

    y += 22;

    // Table rows — one per disease
    let rowIndex = 0;
    Object.entries(risks).forEach(function ([disease, pct]) {
      const label = diseaseLabels[disease] || disease;

      // Alternate row background colors
      const rowBg = rowIndex % 2 === 0 ? '#0a1628' : '#0d1e3a';
      doc.rect(leftMargin, y, contentWidth, 22).fill(rowBg);

      // Determine risk level and color
      let levelText, levelColor;
      if (pct >= 60)      { levelText = 'HIGH';     levelColor = '#FF6B6B'; }
      else if (pct >= 35) { levelText = 'MODERATE'; levelColor = '#FFB347'; }
      else                { levelText = 'LOW';      levelColor = '#00C9A7'; }

      // Disease name
      doc.font('Helvetica')
         .fontSize(9)
         .fillColor('#e8f4f1')
         .text(label, leftMargin + 8, y + 7, { width: 200 });

      // Risk percentage
      doc.font('Helvetica-Bold')
         .fontSize(10)
         .fillColor(levelColor)
         .text(pct + '%', leftMargin + 250, y + 6);

      // Risk level badge
      doc.font('Helvetica-Bold')
         .fontSize(7.5)
         .fillColor(levelColor)
         .text(levelText, leftMargin + 340, y + 7);

      // Mini progress bar
      const barX = leftMargin + 425;
      const barY = y + 8;
      const barWidth = 100;
      const barHeight = 6;

      // Bar background
      doc.rect(barX, barY, barWidth, barHeight).fill('#1e3a5f');
      // Bar fill
      doc.rect(barX, barY, (pct / 100) * barWidth, barHeight).fill(levelColor);

      y += 22;
      rowIndex++;
    });

    y += 20;


    // ---- NEW PAGE CHECK ----
    // If we're near the bottom, add a new page
    if (y > 650) {
      doc.addPage();
      // Dark background on new page
      doc.rect(0, 0, pageWidth, doc.page.height).fill('#0a1628');
      y = 50;
    }


    // ---- RECOMMENDATIONS SECTION ----
    doc.font('Helvetica-Bold')
       .fontSize(13)
       .fillColor('#00C9A7')
       .text('Recommendations', leftMargin, y);

    y += 18;
    doc.rect(leftMargin, y, 100, 1).fill('#00C9A7');
    y += 12;

    const recs = recommendations || ['Consult a healthcare professional for a complete assessment.'];

    recs.forEach(function (rec) {
      // Check if we need a new page
      if (y > 720) {
        doc.addPage();
        doc.rect(0, 0, pageWidth, doc.page.height).fill('#0a1628');
        y = 50;
      }

      // Recommendation box
      doc.rect(leftMargin, y, contentWidth, 38).fill('#0f2140');
      doc.rect(leftMargin, y, 2, 38).fill('#00C9A7');

      doc.font('Helvetica')
         .fontSize(8.5)
         .fillColor('#8eb8a8')
         // splitTextToSize wraps text to fit the given width
         .text(rec, leftMargin + 10, y + 8, {
           width: contentWidth - 16,
           lineGap: 3,
         });

      y += 46;
    });

    y += 20;


    // ---- FOOTER ----
    const footerY = doc.page.height - 55;

    doc.rect(0, footerY, pageWidth, 55).fill('#0f2140');
    doc.rect(0, footerY, pageWidth, 1).fill('#00C9A7');

    doc.font('Helvetica')
       .fontSize(7.5)
       .fillColor('#4a7a6a')
       .text(
         'IMPORTANT DISCLAIMER: This report is generated by an AI-powered risk assessment system and is intended for informational\n' +
         'purposes ONLY. It does NOT constitute medical advice, diagnosis, or treatment. Always seek guidance from a qualified\n' +
         'healthcare professional. MediScan © 2025 — PBL Project for Educational Use.',
         leftMargin, footerY + 10,
         { width: contentWidth - 80, lineGap: 2 }
       );

    // Page number
    doc.font('Helvetica')
       .fontSize(8)
       .fillColor('#4a7a6a')
       .text('Page 1', rightMargin - 30, footerY + 20, { align: 'right' });


    // ---- FINALIZE AND SEND ----
    /*
      doc.end() tells PDFKit we're done adding content.
      Since we piped to res, this automatically sends the PDF to the browser.
    */
    doc.end();

    console.log(`📄 PDF report generated for: ${patientName}`);

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    // Can't send JSON if we already started the PDF stream
    // So just end the response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF report.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});


module.exports = router;
