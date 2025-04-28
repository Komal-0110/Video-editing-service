const uploadFileToS3 = require("../utils/s3");

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

const cutVideo = async (videoId, startTime, endTime) => {
  const video = await prisma.video.findUnique({
    where: { videoId },
  });

  if (!video) {
    throw new Error("video not found");
  }
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