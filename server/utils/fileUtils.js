const fs = require("fs");
const path = require("path");
const { URL } = require("url");

/**
 * ✅ Extracts the file key from a full AWS S3 URL or local path.
 * - For S3 URLs: returns the key after bucket name.
 * - For local paths: returns the filename.
 * - Supports multi-tenant subfolder parsing (e.g., tenantId/filename.pdf)
 * @param {string} filePath - S3 URL or local path
 * @returns {string|null} - Extracted key or null
 */
const extractFileKey = (filePath) => {
  if (!filePath) return null;

  try {
    if (filePath.includes("amazonaws.com")) {
      const url = new URL(filePath);
      return decodeURIComponent(url.pathname.slice(1)); // S3 key
    }
    return path.basename(filePath);
  } catch (err) {
    console.error("❌ Error extracting file key:", err.message);
    return null;
  }
};

/**
 * ✅ Checks if a local file exists
 * @param {string} filePath
 * @returns {boolean}
 */
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    console.error("❌ Error checking file existence:", err.message);
    return false;
  }
};

/**
 * ✅ Read a local file as UTF-8
 * @param {string} filePath
 * @returns {Promise<string>}
 */
const readFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error("❌ Error reading file:", err.message);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

/**
 * ✅ Write data to a local file (overwrite)
 * @param {string} filePath
 * @param {string|Buffer} data
 * @returns {Promise<string>}
 */
const saveFile = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, data, (err) => {
      if (err) {
        console.error("❌ Error saving file:", err.message);
        reject(err);
      } else {
        resolve("✅ File saved successfully");
      }
    });
  });
};

/**
 * ✅ Delete a local file
 * @param {string} filePath
 * @returns {Promise<string>}
 */
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        if (err.code === "ENOENT") {
          resolve("⚠️ File not found (already deleted)");
        } else {
          console.error("❌ Error deleting file:", err.message);
          reject(err);
        }
      } else {
        resolve("✅ File deleted successfully");
      }
    });
  });
};

module.exports = {
  extractFileKey,
  fileExists,
  readFile,
  saveFile,
  deleteFile,
};
