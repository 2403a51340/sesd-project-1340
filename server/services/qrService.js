const QRCode = require('qrcode');

/**
 * Generate a QR code containing the official verification URL
 * @param {string} certificateId 
 * @param {string} baseUrl
 * @returns {Promise<string>} Base64 Data URI
 */
const generateVerificationQr = async (certificateId, baseUrl) => {
  const host = baseUrl || process.env.BASE_URL || 'http://localhost:5000';
  const verificationUrl = `${host}/verify?id=${encodeURIComponent(certificateId)}`;

  try {
    const qrDataUri = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      color: {
        dark: '#0B1533', // Brand Primary Navy
        light: '#FFFFFF',
      },
      width: 250,
    });

    return {
      qrDataUri,
      verificationUrl,
    };
  } catch (error) {
    console.error('[QR Service Error]:', error);
    throw new Error('Failed to generate verification QR code');
  }
};

module.exports = {
  generateVerificationQr,
};
