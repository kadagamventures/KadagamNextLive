const { S3Client } = require("@aws-sdk/client-s3");
const { SESClient } = require("@aws-sdk/client-ses");
require("dotenv").config();

const {
  AWS_REGION,
  AWS_S3_BUCKET_NAME,
  AWS_SES_SENDER_EMAIL,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
} = process.env;

// ✅ Explicit environment checks for required credentials
if (
  !AWS_REGION ||
  !AWS_S3_BUCKET_NAME ||
  !AWS_SES_SENDER_EMAIL ||
  !AWS_ACCESS_KEY_ID ||
  !AWS_SECRET_ACCESS_KEY
) {
  throw new Error("Missing required AWS configuration. Please check your environment variables explicitly.");
}

// ✅ Configure AWS S3 Client with explicit credentials
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// ✅ Configure AWS SES Client explicitly
const ses = new SESClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = { s3, ses };
