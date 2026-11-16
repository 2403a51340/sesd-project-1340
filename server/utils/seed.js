require('dotenv').config();
const mongoose = require('mongoose');
const { User, Institution, Certificate, VerificationLog, AuditLog } = require('../models');
const { generateVerificationQr } = require('../services/qrService');

const seedData = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certitrust';

  try {
    await mongoose.connect(uri);
    console.log('[Seed] Connected to MongoDB...');

    // Clear existing collections
    await User.deleteMany({});
    await Institution.deleteMany({});
    await Certificate.deleteMany({});
    await VerificationLog.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('[Seed] Cleared existing collections.');

    // 1. Create Platform Administrator
    const adminUser = await User.create({
      fullName: 'Chief Security Officer',
      email: 'admin@certitrust.io',
      passwordHash: 'Admin@123456',
      role: 'admin',
      emailVerified: true,
      isActive: true,
    });
    console.log('[Seed] Created Admin: admin@certitrust.io (Password: Admin@123456)');

    // 2. Create Approved Institution Owner
    const instUser1 = await User.create({
      fullName: 'Dr. Arthur Pendelton',
      email: 'registrar@tech-academy.edu',
      passwordHash: 'Admin@123456',
      role: 'institution',
      emailVerified: true,
      isActive: true,
    });

    const institution1 = await Institution.create({
      institutionName: 'Apex Institute of Technology & AI',
      institutionType: 'University',
      officialEmail: 'registrar@tech-academy.edu',
      phone: '+1 (555) 234-8900',
      website: 'https://apex-tech.edu',
      address: '742 Innovation Parkway, Cambridge, MA',
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: adminUser._id,
      ownerUserId: instUser1._id,
    });
    console.log('[Seed] Created Approved Institution: Apex Institute of Technology & AI (Login: registrar@tech-academy.edu / Admin@123456)');

    // 3. Create Pending Institution
    const instUser2 = await User.create({
      fullName: 'Prof. Sarah Jenkins',
      email: 'admissions@veritas-institute.org',
      passwordHash: 'Admin@123456',
      role: 'institution',
      emailVerified: true,
      isActive: true,
    });

    await Institution.create({
      institutionName: 'Veritas Global Research Academy',
      institutionType: 'Certification Body',
      officialEmail: 'admissions@veritas-institute.org',
      phone: '+1 (555) 876-1200',
      website: 'https://veritas-institute.org',
      address: '100 Academic Circle, Chicago, IL',
      approvalStatus: 'pending',
      ownerUserId: instUser2._id,
    });
    console.log('[Seed] Created Pending Institution: Veritas Global Research Academy');

    // 4. Create Student User
    const studentUser = await User.create({
      fullName: 'Alexander Wright',
      email: 'student@certitrust.io',
      passwordHash: 'Admin@123456',
      role: 'student',
      emailVerified: true,
      isActive: true,
    });
    console.log('[Seed] Created Demo Student: student@certitrust.io (Password: Admin@123456)');

    // 5. Seed Test Certificates
    const host = process.env.BASE_URL || 'http://localhost:5000';

    // Certificate 1: VALID
    const id1 = 'CT2026000001';
    const qr1 = await generateVerificationQr(id1, host);
    const cert1 = await Certificate.create({
      certificateId: id1,
      studentName: 'Alexander Wright',
      studentId: 'STU-2026-8812',
      studentEmail: 'alexander.wright@domain.com',
      institutionId: institution1._id,
      courseName: 'Advanced Full-Stack Systems & Distributed Cloud Architecture',
      certificateTitle: 'Master Certificate of Excellence',
      grade: 'Distinction (Grade A+)',
      issueDate: new Date('2026-01-15'),
      expiryDate: null, // Lifetime
      status: 'valid',
      issuedBy: instUser1._id,
      additionalInfo: 'Successfully defended capstone project in high-throughput microservices.',
      qrCodeDataUri: qr1.qrDataUri,
    });

    // Certificate 2: VALID
    const id2 = 'CT2026000002';
    const qr2 = await generateVerificationQr(id2, host);
    await Certificate.create({
      certificateId: id2,
      studentName: 'Elena Rostova',
      studentId: 'STU-2026-9043',
      studentEmail: 'elena.rostova@domain.com',
      institutionId: institution1._id,
      courseName: 'Cryptographic Security & Identity Infrastructure',
      certificateTitle: 'Professional Cybersecurity Credential',
      grade: 'First Class Honours',
      issueDate: new Date('2026-02-10'),
      expiryDate: new Date('2029-02-10'),
      status: 'valid',
      issuedBy: instUser1._id,
      additionalInfo: 'Certified in public-key cryptography and secure zero-trust network protocols.',
      qrCodeDataUri: qr2.qrDataUri,
    });

    // Certificate 3: REVOKED
    const id3 = 'CT2026000003';
    const qr3 = await generateVerificationQr(id3, host);
    await Certificate.create({
      certificateId: id3,
      studentName: 'Marcus Vance',
      studentId: 'STU-2025-4102',
      studentEmail: 'marcus.vance@domain.com',
      institutionId: institution1._id,
      courseName: 'Enterprise Cloud Security Compliance',
      certificateTitle: 'Certificate of Compliance',
      grade: 'Pass',
      issueDate: new Date('2025-11-01'),
      status: 'revoked',
      revokedAt: new Date('2026-01-20'),
      revocationReason: 'Formal revocation by institutional registrar: credential invalidated due to academic prerequisite discrepancy.',
      issuedBy: instUser1._id,
      qrCodeDataUri: qr3.qrDataUri,
    });

    // Certificate 4: EXPIRED
    const id4 = 'CT2026000004';
    const qr4 = await generateVerificationQr(id4, host);
    await Certificate.create({
      certificateId: id4,
      studentName: 'Sophia Patel',
      studentId: 'STU-2024-1188',
      studentEmail: 'sophia.patel@domain.com',
      institutionId: institution1._id,
      courseName: 'Annual Data Protection & GDPR Compliance Protocol',
      certificateTitle: 'Annual Regulatory Compliance Certificate',
      grade: 'Certified',
      issueDate: new Date('2024-05-10'),
      expiryDate: new Date('2025-05-10'), // Expired in 2025
      status: 'expired',
      issuedBy: instUser1._id,
      qrCodeDataUri: qr4.qrDataUri,
    });

    console.log('[Seed] Created Test Certificates:');
    console.log('   - CT2026000001 (VALID - Alexander Wright)');
    console.log('   - CT2026000002 (VALID - Elena Rostova)');
    console.log('   - CT2026000003 (REVOKED - Marcus Vance)');
    console.log('   - CT2026000004 (EXPIRED - Sophia Patel)');

    // 6. Verification Logs
    await VerificationLog.create([
      {
        certificateId: 'CT2026000001',
        result: 'VALID',
        institutionId: institution1._id,
        source: 'qr_scan',
        requestMetadata: { ipAddress: '198.51.100.4', userAgent: 'Mobile Safari/18.0' },
        timestamp: new Date(Date.now() - 3600 * 1000 * 2),
      },
      {
        certificateId: 'CT2026000002',
        result: 'VALID',
        institutionId: institution1._id,
        source: 'web_manual',
        requestMetadata: { ipAddress: '203.0.113.88', userAgent: 'Chrome/131.0' },
        timestamp: new Date(Date.now() - 3600 * 1000 * 6),
      },
      {
        certificateId: 'CT2026000003',
        result: 'REVOKED',
        institutionId: institution1._id,
        source: 'web_manual',
        requestMetadata: { ipAddress: '192.0.2.71', userAgent: 'Firefox/133.0' },
        timestamp: new Date(Date.now() - 3600 * 1000 * 12),
      },
      {
        certificateId: 'CT9999999999',
        result: 'NOT_FOUND',
        source: 'web_manual',
        requestMetadata: { ipAddress: '198.51.100.99', userAgent: 'Curl/8.4' },
        timestamp: new Date(Date.now() - 3600 * 1000 * 24),
      },
    ]);

    // 7. Audit Log
    await AuditLog.create([
      {
        userId: adminUser._id,
        userEmail: adminUser.email,
        action: 'SYSTEM_INITIALIZED',
        entityType: 'System',
        entityId: 'SYSTEM',
        details: { message: 'CertiTrust platform seed data successfully initialized.' },
        ipAddress: '127.0.0.1',
      },
    ]);

    console.log('[Seed] Database initialization and seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
