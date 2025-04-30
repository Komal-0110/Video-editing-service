const multer = require("multer");

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["video/mp4", "video/quicktime"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .mp4 and .mov video files are allowed"));
  }
};

const storage = multer.memoryStorage();
const upload = multer({ storage, fileFilter });

module.exports = upload;
