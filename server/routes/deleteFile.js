const express = require("express");
const router = express.Router();
const { deleteFile } = require("../services/awsService");

router.delete("/", async (req, res) => {
  const { fileKey } = req.body;

  if (!fileKey) {
    return res.status(400).json({ success: false, message: "fileKey is required in request body" });
  }

  try {
    await deleteFile(fileKey);
    return res.json({ success: true, message: `Deleted file: ${fileKey}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete file", error: err.message });
  }
});

module.exports = router;
