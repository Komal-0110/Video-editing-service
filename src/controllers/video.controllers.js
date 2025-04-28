const { createVideo, cutVideo } = require("../service/videoService");
const { validate: isValidUUID } = require("uuid");

async function uploadVideo(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const video = await createVideo(file);
    res.status(201).json({ message: `Video uploaded successfully ${video}` });
  } catch (error) {
    console.error("Upload Video Error:", error);
    res.status(500).json({ error: "Failed to upload video" });
  }
}

const trimRequest = joi.object({
  startTime: joi
    .string()
    .pattern(/^\d{2}:\d{2}:\d{2}$/)
    .required(),
  endTime: joi
    .string()
    .pattern(/^\d{2}:\d{2}:\d{2}$/)
    .required(),
});

async function trimVideo(req, res) {
  try {
    const videoId = req.params.id;
    if (!isValidUUID(videoId)) {
      res.status(400).json({ error: "Invalid video id" });
    }

    const { error, value } = trimRequest.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { startTime, endTime } = value;
    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "expect start time(00:00:00) and end time(00:00:00)" });
    }

    const trimmedVideo = await cutVideo(videoId, startTime, endTime);

    res.status(200).json({
      message: "Video trimmed succesfully",
      data: trimmedVideo,
    });
  } catch (e) {
    console.error("Trim video error", e);
  }
}

module.exports = { uploadVideo, trimVideo };
