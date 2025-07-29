const multer = require("multer");

// Memory storage for direct S3 upload
const storage = multer.memoryStorage();

// Allow only image and video MIME types
const fileFilter = (req, file, cb) => {
  const isAllowed =
    file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Invalid file type. Only images and videos are allowed."
      )
    );
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// Export middleware options for single and multiple uploads
module.exports = {
  upload,
  uploadSingle: (fieldName) => upload.single(fieldName),
  uploadMultiple: (fieldName, maxCount = 5) =>
    upload.array(fieldName, maxCount),
};
