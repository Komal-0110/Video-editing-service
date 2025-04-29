const { downloadFromS3, uploadFileToS3 } = require("../utils/s3");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const path = require("path")
const fs = require('fs');

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const createVideo = async (file) => {
  const s3Result = await uploadFileToS3(file);

  const video = await prisma.video.create({
    data: {
      name: file.originalname,
      originalPath: s3Result,
      size: file.size,
      status: "COMPLETED",
    },
  });

  return video;
};

const getDurationInSeconds = (startTime, endTime) => {
  const [h1, m1, s1] = startTime.split(":").map(Number);
  const [h2, m2, s2] = endTime.split(":").map(Number);

  const startSeconds = h1 * 3600 + m1 * 60 + s1;
  const endSeconds = h2 * 3600 + m2 * 60 + s2;
  const duration = endSeconds - startSeconds;

  if (duration <= 0) {
    throw new Error("Invalid time range");
  }

  return duration;
};

const cutVideo = async (id, startTime, endTime) => {
  const video = await prisma.video.findUnique({
    where: { id: id },
  });

  if (!video) {
    throw new Error("video not found");
  }
  
  const TMP_DIR = path.join(__dirname, 'tmp');
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

  const inputBaseName = path.basename(video.originalPath);  
  const localInputPath = path.join(TMP_DIR, `${Date.now()}_${inputBaseName}`);
  const localOutputPath = path.join(TMP_DIR, `trimmed_${Date.now()}_${inputBaseName}`);

  await downloadFromS3(video.originalPath, localInputPath);

  ffmpeg.setFfmpegPath(ffmpegPath);

  await new Promise((resolve, reject) => {
    ffmpeg(localInputPath)
      .setStartTime(startTime)
      .setDuration(getDurationInSeconds(startTime, endTime))
      .output(localOutputPath)
      .on("start", (cmd) => console.log("FFmpeg started:", cmd))
      .on("end", () => {
        console.log("FFmpeg finished trimming");
        resolve();
      })
      .on("error", (err) => {
        console.error("FFmpeg error during trim:", err.message);
        reject(err);
      })
      .run();
  });

  const trimmedS3 = await uploadFileToS3(localOutputPath);
  
  const updatedVideo = await prisma.video.update({
    where: { id },
    data: {
      editedPath: trimmedS3,
      status: 'COMPLETED',
    },
  });

  fs.unlinkSync(localInputPath);
  fs.unlinkSync(localOutputPath);

  return updatedVideo.editedPath;
};

const getVideoById = async (id) => {
  return await prisma.video.findUnique({
    where: { id },
  });
};

const updateVideo = async (id, updateData) => {
  return await prisma.video.update({
    where: { id },
    data: updateData,
  });
};

const listVideos = async (skip = 0, take = 10) => {
  return await prisma.video.findMany({
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const deleteVideo = async (id) => {
  return await prisma.video.delete({
    where: { id },
  });
};

module.exports = {
  createVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  listVideos,
  cutVideo,
};
