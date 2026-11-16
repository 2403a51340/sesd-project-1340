# CERTITRUST
## Premium Digital Certificate Verification & Authentication Platform

> *"Verify Every Achievement. Trust Every Credential."*  
> **Brand Identity:** CertiTrust  
> **Tagline:** *"Digital Credentials. Verified Trust."*

---

## 1. Executive Product Overview

**CertiTrust** is an enterprise-grade digital credential verification and authentication SaaS ecosystem designed to eradicate academic and professional credential fraud. It seamlessly connects four key stakeholders:
1. **Accredited Educational Institutions & Issuers**
2. **Students & Credential Recipients**
3. **Employers, Verifiers & Background-check Agencies**
4. **Platform Governance Administrators & Compliance Officers**

The platform provides a cryptographic cataloguing ledger where institutions issue verified credentials with dynamic QR codes and anti-forgery vector PDFs. Public verifiers authenticate certificates in under 120ms without revealing sensitive Personally Identifiable Information (PII).

---

## 2. Technology Stack

- **Frontend:**
  - Semantic HTML5, Modular CSS3 (Design Tokens, Component Library, Responsive Grid)
  - Pure Vanilla JavaScript (Modern ES6+, Fetch API with session credentials)
  - **Typography:** Manrope (Display/Headings) & Inter (UI/Body)
  - **Visual Icons:** Lucide Icon Engine
  - **Analytics Dashboards:** Chart.js
- **Backend:**
  - Node.js (v18+) & Express.js
  - RESTful API Architecture with controllers and modular service abstractions
- **Database:**
  - MongoDB with Mongoose ODM (Schemas, Strict Validation, Compound Indexes)
- **Security & Cryptography:**
  - Salted `bcryptjs` password hashing
  - Signed JWT tokens delivered via secure HTTP-Only `SameSite=Lax` cookies
  - `helmet` security headers with customized Content Security Policies (CSP)
  - `express-rate-limit` anti-scraping and brute-force protection
  - Automated collision detection for duplicate ID prevention
- **Digital Credential Features:**
  - Dynamic high-resolution QR code generator (`qrcode`)
  - Vector PDF Certificate generator with anti-tamper security borders (`pdfkit`)

---

## 3. Project Directory Architecture

```
CertiTrust/
├── client/                               # Enterprise Frontend Client
│   ├── index.html                        # Page 1: Premium SaaS Landing Page
│   ├── verify.html                       # Page 2 & 3: Interactive Verifier & Status Radar
│   ├── result.html                       # Page 3: Dedicated Verification Result View
│   ├── login.html                        # Page 5: Authentication Portal
│   ├── register.html                     # Page 4: Institution Registration & Vetting
│   ├── institution-dashboard.html        # Page 6: Institution Dashboard & Analytics
│   ├── issue-certificate.html            # Page 7: Certificate Issuance with Live Vector Preview
│   ├── directory.html                    # Page 9: Public Ledger & Directory
│   ├── certificate-details.html          # Page 10: Official Credential Detail & PDF Action
│   ├── admin-dashboard.html              # Page 11: Governance, Vetting & Security Audit
│   │
│   ├── css/
│   │   ├── tokens.css                    # Design Tokens (Colors, Elevation, Radii)
│   │   ├── global.css                    # Global Reset, Typography & Motion Keyframes
│   │   ├── components.css                # Reusable Cards, Buttons, Status Pills, Modals
│   │   ├── landing.css                   # Landing Sections, Hero, Features, FAQs
│   │   ├── dashboard.css                 # Sidebar, Topbar, Metric Cards, Chart Grid
│   │   └── responsive.css               # Breakpoints (1440px, 1024px, 768px, 390px)
│   │
│   └── js/
│       ├── api.js                        # Unified API Client Wrapper
│       ├── main.js                       # Navbar, Toast Notifications & Counters
│       ├── auth.js                       # Authentication, Session & Quick Demos
│       ├── verification.js               # Verification Engine & Radar States
│       ├── institution.js                # Institution Metrics, Charts, Issuance Sync
│       └── admin.js                      # Admin Vetting, Logs, Suspicious IP Tracker
│
├── server/                               # Production Express & Node.js Engine
│   ├── config/
│   │   └── db.js                         # Robust MongoDB Connection Manager
│   ├── controllers/
│   │   ├── authController.js             # Authentication, JWT, Reset Handlers
│   │   ├── verificationController.js     # Verification & Public Registry Controllers
│   │   ├── institutionController.js      # Issuance, Metrics & Revocation
│   │   └── adminController.js            # Vetting, Governance & Audit Queries
│   ├── middleware/
│   │   ├── auth.js                       # JWT, RBAC & Institution Approval Guards
│   │   └── errorHandler.js               # Central Mongoose & API Error Formatter
│   ├── models/
│   │   ├── User.js                       # Admin, Institution & Student Identities
│   │   ├── Institution.js                # Vetting Lifecycle & Profiles
│   │   ├── Certificate.js                # Cryptographic Credentials & Indexes
│   │   ├── VerificationLog.js            # Multi-point Lookup Audit Records
│   │   ├── AuditLog.js                   # Platform Governance Activity Ledger
│   │   └── index.js                      # Centralized Model Registry
│   ├── routes/
│   │   ├── authRoutes.js                 # Authentication Endpoints
│   │   ├── verificationRoutes.js         # Public Verification Endpoints
│   │   ├── certificateRoutes.js          # Public Certificate Records & PDF Engine
│   │   ├── institutionRoutes.js          # Issuer Protected Operations
│   │   └── adminRoutes.js                # Platform Superuser Governance
│   ├── services/
│   │   ├── verificationService.js        # Strict Status Hierarchy Evaluation
│   │   ├── qrService.js                  # Dynamic QR Verification Link Matrix
│   │   └── pdfService.js                 # High-Resolution Vector PDF Generator
│   ├── utils/
│   │   ├── generateCertificateId.js      # Unique Deterministic ID Algorithm
│   │   ├── auditLogger.js                # Security Event Logger
│   │   └── seed.js                       # Full-Spectrum Database Seeder
│   ├── tests/
│   │   └── api.test.js                   # Automated Integration Test Suite
│   ├── app.js                            # Express Configuration & Middleware
│   └── server.js                         # Production HTTP Listener Entrypoint
│
├── .env.example                          # Environment Variables Blueprint
├── .gitignore                            # Production Git Exclusion Rules
├── package.json                          # Package Manifest & Scripts
└── README.md                             # Comprehensive Platform Documentation
```

