const {createVideo} = require("../service/videoService") 

async function uploadVideo(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const video = await createVideo(file);
    res.status(201).json(video);
  } catch (error) {
    console.error("Upload Video Error:", error);
    res.status(500).json({ error: "Failed to upload video" });
  }
}

module.exports = { uploadVideo };
