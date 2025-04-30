const Joi = require("joi");
const { validate: isValidUUID } = require("uuid");
const { createVideo, addSubtitlesToVideo, cutVideo, getRenderedVideoStream, renderFinalVideo } = require("../service/videoService");

async function uploadVideo(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const video = await createVideo(file);
    res.status(201).json({ message: `Video uploaded successfully ${video.originalPath}` });
  } catch (error) {
    console.error("Upload Video Error:", error);
    res.status(500).json({ error: "Failed to upload video" });
  }
}

const trimRequest = Joi.object({
  startTime: Joi
    .string()
    .pattern(/^\d{2}:\d{2}:\d{2}$/)
    .required(),
  endTime: Joi
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

const subtitlesRequest = Joi.object({
  startTime: Joi
    .string()
    .pattern(/^\d{2}:\d{2}:\d{2}$/)
    .required(),
  endTime: Joi
    .string()
    .pattern(/^\d{2}:\d{2}:\d{2}$/)
    .required(),
  subtitles: Joi.string().min(1).required(),
});

const addSubtitles = async (req, res) => {
  try {
    const videoId = req.params.id;
    const { error, value } = subtitlesRequest.validate(req.body);

    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }

    const updatedPath = await addSubtitlesToVideo(videoId, value);
    res.json({ editedPath: updatedPath });
  } catch (err) {
    console.error("Add Subtitles Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const renderVideo = async (req, res) => {
  try {
    const videoId = req.params.id;

    const url = await renderFinalVideo(videoId);
    res.status(200).json({ message: 'Rendered successfully', url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const downloadFinalVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    if (!videoId) {
      res.status(400).json({error : "video id not found"})
    }

    const stream = await getRenderedVideoStream(videoId)
    res.setHeader('Content-Disposition', `attachment; filename=video-${videoId}.mp4`);
    res.setHeader('Content-Type', 'video/mp4');
    stream.pipe(res);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}


module.exports = { uploadVideo, trimVideo, addSubtitles, renderVideo, downloadFinalVideo };
