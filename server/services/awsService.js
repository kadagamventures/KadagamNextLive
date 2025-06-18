// server/utils/s3.js

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const mime = require("mime-types");
require("dotenv").config();

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
if (!BUCKET_NAME) throw new Error("❌ AWS_S3_BUCKET_NAME missing!");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Core S3 Upload
const uploadToS3 = async (buffer, key, contentType, isPublic = false) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ContentDisposition:
      contentType === "application/pdf" || contentType.startsWith("image/")
        ? "inline"
        : `attachment; filename="${key.split("/").pop()}"`,
  };

  await s3.send(new PutObjectCommand(params));

  const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { fileUrl, fileKey: key };
};

// Upload PDF buffer (generic)
const uploadBufferToS3 = async (buffer, key, contentType = "application/pdf") => {
  return await uploadToS3(buffer, key, contentType);
};

// ——— NEW: Invoice PDF upload ———
// buffer: PDF file buffer
// invoiceNumber: e.g. "INV-2025-000001"
// companyId: company’s _id string
const uploadInvoicePdf = async (buffer, invoiceNumber, companyId) => {
  if (!buffer || !invoiceNumber || !companyId) {
    throw new Error("buffer, invoiceNumber and companyId are required");
  }
  const key = `invoices/company_${companyId}/${invoiceNumber}.pdf`;
  return await uploadToS3(buffer, key, "application/pdf");
};

// Delete from S3 + File DB
const deleteFile = async (fileKey) => {
  if (!fileKey) throw new Error("❌ File key is required");

  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey })
    );
    console.log(`✅ Deleted from S3: ${fileKey}`);
  } catch (err) {
    console.warn(`⚠️ S3 delete failed for ${fileKey}:`, err.message);
  }

  // Remove DB entry matching file URL
  await File.findOneAndDelete({
    fileURL: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
  });
};

// Generate presigned download URL
const generatePresignedUrl = async (key) => {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};

// Stream a file from S3
const getFileStream = async (key) => {
  if (!key) throw new Error("❌ File key is required");
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const { Body } = await s3.send(command);
  return Body;
};

// Upload staff file (profilePic / resume)
const uploadStaffFile = async (
  fileBuffer,
  contentType,
  { fileType, staffId, companyId }
) => {
  const ext = mime.extension(contentType) || "bin";
  let fileKey;

  if (fileType === "profilePic") {
    fileKey = `staff-profile-pictures/company_${companyId}/${staffId}/profile.${ext}`;
  } else if (fileType === "resume") {
    fileKey = `staff-resumes/company_${companyId}/${staffId}/resume.${ext}`;
  } else {
    throw new Error("❌ Invalid staff file type");
  }

  return await uploadToS3(fileBuffer, fileKey, contentType, true);
};

// Upload daily update file attachment
const uploadDailyCommentAttachment = async (
  fileBuffer,
  fileName,
  contentType,
  taskId,
  companyId
) => {
  const ext = mime.extension(contentType) || "bin";
  const safeName = fileName?.includes(".")
    ? fileName
    : `daily-${Date.now()}.${ext}`;
  const fileKey = `daily-updates/company_${companyId}/task_${taskId}/${uuidv4()}-${safeName}`;
  return await uploadToS3(fileBuffer, fileKey, contentType);
};

// Upload task review file attachment
const uploadTaskReviewAttachment = async (
  fileBuffer,
  fileName,
  contentType,
  taskId,
  companyId
) => {
  if (!taskId || !companyId)
    throw new Error("❌ Task ID and companyId are required");

  const ext = mime.extension(contentType) || "bin";
  const safeName = fileName?.includes(".")
    ? fileName
    : `review-${Date.now()}.${ext}`;
  const fileKey = `task-reviews/company_${companyId}/task_${taskId}/${uuidv4()}-${safeName}`;
  return await uploadToS3(fileBuffer, fileKey, contentType);
};

// Check if key exists in S3
const checkIfS3KeyExists = async (fileUrl) => {
  try {
    const url = new URL(fileUrl);
    const key = decodeURIComponent(url.pathname.slice(1));
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404)
      return false;
    console.warn("⚠️ S3 HEAD check failed:", err.message || err);
    throw err;
  }
};

// Upload project/task file & log in DB
const uploadProjectTaskFile = async (
  fileBuffer,
  fileName,
  contentType,
  { projectId, taskId, uploadedBy, companyId }
) => {
  if (projectId && !(await Project.findOne({ _id: projectId, companyId })))
    throw new Error("❌ Invalid project ID");
  if (taskId && !(await Task.findOne({ _id: taskId, companyId })))
    throw new Error("❌ Invalid task ID");

  const ext = mime.extension(contentType) || "bin";
  const safeName = fileName?.includes(".")
    ? fileName
    : `attachment-${Date.now()}.${ext}`;
  const fileKey = `project-files/company_${companyId}/${projectId ||
    "general"}/${uuidv4()}-${safeName}`;
  const { fileUrl } = await uploadToS3(fileBuffer, fileKey, contentType);

  await File.create({
    fileName: safeName,
    fileType: contentType,
    fileSize: fileBuffer.length,
    fileURL: fileUrl,
    uploadedBy,
    companyId,
    project: projectId || null,
    task: taskId || null,
  });

  return fileUrl;
};

module.exports = {
  uploadToS3,
  uploadBufferToS3,
  uploadInvoicePdf,         // <— new helper
  deleteFile,
  getFileStream,
  generatePresignedUrl,
  uploadStaffFile,
  uploadDailyCommentAttachment,
  uploadTaskReviewAttachment,
  uploadProjectTaskFile,
  checkIfS3KeyExists,
};
