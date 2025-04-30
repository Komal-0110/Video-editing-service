const { downloadFromS3, uploadFileToS3 } = require("../utils/s3");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const path = require("path");
const fs = require("fs");

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

  const TMP_DIR = path.join(__dirname, "tmp");
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

  const inputBaseName = path.basename(video.originalPath);
  const localInputPath = path.join(TMP_DIR, `${Date.now()}_${inputBaseName}`);
  const localOutputPath = path.join(
    TMP_DIR,
    `trimmed_${Date.now()}_${inputBaseName}`
  );

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
      status: "COMPLETED",
    },
  });

  fs.unlinkSync(localInputPath);
  fs.unlinkSync(localOutputPath);

  return updatedVideo.editedPath;
};

const formatSrtTime = (time) => {
  return time.includes(",") ? time : `${time},000`;
};

const addSubtitlesToVideo = async (id, value) => {
  const { startTime, endTime, subtitles } = value;

  if (!startTime || !endTime || !subtitles) {
    throw new Error("invalid request");
  }

  const video = await prisma.video.findUnique({
    where: { id: id },
  });
  if (!video) throw new Error("Video not found");

  const TMP_DIR = path.join(__dirname, "tmp");
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

  const videoUpdatedPath = video.editedPath
    ? video.editedPath
    : video.originalPath;
  const inputBaseName = path.basename(videoUpdatedPath);
  const localInputPath = path.join(TMP_DIR, `${Date.now()}_${inputBaseName}`);
  const localOutputPath = path.join(
    TMP_DIR,
    `subtitled_${Date.now()}_${inputBaseName}`
  );
  const localSubtitlePath = path.join(TMP_DIR, `subtitle_${Date.now()}.srt`);
  const srtContent = `1\n${formatSrtTime(startTime)} --> ${formatSrtTime(
    endTime
  )}\n${subtitles}\n\n`;

  fs.writeFileSync(localSubtitlePath, srtContent, { encoding: "utf-8" });
  const ffmpegSafePath = localSubtitlePath.replace(/\\/g, "/");
  const quotedPath = `'${ffmpegSafePath.replace(/:/g, "\\:")}'`;

  await downloadFromS3(videoUpdatedPath, localInputPath);

  ffmpeg.setFfmpegPath(ffmpegPath);
  await new Promise((resolve, reject) => {
    ffmpeg(localInputPath)
      .videoFilter(
        `subtitles=${quotedPath}:force_style='FontName=Arial,FontSize=36,PrimaryColour=&HFFFFFF&'`
      )
      .outputOptions([
        "-c:v",
        "libx264",
        "-c:a",
        "copy",
        "-map",
        "0:v",
        "-map",
        "0:a?",
      ])
      .output(localOutputPath)
      .on("start", (cmd) => console.log("FFmpeg:", cmd))
      .on("end", resolve)
      .on("error", reject)
      .run();
  });

  const subtitledVideoUrl = await uploadFileToS3(localOutputPath);

  const updated = await prisma.video.update({
    where: { id: id },
    data: { editedPath: subtitledVideoUrl, status: "COMPLETED" },
  });

  fs.unlinkSync(localInputPath);
  fs.unlinkSync(localOutputPath);
  fs.unlinkSync(localSubtitlePath);

  return updated.editedPath;
};

const renderFinalVideo = async(videoId) => {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) throw new Error('Video not found');

  const videoUpdatedPath = video.editedPath
    ? video.editedPath
    : video.originalPath;

  const TMP_DIR = path.join(__dirname, "tmp", "final");
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

  const inputBaseName = path.basename(videoUpdatedPath);
const newInputName = 'final_video.mp4'
  fs.rename(inputBaseName, newInputName, (err) => {
    if (err) {
      throw new Error("internal server error")
    } 
  });
  const outputPath = path.join(TMP_DIR, `${newInputName}`)

  return new Promise((resolve, reject) => {
    ffmpeg(videoUpdatedPath)
      .outputOptions('-preset fast')
      .on('end', async () => {
        const s3Key = newInputName
        const s3Url = await uploadToS3(outputPath, s3Key);

        await video.update({
          finalPath: s3Url,
          status: 'COMPLETED',
        });

        resolve(s3Url);
      })
      .on('error', reject)
      .save(outputPath);
  });
}

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
  addSubtitlesToVideo,
  renderFinalVideo
};
