const multer = require("multer");
const { error } = require("../utils/response");

// Store in memory because we will stream directly to R2 Cloudflare
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.google-earth.kml+xml", // KML
    "application/xml",
    "text/xml",
    "text/plain",
    "application/zip", // Shapefiles
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error("Invalid file type. Only PDF, Images, KML, ZIP, and XLSX are allowed"), { statusCode: 400 }), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max per file
  },
});

module.exports = upload;
