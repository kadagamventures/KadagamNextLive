const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");
const mime = require("mime-types");
const path = require("path");
require("dotenv").config();

const File = require("../models/File");
const Task = require("../models/Task");
const Project = require("../models/Project");

// ✅ S3 Setup
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
if (!BUCKET_NAME) throw new Error("❌ AWS_S3_BUCKET_NAME is missing!");

// ✅ Allowed MIME Types
const allowedTypes = {
  profile: ["image/jpeg", "image/png"],
  resume: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  report: ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  projectFiles: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
  ],
};

// ✅ Multer Config
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allAllowed = [
      ...allowedTypes.profile,
      ...allowedTypes.resume,
      ...allowedTypes.report,
      ...allowedTypes.projectFiles,
    ];
    if (allAllowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Allowed: JPEG, PNG, PDF, DOC, DOCX, XLSX"), false);
    }
  },
});

// ✅ Upload General File (Profile/Resume/Project/Task)
const uploadFile = async (file, { fileType, staffId, projectId, taskId, companyId }) => {
  if (!file) throw new Error("❌ No file provided");

  let fileKey;
  let metadata = {};

  if (fileType === "profilePic") {
    fileKey = `staff-profile-pictures/company_${companyId}/${staffId}/profile.jpg`;
  } else if (fileType === "resume") {
    fileKey = `staff-resumes/company_${companyId}/${staffId}/resume.pdf`;
  } else if (projectId || taskId) {
    if (projectId && !(await Project.findOne({ _id: projectId, companyId })))
      throw new Error("❌ Invalid or unauthorized project ID");
    if (taskId && !(await Task.findOne({ _id: taskId, companyId })))
      throw new Error("❌ Invalid or unauthorized task ID");

    fileKey = `project-files/company_${companyId}/${projectId || "general"}/${Date.now()}-${file.originalname}`;
    metadata = {
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      fileURL: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
      uploadedBy: staffId,
      project: projectId || null,
      task: taskId || null,
      companyId,
    };
  } else {
    throw new Error("❌ Missing fileType or project/task context");
  }

  await uploadToS3(file.buffer, fileKey, file.mimetype, fileType === "profilePic");

  if (projectId || taskId) {
    await File.create(metadata);
  }

  return {
    fileUrl: metadata.fileURL,
    signedUrl: await getFileUrl(fileKey),
  };
};

// ✅ Upload Daily Update (No DB)
const uploadCommentAttachment = async (file, companyId) => {
  if (!file) throw new Error("❌ No file provided for comment attachment");

  const filename = file.originalname?.trim() || `upload-${Date.now()}`;
  const fileKey = `task-daily-updates/company_${companyId}/${Date.now()}-${filename}`;

  console.log("📝 Uploading Daily Comment File:", {
    filename,
    key: fileKey,
    mime: file.mimetype,
  });

  await uploadToS3(file.buffer, fileKey, file.mimetype || "application/octet-stream", false);

  return {
    fileUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
    fileType: file.mimetype,
    fileName: filename,
    key: fileKey,
  };
};

// ✅ Upload Helper
const uploadToS3 = async (buffer, key, contentType, isPublic = false) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: isPublic ? "public-read" : "private",
  };
  const command = new PutObjectCommand(params);
  await s3.send(command);
};

// ✅ Generate Signed URL
const getFileUrl = async (fileKey, { forceDownload = true } = {}) => {
  if (!fileKey) throw new Error("❌ fileKey is required");

  const decodedKey = decodeURIComponent(fileKey);
  const rawFilename = path.basename(decodedKey);
  const fileExt = path.extname(rawFilename);
  const mimeType = mime.lookup(fileExt) || "application/octet-stream";

  let cleanFilename = rawFilename;
  const splitParts = rawFilename.split("-");
  const guessedName = splitParts.length >= 3 ? splitParts.slice(2).join("-") : rawFilename;

  if (guessedName && guessedName.includes(".")) {
    cleanFilename = guessedName;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: decodedKey,
    ResponseContentType: forceDownload ? mimeType : undefined,
    ResponseContentDisposition: forceDownload
      ? `attachment; filename="${cleanFilename}"`
      : undefined,
  });

  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};

// ✅ Delete File (S3 + MongoDB)
const deleteFile = async (key) => {
  if (!key) throw new Error("❌ File key is required");

  try {
    const command = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    await s3.send(command);
    console.log(`✅ Deleted file from S3: ${key}`);
  } catch (error) {
    console.warn(`⚠️ S3 delete failed for: ${key}`, error.message);
  }

  await File.findOneAndDelete({
    fileURL: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  });
};

// ✅ File Stream
const getFileStream = async (key) => {
  if (!key) throw new Error("❌ File key is required");
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const { Body } = await s3.send(command);
  return Body;
};

// ✅ List Folder Contents
const listFilesInFolder = async (folder) => {
  const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: folder });
  const { Contents } = await s3.send(command);
  return Contents || [];
};

// ✅ Clean Up Old Project Reports (1 year old)
const deleteExpiredReports = async () => {
  try {
    const files = await listFilesInFolder("project-reports/");
    const cutoffTime = Date.now() - 365 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const timestampMatch = file.Key.match(/\d{13}/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[0], 10);
        if (timestamp < cutoffTime) {
          await deleteFile(file.Key);
          console.log(`🗑️ Deleted expired report: ${file.Key}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error deleting expired reports:", error.message);
  }
};

// ✅ Exports
module.exports = {
  upload,
  uploadFile,
  uploadCommentAttachment,
  getFileStream,
  deleteFile,
  getFileUrl,
  deleteExpiredReports,
};
