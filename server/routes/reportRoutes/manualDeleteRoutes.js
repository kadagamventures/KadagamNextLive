const express = require("express");
const router = express.Router();
const { deleteFile } = require("../../services/awsService");

router.delete("/:type/:filename", async (req, res) => {
  const { type, filename } = req.params;

  if (!type || !filename) {
    return res.status(400).json({ success: false, message: "Type and filename required" });
  }

  const key = `reports/${type}/${filename}`;

  try {
    await deleteFile(key);
    return res.json({ success: true, message: "Report deleted from S3." });
  } catch (err) {
    console.error("❌ Delete failed:", err.message);
    return res.status(500).json({ success: false, message: "Failed to delete report." });
  }
});

module.exports = router;