---

## 4. Setup & Installation Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Either local MongoDB Community Server (default `mongodb://127.0.0.1:27017/certitrust`) or MongoDB Atlas URI.

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Configuration
Copy the provided `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```ini
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000
MONGODB_URI=mongodb://127.0.0.1:27017/certitrust
JWT_SECRET=certitrust_super_secret_jwt_key_2026_production_grade_random_string_998877
JWT_EXPIRES_IN=7d
COOKIE_SECRET=certitrust_secure_cookie_signing_secret_key_112233
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
```

### Step 3: Populate Database with Seed Demo Records
Run the automated seed script to populate test institutions, certificates across all status categories, and verification audit logs:
```bash
npm run seed
```

### Step 4: Run the Test Suite
Execute the automated test suite covering verification logic, authentication, and directory queries:
```bash
npm test
```

### Step 5: Start the Server
```bash
# Start production server
npm start

# Or start with live reload in development
npm run dev
```
Open **`http://localhost:5000`** in any web browser.

---

## 5. Ready-to-Test Credentials & Certificate Records

The database seeder pre-populates the following accounts and certificates for testing:

### Demo User Accounts
| Role | Email | Password | Details |
|---|---|---|---|
| **Platform Administrator** | `admin@certitrust.io` | `Admin@123456` | Full superuser access to approval queues, audit trails, and security ledgers |
| **Approved Institution** | `registrar@tech-academy.edu` | `Admin@123456` | Apex Institute of Technology & AI (can issue credentials) |
| **Pending Institution** | `admissions@veritas-institute.org` | `Admin@123456` | Veritas Global Research Academy (pending admin approval) |
| **Demo Student** | `student@certitrust.io` | `Admin@123456` | Individual recipient account |

> **Convenience Feature:** The `/login` page includes **One-Click Demo Fill buttons** that automatically populate these credentials.

### Test Certificate IDs
Test these directly on the homepage search bar or `/verify`:
| Certificate ID | Status Outcome | Recipient | Key Test Feature |
|---|---|---|---|
| **`CT2026000001`** | **VALID** | Alexander Wright | Active lifetime credential with PDF download & live verification |
| **`CT2026000002`** | **VALID** | Elena Rostova | Active credential with future expiration date (2029) |
| **`CT2026000003`** | **REVOKED** | Marcus Vance | Formally revoked record with institutional revocation notice |
| **`CT2026000004`** | **EXPIRED** | Sophia Patel | Expired certification (validity period concluded in 2025) |
| **`CT9999999999`** | **NOT FOUND** | Non-existent | Fails authentication, logs failed lookup attempt |

---

## 6. Core Platform Features & User Journeys

