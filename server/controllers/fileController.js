const fileService = require("../services/fileService");
const File = require("../models/File");
const Task = require("../models/Task");
const Project = require("../models/Project");
const { URL } = require("url");

/**
 * ✅ Upload a file to AWS S3 (Profile Pic / Resume / Project / Task file)
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { projectId, taskId, fileType } = req.body;
    const staffId = req.user.id;
    const companyId = req.user.companyId;

    if (fileType && !["profilePic", "resume"].includes(fileType)) {
      return res.status(400).json({ success: false, message: "Invalid file type provided" });
    }

    if (projectId && !(await Project.exists({ _id: projectId, companyId }))) {
      return res.status(400).json({ success: false, message: "Invalid or unauthorized project ID" });
    }

    if (taskId && !(await Task.exists({ _id: taskId, companyId }))) {
      return res.status(400).json({ success: false, message: "Invalid or unauthorized task ID" });
    }

    const { fileUrl, signedUrl } = await fileService.uploadFile(req.file, {
      fileType,
      staffId,
      projectId,
      taskId,
      companyId,
    });

    if (!fileType) {
      const fileRecord = await File.create({
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        fileURL: fileUrl,
        uploadedBy: staffId,
        project: projectId || null,
        task: taskId || null,
        companyId,
      });

      return res.status(201).json({
        success: true,
        message: "Project/Task file uploaded successfully",
        data: fileRecord,
        signedUrl,
      });
    }

    return res.status(201).json({
      success: true,
      message: `${fileType} uploaded successfully`,
      fileUrl,
      signedUrl,
    });

  } catch (error) {
    console.error("❌ File Upload Error:", error.message);
    res.status(500).json({ success: false, message: "File upload failed", error: error.message });
  }
};

/**
 * ✅ Generate a Pre-signed URL for Download (from DB)
 */
const generatePresignedDownload = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ success: false, message: "Filename is required" });
    }

    const fileRecord = await File.findOne({ fileName: filename });
    if (!fileRecord) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    if (
      req.user.companyId.toString() !== fileRecord.companyId?.toString() ||
      (req.user.role !== "admin" && req.user.id !== fileRecord.uploadedBy.toString())
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized access to file" });
    }

    const fileUrl = new URL(fileRecord.fileURL);
    const fileKey = decodeURIComponent(fileUrl.pathname.substring(1));
    const signedUrl = await fileService.getFileUrl(fileKey, { forceDownload: true });

    return res.status(200).json({ success: true, signedUrl });
  } catch (error) {
    console.error("❌ Presigned URL Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to generate download link", error: error.message });
  }
};

/**
 * ✅ Generate a Pre-signed URL for Direct Key-based File Access
 */
const generatePresignedUrlForKey = async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ success: false, message: "File key is required" });
    }

    const decodedKey = decodeURIComponent(key);
    const signedUrl = await fileService.getFileUrl(decodedKey, { forceDownload: true });

    return res.status(200).json({ success: true, url: signedUrl });
  } catch (error) {
    console.error("❌ Presigned URL for key Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to generate signed URL", error: error.message });
  }
};

/**
 * ✅ Delete a file using MongoDB filename-based lookup
 */
const deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ success: false, message: "Filename is required" });
    }

    const fileRecord = await File.findOne({ fileName: filename });
    if (!fileRecord) {
      return res.status(404).json({ success: false, message: "File record not found" });
    }

    if (
      req.user.companyId.toString() !== fileRecord.companyId?.toString() ||
      (req.user.role !== "admin" && req.user.id !== fileRecord.uploadedBy.toString())
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this file" });
    }

    const fileUrl = new URL(fileRecord.fileURL);
    const fileKey = decodeURIComponent(fileUrl.pathname.substring(1));

    await fileService.deleteFile(fileKey);
    await File.deleteOne({ _id: fileRecord._id });

    return res.status(200).json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("❌ File Deletion Error:", error.message);
    res.status(500).json({ success: false, message: "File deletion failed", error: error.message });
  }
};

/**
 * ✅ Delete file directly by fileKey (used for profilePic/resume)
 */
const deleteFileByKey = async (req, res) => {
  try {
    const { fileKey } = req.body;
    if (!fileKey) {
      return res.status(400).json({ success: false, message: "fileKey is required" });
    }

    await fileService.deleteFile(fileKey);
    return res.status(200).json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("❌ Direct fileKey delete error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete file", error: error.message });
  }
};

module.exports = {
  uploadFile,
  generatePresignedDownload,
  generatePresignedUrlForKey,
  deleteFile,
  deleteFileByKey,
};
