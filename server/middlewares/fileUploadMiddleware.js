const multer = require("multer");

const storage = multer.memoryStorage();

// Allowed file types
const profilePicTypes = ["image/jpeg", "image/png"];
const resumeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];
const dailyUpdateTypes = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];
const taskAttachmentTypes = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

// Max sizes
const MAX_SIZE_PROFILE = 50 * 1024; // 50KB
const MAX_SIZE_RESUME = 200 * 1024; // 200KB
const MAX_SIZE_UPDATE_FILE = 5 * 1024 * 1024; // 5MB
const MAX_SIZE_TASK_ATTACHMENT = 5 * 1024 * 1024; // 5MB

// Generic file filter generator
const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file format. Allowed formats: ${allowedTypes.join(", ")}`),
      false
    );
  }
};

// Middleware creator
const createUploadMiddleware = (allowedTypes, maxSize) =>
  multer({
    storage,
    fileFilter: fileFilter(allowedTypes),
    limits: { fileSize: maxSize }
  });

// Upload middlewares
const uploadProfilePic = createUploadMiddleware(profilePicTypes, MAX_SIZE_PROFILE);
const uploadResume = createUploadMiddleware(resumeTypes, MAX_SIZE_RESUME);
const uploadDailyUpdateAttachment = createUploadMiddleware(dailyUpdateTypes, MAX_SIZE_UPDATE_FILE);
const uploadTaskAttachment = createUploadMiddleware(taskAttachmentTypes, MAX_SIZE_TASK_ATTACHMENT);

// Middleware wrappers
const uploadSingleProfilePic = (fieldName) => (req, res, next) => {
  uploadProfilePic.single(fieldName)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
};

const uploadSingleResume = (fieldName) => (req, res, next) => {
  uploadResume.single(fieldName)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
};

const uploadDailyUpdateFile = (fieldName) => (req, res, next) => {
  uploadDailyUpdateAttachment.single(fieldName)(req, res, (err) => {
    if (err) {
      console.error("❌ Multer Error (Daily Update):", err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
    console.log("✅ File received in upload middleware:", req.file?.originalname);
    next();
  });
};


const uploadSingleTaskAttachment = (fieldName) => (req, res, next) => {
  uploadTaskAttachment.single(fieldName)(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
};

// Validation middleware
const validateFile = (req, res, next) => {
  if (!req.file && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  next();
};

// Multer error handler
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File size exceeds the allowed limit"
        : err.message;
    return res.status(400).json({ success: false, message });
  }
  next(err);
};

module.exports = {
  uploadSingleProfilePic,
  uploadSingleResume,
  uploadDailyUpdateFile,
  uploadSingleTaskAttachment, // ✅ Added for task attachments
  validateFile,
  multerErrorHandler
};
