const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const institutionRoutes = require('./routes/institutionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security HTTP headers with CSP configured for external CDNs (Fonts, Lucide, Chart.js, GSAP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
          'https://cdnjs.cloudflare.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'certitrust_secure_cookie_key'));

// Serve Static Frontend Assets
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/admin', adminRoutes);

// Clean URL routing for client pages
app.get('/verify', (req, res) => {
  res.sendFile(path.join(clientPath, 'verify.html'));
});

app.get('/result', (req, res) => {
  res.sendFile(path.join(clientPath, 'result.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(clientPath, 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(clientPath, 'register.html'));
});

app.get('/institution-dashboard', (req, res) => {
  res.sendFile(path.join(clientPath, 'institution-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(clientPath, 'admin-dashboard.html'));
});

app.get('/issue-certificate', (req, res) => {
  res.sendFile(path.join(clientPath, 'issue-certificate.html'));
});

app.get('/directory', (req, res) => {
  res.sendFile(path.join(clientPath, 'directory.html'));
});

app.get('/certificate-details', (req, res) => {
  res.sendFile(path.join(clientPath, 'certificate-details.html'));
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Central error handling
app.use(errorHandler);

module.exports = app;
