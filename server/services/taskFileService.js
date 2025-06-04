const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
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

// ✅ Upload one general task file (Multi-Tenant)
const uploadTaskAttachment = async (file, companyId) => {
  if (!file || !companyId) throw new Error("❌ File and companyId required.");

  const ext = mime.extension(file.mimetype) || "bin";
  const safeName = file.originalname?.trim() || `attachment-${Date.now()}.${ext}`;
  const fileKey = `task-attachments/company_${companyId}/${uuidv4()}-${safeName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ContentDisposition: `attachment; filename="${safeName}"`,
  };

  await s3.send(new PutObjectCommand(params));

  return {
    fileUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
    fileType: file.mimetype,
  };
};

// ✅ Upload multiple attachments (Multi-Tenant)
const uploadMultipleTaskAttachments = async (files, companyId) => {
  const uploaded = [];
  for (const file of files) {
    const result = await uploadTaskAttachment(file, companyId);
    uploaded.push(result);
  }
  return uploaded;
};

// ✅ Upload review attachment (Multi-Tenant)
const uploadTaskReviewAttachment = async (file, taskId, companyId) => {
  if (!file || !taskId || !companyId)
    throw new Error("❌ File, taskId, and companyId are required for review upload.");

  const ext = mime.extension(file.mimetype) || "bin";
  const safeName = file.originalname?.trim() || `review-${Date.now()}.${ext}`;
  const fileKey = `task-reviews/company_${companyId}/task_${taskId}/${uuidv4()}-${safeName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ContentDisposition: `attachment; filename="${safeName}"`,
  };

  await s3.send(new PutObjectCommand(params));

  return {
    fileUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
    fileType: file.mimetype,
  };
};

// ✅ Upload daily update file (Multi-Tenant)
const uploadDailyUpdateAttachment = async (buffer, originalname, contentType, taskId, companyId) => {
  if (!buffer || !originalname || !taskId || !companyId) {
    throw new Error("❌ Buffer, filename, taskId, and companyId are required.");
  }

  const ext = mime.extension(contentType) || "bin";
  const safeName = originalname?.trim() || `uploaded-${Date.now()}.${ext}`;
  const fileKey = `task-daily-updates/company_${companyId}/task_${taskId}/${uuidv4()}-${safeName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: contentType,
    ContentDisposition: `attachment; filename="${safeName}"`,
  };

  await s3.send(new PutObjectCommand(params));

  return {
    fileUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
    fileType: contentType,
    fileName: safeName,
    key: fileKey,
  };
};

// ✅ Fetch raw stream
const getTaskAttachmentStream = async (fileKey) => {
  if (!fileKey) throw new Error("❌ File key is required.");
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey });
    const data = await s3.send(command);
    return data.Body;
  } catch (err) {
    console.error("❌ Error fetching stream:", err);
    throw new Error("Failed to fetch file stream.");
  }
};

// ✅ Presigned URL for download
const getTaskAttachmentUrl = async (fileKey) => {
  if (!fileKey) throw new Error("❌ File key is required.");

  const fullKey = decodeURIComponent(fileKey);
  const filename = fullKey.split("/").pop();

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fullKey,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
    ResponseContentType: mime.lookup(filename) || "application/octet-stream",
  });

  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};

// ✅ Delete from S3
const deleteTaskAttachment = async (fileKey) => {
  if (!fileKey) throw new Error("❌ File key is required to delete.");

  const command = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey });
  await s3.send(command);
  return { success: true, message: "✅ File deleted successfully" };
};

// ✅ List all task attachments (for debug/admin)
const listTaskAttachments = async () => {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: "task-attachments/",
  });

  const result = await s3.send(command);
  return (
    result.Contents?.map((file) => ({
      key: file.Key,
      lastModified: file.LastModified,
      size: file.Size,
    })) || []
  );
};

module.exports = {
  uploadTaskAttachment,
  uploadMultipleTaskAttachments,
  uploadTaskReviewAttachment,
  uploadDailyUpdateAttachment,
  getTaskAttachmentStream,
  getTaskAttachmentUrl,
  deleteTaskAttachment,
  listTaskAttachments,
};
