const express = require("express");
const path = require("path");
const multer = require("multer");
const joi = require("joi");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
// const ffmpegStaticPath = require("ffmpeg-static");

const app = express();
const PORT = 8000;

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send({ message: "Welcome to the video editing" });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 100 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov/;
    const mimeTypeCheck = allowedTypes.test(file.mimetype);
    const extensionCheck = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (mimeTypeCheck && extensionCheck) {
      return cb(null, true);
    } else {
      cb("error invalid type");
    }
  },
});

app.post(
  "/api/videos/upload",
  upload.array("video", 5),
  (req, res) => {
    if (!req.files || req.files.length == 0) {
      return res.status(400).send({ message: "No file uploaded" });
    }

    const filenames = req.files.map((file) => file.filename);

    res.status(200).send({
      message: "Video uploaded successfully",
      filename: filenames,
    });
  },
  (error, req, res) => {
    res.status(400).send({ error: error.message });
  }
);

const trimRequest = joi.object({
  startTime: joi.string().required(),
  endTime: joi.string().required(),
});

app.post("/api/videos/:id/trim", (req, res) => {
  const id = req.params.id;
  const { error, value } = trimRequest.validate(req.body);
  const { startTime, endTime } = value;

  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const inputPath = path.join(__dirname, "uploads", id);
  if (!fs.existsSync(inputPath)) {
    return res.status(404).send({ message: "Video not found" });
  }

  const outputFilename = `trimmed-${id}`;
  const outputPath = path.join(__dirname, "uploads", outputFilename);

  const [h1, m1, s1] = startTime.split(":").map(Number);
  const [h2, m2, s2] = endTime.split(":").map(Number);

  const startSeconds = h1 * 3600 + m1 * 60 + s1;
  const endSeconds = h2 * 3600 + m2 * 60 + s2;
  const duration = endSeconds - startSeconds;

  if (duration <= 0) {
    return res.status(400).send({ message: "Invalid time range" });
  }

  ffmpeg.setFfmpegPath(ffmpegPath);
  const command = ffmpeg(inputPath);

  command
    .setStartTime(startTime)
    .setDuration(duration)
    .output(outputPath)
    .on("start", () => {
      console.log("started trimming...");
    })
    .on("end", () => {
      res.status(200).send({
        message: "Video trimmed successfully",
      });
    })
    .on("error", (error) => {
      console.log(`Error in trimming ${error}`);
      res.status(500).send({
        message: "Error trimming video",
      });
    })
    .run();
});

const subtitlesRequest = joi.object({
  startTime: joi
    .string()
    .pattern(/^\d{2}:\d{2}:\d{2}$/)
    .required(),
  endTime: joi
    .string()
    .pattern(/^\d{2}:\d{2}:\d{2}$/)
    .required(),
  subtitles: joi.string().min(1).required(),
});

const formatSrtTime = (time) => {
  return time.includes(",") ? time : `${time},000`;
};

app.post("/api/videos/:id/subtitles", (req, res) => {
  const videoId = req.params.id;
  const { error, value } = subtitlesRequest.validate(req.body);
  const { startTime, endTime, subtitles } = value;
  console.log({ startTime, endTime, subtitles });

  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const inputPath = path.join(__dirname, "uploads", `${videoId}.mp4`);
  if (!fs.existsSync(inputPath)) {
    return res.status(404).send({ message: "Video not found" });
  }

  const subtitlesDir = path.join(__dirname, "subtitles");
  if (!fs.existsSync(subtitlesDir)) {
    fs.mkdirSync(subtitlesDir, { recursive: true });
  }

  const srtPath = path.join(subtitlesDir, `${videoId}.srt`);
  const outputPath = path.join(subtitlesDir, `${videoId}_subtitled.mp4`);
  const srtContent = `1\n${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n${subtitles}\n\n`;
  fs.writeFileSync(srtPath, srtContent, {encoding: "utf8"});

  if (!fs.existsSync(srtPath)) {
    return res.status(500).send({ message: "Failed to create SRT file" });
  }
  const escapedSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  console.log({ escapedSrtPath });

  ffmpeg.setFfmpegPath(ffmpegPath);

  ffmpeg(inputPath)
  .videoFilter(`subtitles=${escapedSrtPath}:force_style='FontName=Arial,FontSize=36,PrimaryColour=&HFFFFFF&'`)
    .outputOptions([
      // "-vf", `subtitles=${escapedSrtPath}`,
      "-c:v", "libx264",
      "-c:a", "copy",
      "-map", "0:v",
      "-map", "0:a?",
    ])
    .on("end", () => {
      res.status(200).send({
        message: "Subtitles added",
      });
    })
    .on("error", (error, stdout, stderr) => {
      console.error(`FFmpeg error: ${error.message}`);
      console.error(`FFmpeg stderr: ${stderr}`);
      res.status(500).send({
        message: "Error adding subtitles to video",
        error : stderr
      });
    })
    .save(outputPath);
});

app.listen(PORT, (err) => {
  if (!err) {
    console.log("server is running on port", PORT);
  } else {
    console.log("error occurred", err);
  }
});
