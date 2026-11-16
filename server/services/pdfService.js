const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generate a PDF stream for a given certificate record
 * @param {Object} cert - Populated certificate document
 * @param {string} baseUrl
 * @returns {PDFKit.PDFDocument}
 */
const generateCertificatePdf = async (cert, baseUrl) => {
  const host = baseUrl || process.env.BASE_URL || 'http://localhost:5000';
  const verificationUrl = `${host}/verify?id=${encodeURIComponent(cert.certificateId)}`;

  // Generate QR buffer
  const qrBuffer = await QRCode.toBuffer(verificationUrl, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 1,
    color: {
      dark: '#0B1533',
      light: '#FFFFFF',
    },
    width: 140,
  });

  const doc = new PDFDocument({
    layout: 'landscape',
    size: 'A4', // 841.89 x 595.28 pt
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
  });

  const width = doc.page.width;
  const height = doc.page.height;

  // Background Fill
  doc.rect(0, 0, width, height).fill('#FBFDFF');

  // Outer Border (Navy)
  doc.rect(20, 20, width - 40, height - 40)
    .lineWidth(3)
    .stroke('#0B1533');

  // Inner Border (Accent Cyan/Gold)
  doc.rect(26, 26, width - 52, height - 52)
    .lineWidth(1)
    .stroke('#35C8E8');

  // Decorative corner accents
  const corners = [
    [32, 32],
    [width - 32, 32],
    [32, height - 32],
    [width - 32, height - 32],
  ];
  doc.fillColor('#315EFB');
  corners.forEach(([cx, cy]) => {
    doc.circle(cx, cy, 3).fill('#315EFB');
  });

  // Header Brand Tag
  doc
    .fillColor('#315EFB')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('CERTITRUST SECURE CREDENTIAL NETWORK', 40, 50, {
      align: 'center',
      characterSpacing: 2,
    });

  // Certificate Main Heading
  doc
    .moveDown(0.8)
    .fillColor('#0B1533')
    .fontSize(28)
    .font('Helvetica-Bold')
    .text(cert.certificateTitle ? cert.certificateTitle.toUpperCase() : 'CERTIFICATE OF ACHIEVEMENT', {
      align: 'center',
    });

  // Subtitle
  doc
    .moveDown(0.4)
    .fillColor('#73809A')
    .fontSize(12)
    .font('Helvetica')
    .text('This is to certify that the credential holder', {
      align: 'center',
    });

  // Student Name
  doc
    .moveDown(0.6)
    .fillColor('#101C3D')
    .fontSize(26)
    .font('Helvetica-Bold')
    .text(cert.studentName, {
      align: 'center',
    });

  // Student ID line
  doc
    .moveDown(0.2)
    .fillColor('#73809A')
    .fontSize(10)
    .font('Helvetica')
    .text(`Student ID: ${cert.studentId}`, {
      align: 'center',
    });

  // Course Description
  doc
    .moveDown(0.8)
    .fillColor('#17233F')
    .fontSize(13)
    .font('Helvetica')
    .text('has successfully completed all required coursework and evaluations for', {
      align: 'center',
    });

  // Course Name
  doc
    .moveDown(0.4)
    .fillColor('#315EFB')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(cert.courseName, {
      align: 'center',
    });

  // Grade / Honors if available
  if (cert.grade) {
    doc
      .moveDown(0.2)
      .fillColor('#16A34A')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Graduation Distinction / Grade: ${cert.grade}`, {
        align: 'center',
      });
  }

  // Issuing Institution
  const instName = cert.institutionId?.institutionName || 'Recognized Accredited Institution';
  doc
    .moveDown(0.8)
    .fillColor('#17233F')
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(instName, {
      align: 'center',
    });

  // Issue & Expiry Dates
  const issueFormatted = new Date(cert.issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const expiryFormatted = cert.expiryDate
    ? new Date(cert.expiryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Does Not Expire (Lifetime)';

  // Bottom Section: Details, Signatures & QR Code
  const bottomY = height - 145;

  // Bottom Left: Metadata Block
  doc
    .fillColor('#73809A')
    .fontSize(9)
    .font('Helvetica')
    .text('CERTIFICATE ID', 50, bottomY)
    .fillColor('#0B1533')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(cert.certificateId, 50, bottomY + 12)
    .fillColor('#73809A')
    .fontSize(9)
    .font('Helvetica')
    .text(`Issue Date: ${issueFormatted}`, 50, bottomY + 30)
    .text(`Validity: ${expiryFormatted}`, 50, bottomY + 44)
    .fillColor(cert.status === 'valid' ? '#16A34A' : '#DC2626')
    .font('Helvetica-Bold')
    .text(`Status: ${cert.status.toUpperCase()}`, 50, bottomY + 58);

  // Bottom Center: Signature / Seal
  const centerLineX = width / 2 - 80;
  doc
    .moveTo(centerLineX, bottomY + 45)
    .lineTo(centerLineX + 160, bottomY + 45)
    .lineWidth(1)
    .stroke('#CBD5E1');

  doc
    .fillColor('#17233F')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Authorized Academic Signatory', centerLineX, bottomY + 52, {
      width: 160,
      align: 'center',
    })
    .fillColor('#73809A')
    .font('Helvetica')
    .fontSize(8)
    .text('Registrar & Verification Authority', centerLineX, bottomY + 66, {
      width: 160,
      align: 'center',
    });

  // Bottom Right: QR Code
  doc.image(qrBuffer, width - 150, bottomY - 15, { width: 95, height: 95 });

  doc
    .fillColor('#73809A')
    .fontSize(8)
    .font('Helvetica')
    .text('Scan to Authenticate', width - 165, bottomY + 83, {
      width: 125,
      align: 'center',
    });

  // Security Footer Banner
  doc
    .rect(26, height - 38, width - 52, 12)
    .fill('#0B1533');

  doc
    .fillColor('#FFFFFF')
    .fontSize(7)
    .font('Helvetica')
    .text(
      `Official digital credential issued through CertiTrust. Authenticate at: ${verificationUrl}`,
      30,
      height - 35,
      { align: 'center' }
    );

  return doc;
};

module.exports = {
  generateCertificatePdf,
};
