const {downloadFromS3} = require("../utils/s3");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const createVideo = async (file) => {
  const s3Result = await uploadFileToS3(file);

  const video = await prisma.video.create({
    data: {
      name: file.originalname,
      originalPath: s3Result.Location,
      size: file.size,
      status: "UPLOADED",
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
      throw new Error("Invalid time range" );
    }

    return duration
}

const cutVideo = async (videoId, startTime, endTime) => {
  const video = await prisma.video.findUnique({
    where: { videoId },
  });

  if (!video) {
    throw new Error("video not found");
  }

  const inputPath = video.originalPath
  const localInputPath = `/tmp/${path.basename(inputPath)}`;
  const localOutputPath = `/tmp/trimmed_${Date.now()}_${path.basename(inputPath)}`;

  await downloadFromS3(inputPath, localInputPath);

  await new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpegPath);

    ffmpeg(localInputPath)
      .setStartTime(startTime)
      .setDuration(getDurationInSeconds(startTime, endTime))
      .output(localOutputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  const trimmedVideoUrl = await uploadFileToS3(localOutputPath);

  const updatedVideo = await prisma.video.update({
    where: { id: videoId },
    data: { trimmedVideoUrl: trimmedVideoUrl },
  });

  fs.unlinkSync(localInputPath);
  fs.unlinkSync(localOutputPath);

  return updatedVideo;
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
};