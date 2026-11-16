const { Certificate } = require('../models');

/**
 * Generates a unique, verifiable Certificate ID
 * Format: CT<YEAR><6-digit incremental or random-padded number> e.g. CT2026000123
 */
const generateCertificateId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `CT${currentYear}`;

  let isUnique = false;
  let certificateId = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    // Find the latest issued certificate for this year to sequence incrementally
    const count = await Certificate.countDocuments({
      certificateId: new RegExp(`^${prefix}`),
    });

    const nextNumber = String(count + attempts).padStart(6, '0');
    certificateId = `${prefix}${nextNumber}`;

    const existing = await Certificate.findOne({ certificateId });
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    // Fallback to high-entropy unique suffix
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    certificateId = `${prefix}${randomSuffix}`;
  }

  return certificateId;
};

module.exports = generateCertificateId;
