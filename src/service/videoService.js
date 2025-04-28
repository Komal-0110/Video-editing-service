import { uploadFileToS3 } from "../utils/s3";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient()

export const createVideo = async (file) => {
    const s3Result = await uploadFileToS3(file);
    
    const video = await prisma.video.create({
        data: {
          name: file.originalname,
          originalPath: s3Result.Location,
          size: file.size,
          status: 'UPLOADED',
        },
      });
    
      return video;
}

export const getVideoById = async (id) => {
    return await prisma.video.findUnique({
        where:{id},
    })
}

export const updateVideo = async (id, updateData) => {
    return await prisma.video.update({
        where:{id},
        data : updateData,
    })
}

export const listVideos = async(skip = 0, take=10) => {
    return await prisma.video.findMany({
        skip,
        take,
        orderBy: {
            createdAt: 'desc',
        }
    })
}

export const deleteVideo = async (id) => {
    return await prisma.video.delete({
        where : {id},
    })
}