### 1. Instant Certificate Verification (`/verify`)
- Enter an ID or scan a QR code.
- Displays realistic scanning radar animation during processing.
- Renders distinct status states:
  - **VALID** (Green): Details, authorized issuer name, qualification, and PDF download.
  - **REVOKED** (Amber): Revocation date, registrar justification, and warning notices.
  - **EXPIRED** (Orange): Displays completion date and elapsed expiration terms.
  - **INVALID / NOT FOUND** (Red): Unregistered or malformed identifier.
  - **CONFLICT** (Purple): Conflicting database records flagged for security review.

### 2. Live-Sync Certificate Issuance (`/issue-certificate`)
- Approved institutions enter recipient name, student ID, course, and conferral date.
- The **Live Certificate Preview** updates in real-time on the right side of the screen as you type.
- On submission, an auto-incrementing unique ID (e.g., `CT2026000005`) and QR code data URI are generated.
- Modal appears with immediate vector PDF download and copyable verification link.

### 3. Institution Dashboard (`/institution-dashboard`)
- Real-time MongoDB metrics: Total Issued, Active, Revoked, and Total Verification Inquiries.
- Interactive Chart.js charts: 6-month issuance trajectory and status distribution doughnut.
- Searchable and filterable registry table with one-click revocation modal.

### 4. Administrator Portal (`/admin-dashboard`)
- Global system health overview.
- **Institutional Vetting:** 1-click Approve, Reject (with reason dialog), or Suspend actions.
- **Verification Logs:** Live feed tracking IP addresses, user agents, and outcomes.
- **Suspicious Activity:** Detects collision attempts and repeatedly failing IPs.
- **Audit Ledger:** Records every administrative action.

---

## 7. REST API Documentation

### Public Endpoints
- `POST /api/verification/verify` – Query credential status (`{ certificateId: "..." }`)
- `GET /api/verification/recent` – Public non-sensitive recent verification feed
- `GET /api/certificates` – Paginated public directory with search, institution, and status filters
- `GET /api/certificates/:certificateId` – Sanitized public certificate record
- `GET /api/certificates/:certificateId/pdf` – Stream print-ready vector PDF certificate

### Authentication Endpoints
- `POST /api/auth/register` – Register User or Educational Institution (sets pending status)
- `POST /api/auth/login` – Authenticate user, issue JWT cookie
- `POST /api/auth/logout` – Clear authentication cookie
- `GET /api/auth/me` – Retrieve current authenticated user session
- `POST /api/auth/forgot-password` – Generate password reset token
- `POST /api/auth/reset-password` – Complete password reset

### Institution Endpoints (Protected by JWT & Institution Role)
- `GET /api/institution/dashboard` – Real-time aggregated statistics and chart data
- `POST /api/institution/certificates` – Issue new credential (strictly requires `approvalStatus: "approved"`)
- `GET /api/institution/certificates` – Paginated list of issued credentials with filters
- `GET /api/institution/certificates/:id` – Detailed credential record
- `POST /api/institution/certificates/:id/revoke-request` – Revoke certificate with formal justification
- `GET /api/institution/verification-history` – Inquiries received by this institution's credentials

### Admin Endpoints (Protected by JWT & Admin Role)
- `GET /api/admin/dashboard` – Global platform metrics and pending application count
- `GET /api/admin/institutions` – List all institutions with status filters
- `PATCH /api/admin/institutions/:id/approve` – Approve institution for credential issuance
- `PATCH /api/admin/institutions/:id/reject` – Reject institutional application with reason
- `PATCH /api/admin/institutions/:id/suspend` – Suspend institutional issuance privileges
- `GET /api/admin/verification-logs` – Paginated inspection of all verification lookups
- `GET /api/admin/suspicious-activity` – Collisions and high-frequency failure sources
- `GET /api/admin/audit-logs` – Platform-wide administrative activity trail

---

## 8. Security Architecture & Privacy Safeguards

1. **Authentication:**
   Passwords hashed using salted `bcryptjs` (cost factor 10). JWT tokens are delivered through HTTP-Only cookies with `SameSite=Lax` protection against XSS and CSRF token interception.
2. **Authorization Guards:**
   Role-Based Access Control (RBAC) middleware strictly checks user roles (`admin`, `institution`, `student`) on the server. Institution issuance is additionally guarded by `requireApprovedInstitution`.
3. **Rate Limiting:**
   Brute-force protection limits authentication requests to 20 per 15 minutes, and verification lookups to 60 per minute per IP.
4. **Data Privacy (PII Masking):**
   Public directory and verification endpoints strip private student emails and phone numbers, masking names where appropriate to respect privacy.
5. **Conflict Resolution:**
   If duplicate certificate IDs are detected, the system immediately returns a `CONFLICT` status and records a high-priority security event in the audit log for human review.

---

## 9. License

This project is created for **CertiTrust Technologies** as an enterprise-grade digital credential authentication SaaS product.
