const express = require("express");
const router = express.Router();

const { 
  uploadFile, 
  generatePresignedDownload, 
  deleteFile,
  generatePresignedUrlForKey
} = require("../controllers/fileController");

const { 
  uploadSingleProfilePic, 
  uploadSingleResume, 
  validateFile 
} = require("../middlewares/fileUploadMiddleware");

const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");
const { errorHandler } = require("../middlewares/errorMiddleware");

// ✅ Protect all routes
router.use(verifyToken);

/**
 * ✅ Upload Staff Profile Picture (Admin Only)
 * → Uses multer: uploadSingleProfilePic
 */
router.post(
  "/upload/profile-pic",
  requireAdmin,
  uploadSingleProfilePic,
  validateFile,
  uploadFile
);

/**
 * ✅ Upload Staff Resume (Admin Only)
 * → Uses multer: uploadSingleResume
 */
router.post(
  "/upload/resume",
  requireAdmin,
  uploadSingleResume,
  validateFile,
  uploadFile
);

/**
 * ✅ Upload General Project/Task Attachments
 * → Admin or Staff (used in task uploads, comments, etc.)
 */
router.post(
  "/upload",
  validateFile,
  uploadFile
);

/**
 * ✅ Generate Pre-Signed Download URL by Filename
 * → For files saved in DB (MongoDB `File` collection)
 */
router.get(
  "/download/:filename",
  generatePresignedDownload
);

/**
 * ✅ Generate Pre-Signed Download URL by Raw S3 Key
 * → For special uploads: daily comments, reviews, etc.
 */
router.get(
  "/presigned-url",
  generatePresignedUrlForKey
);

/**
 * ✅ Delete a File by Filename
 * → Only admin or original uploader can delete
 */
router.delete(
  "/:filename",
  deleteFile
);

// ✅ Global Error Handler
router.use(errorHandler);

module.exports = router;
