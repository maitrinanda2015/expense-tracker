const multer = require('multer');
const { ATTACHMENT_MAX_BYTES, ATTACHMENT_MIME_TYPES } = require('../constants');
const { AppError } = require('../utils/AppError');

// Files are kept in memory and stored in MongoDB, so attachments survive
// redeploys on hosts with ephemeral disks (Render, Railway).
const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (!ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
      return cb(new AppError(400, 'Attachment must be a PNG, JPEG, WEBP image or a PDF', 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
}).single('file');

module.exports = { uploadAttachment };
