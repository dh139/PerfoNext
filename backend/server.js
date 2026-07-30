require('dotenv').config();

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET || !process.env.JWT_RESET_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET, JWT_REFRESH_SECRET, and JWT_RESET_SECRET environment variables must be defined!');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = async () => {
  const conn = require('./config/db');
  await conn();
};

const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();

// Connect to Database
connectDB();

app.disable('x-powered-by');

// Security Response Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());

// Serve static uploads with nosniff security header to prevent execution
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Logging middleware in dev
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// API Routes
app.use('/api', apiRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Requested resource not found.' });
});

// Global Error Handler - Prevents Information Leakage
app.use((err, req, res, next) => {
  // Log detailed stack trace server-side ONLY for debugging
  console.error('[SERVER ERROR HANDLER]', {
    timestamp: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  const isFormatError = err.name === 'MulterError' || (err.message && err.message.includes('Invalid file format'));
  const statusCode = err.statusCode || err.status || (isFormatError ? 400 : 500);
  
  res.status(statusCode).json({
    message: statusCode === 500 ? 'Internal server error. Please contact system support.' : err.message
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
