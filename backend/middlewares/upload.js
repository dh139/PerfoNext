const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name and strip any executable attributes
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `doc_${uniqueSuffix}${safeExt}`);
  }
});

// Strict MIME-type and extension validation
const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF, Word documents, and Images are permitted.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Magic bytes content signature verification middleware
const verifyFileMagicBytes = (req, res, next) => {
  if (!req.file) return next();

  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    let isValid = false;

    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
    if (ext === '.pdf' && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      isValid = true;
    }
    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    else if (ext === '.png' && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      isValid = true;
    }
    // JPEG magic bytes: 0xFF 0xD8 0xFF
    else if ((ext === '.jpg' || ext === '.jpeg') && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      isValid = true;
    }
    // DOC / DOCX (0xD0 0xCF 0x11 0xE0 or PK 0x50 0x4B 0x03 0x04)
    else if ((ext === '.doc' || ext === '.docx') &&
      ((buffer[0] === 0xD0 && buffer[1] === 0xCF) || (buffer[0] === 0x50 && buffer[1] === 0x4B))) {
      isValid = true;
    }

    if (!isValid) {
      // Remove invalid/malicious file immediately
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({
        message: 'File content validation failed. The file binary header does not match its claimed extension.'
      });
    }

    next();
  } catch (err) {
    console.error('Magic bytes verification error:', err);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.status(400).json({ message: 'Failed to validate uploaded file binary content.' });
  }
};

module.exports = {
  upload,
  verifyFileMagicBytes
};
