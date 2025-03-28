const express = require("express");
const cors = require("cors");
const csrf = require('csrf');
const cookieParser = require("cookie-parser");
const path = require("path");
const app = express();
require("dotenv").config();
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const { rateLimit } = require("express-rate-limit");

// XSS prevention middleware
const xssMiddleware = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
};

// Configure CORS with simpler configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : ['http://localhost:3000', 'http://localhost:3001'], // Allow client running on port 3001
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Parse cookies and JSON bodies
app.use(cookieParser());
app.use(express.json());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
}));
app.use(mongoSanitize());
app.use(xssMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Debug middleware for requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// List of routes that don't need CSRF protection
const csrfExcludedRoutes = [
  '/api/users/login',
  '/api/users/register',
  '/api/users/forgot-password',
  '/api/users/verify-otp',
  '/api/users/reset-password'
];

const csrfTokens = new csrf();

// Generate CSRF token endpoint
app.get('/csrf-token', (req, res) => {
  try {
    const secret = csrfTokens.secretSync();
    const token = csrfTokens.create(secret);

    // Store the secret in a secure cookie
    res.cookie('_csrf', secret, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({ csrfToken: token });
  } catch (error) {
    console.error('Failed to generate CSRF token:', error);
    res.status(500).json({ message: 'Failed to generate CSRF token.' });
  }
});

// Middleware to validate CSRF tokens
app.use((req, res, next) => {
  if (csrfExcludedRoutes.includes(req.path)) {
    return next();
  }

  const secret = req.cookies._csrf;
  const token = req.headers['x-csrf-token'];

  if (!secret || !token || !csrfTokens.verify(secret, token)) {
    return res.status(403).json({
      message: 'Invalid CSRF token. Please refresh the page and try again.',
      success: false,
    });
  }

  next();
});

// Import and use routes
const dbConfig = require("./config/dbConfig");
const usersRoute = require("./routes/usersRoute");
const examsRoute = require("./routes/examsRoute");
const reportsRoute = require("./routes/reportsRoute");

app.use("/api/users", usersRoute);
app.use("/api/exams", examsRoute);
app.use("/api/reports", reportsRoute);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build"), {
    setHeaders: (res, path) => {
      res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache static files for 1 year
    },
  }));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/build/index.html"));
  });
}

// Enhanced global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle CSRF token errors
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      message: 'Invalid CSRF token. Please refresh the page and try again.',
      success: false
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: err.message || 'Validation failed. Please check your input.',
      success: false,
      errors: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate entry found. Please check your input.',
        success: false
      });
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token. Please log in again.',
      success: false
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired. Please log in again.',
      success: false,
      tokenExpired: true
    });
  }

  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    success: false
  });
});

// Start server
const port = process.env.PORT || 5000;
const startServer = async () => {
  try {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
