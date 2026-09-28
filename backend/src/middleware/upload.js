const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,zip,rar').split(',');
const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

// Blocked MIME types (executables, scripts)
const BLOCKED_MIME = [
  'application/x-msdownload', 'application/x-executable', 'application/x-sh',
  'text/x-shellscript', 'application/x-httpd-php', 'text/html', 'application/javascript',
];

// Magic bytes for common dangerous file types
const BLOCKED_MAGIC = [
  Buffer.from([0x4d, 0x5a]),             // PE executable (MZ)
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF binary
  Buffer.from([0x23, 0x21]),             // Shebang (#!)
];

function hasDangerousMagic(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return BLOCKED_MAGIC.some(magic => buf.slice(0, magic.length).equals(magic));
  } catch {
    return true; // deny on read error
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (!ALLOWED_TYPES.includes(ext)) return cb(new Error(`File type .${ext} not allowed`));
  if (BLOCKED_MIME.includes(file.mimetype)) return cb(new Error('File type not allowed'));
  cb(null, true);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE, files: 10 } });

// Post-upload magic-bytes check middleware
function validateUploadedFiles(req, res, next) {
  const files = req.files || [];
  for (const f of files) {
    if (hasDangerousMagic(f.path)) {
      // Delete the file and reject
      try { fs.unlinkSync(f.path); } catch {}
      return res.status(400).json({ success: false, message: 'Uploaded file contains disallowed content' });
    }
  }
  next();
}

module.exports = { upload, uploadDir, validateUploadedFiles };
