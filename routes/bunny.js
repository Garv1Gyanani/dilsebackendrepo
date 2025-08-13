// routes/bunny.js
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { logToFile } = require("../logger");
const config = require("../config");

const router = express.Router();

// Multer configuration
const upload = multer({ dest: "uploads/" });

// 🟢 Upload Endpoint
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = path.resolve(req.file.path);
  const fileName = req.file.originalname;

  try {
    // Upload file to Bunny storage
    const fileData = fs.readFileSync(filePath);
    const uploadUrl = `https://storage.bunnycdn.com/${config.bunnyCDN.storageZone}/uploads/${fileName}`;

    const response = await axios.put(uploadUrl, fileData, {
      headers: {
        AccessKey: config.bunnyCDN.accessKey,
        "Content-Type": "application/octet-stream",
      },
    });

    // Cleanup local file
    fs.unlinkSync(filePath);

    res.status(200).json({
      message: "✅ File uploaded to Bunny.net Storage",
      bunnyStorageUrl: uploadUrl,
      publicCdnUrl: `${config.bunnyCDN.pullZoneUrl}/${fileName}`,
      bunnyResponse: response.data,
    });
  } catch (error) {
    fs.unlinkSync(filePath);
    console.error("Upload failed:", error.response?.data || error.message);
    res.status(500).json({
      error: "Upload to Bunny failed",
      detail: error.response?.data || error.message,
    });
  }
});

module.exports = router;
