const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const util = require("util");
require("dotenv").config();

const pump = util.promisify(pipeline);

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// const uploadFileToS3 = async (file) => {
//   if (!file) {
//     throw new Error("uploadFileToS3: filePath must be a valid string");
//   }

//   let fileName, fileStream, contentType;
//   if (file.buffer && file.originalname && file.mimetype) {
//     fileName = `${Date.now()}_${file.originalname}`;
//     fileStream = file.path;
//     contentType = file.mimetype;
//   } else if (typeof file === "string") {
//     fileName = `${Date.now()}_${path.basename(file)}`;
//     fileStream = fs.createReadStream(file);
//     contentType = mime.lookup(fileName) || 'application/octet-stream';
//   } else {
//     throw new Error("uploadFileToS3: Invalid file format");
//   }

//   const allowedExtensions = ['.mp4', '.mov'];
//   const ext = path.extname(fileName).toLowerCase();

//   if (!allowedExtensions.includes(ext)) {
//     throw new Error(`uploadFileToS3: Only .mp4 and .mov files are allowed`);
//   }

//   const uploadParams = {
//     Bucket: BUCKET_NAME,
//     Key: `uploads/${Date.now()}_${fileName}`,
//     Body: fileStream,
//     ContentType: contentType,
//   };

//   await s3.send(new PutObjectCommand(uploadParams));

//   const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;

//   return fileUrl;
// };

const uploadFileToS3 = async (file) => {
  if (!file) {
    throw new Error('uploadFileToS3: file must not be null or undefined');
  }

  let fileName, fileStream, contentType;

  if (file.buffer && file.originalname && file.mimetype) {
    fileName = `${Date.now()}_${file.originalname}`;
    fileStream = file.buffer;
    contentType = file.mimetype;
  }
  else if (typeof file === 'string') {
    fileName = `${Date.now()}_${path.basename(file)}`;
    fileStream = fs.createReadStream(file);
    contentType = 'video/mp4';
  } else {
    throw new Error('uploadFileToS3: Invalid file format');
  }

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: `uploads/${fileName}`,
    Body: fileStream,
    ContentType: contentType,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
  return fileUrl;
};


const downloadFromS3 = async (s3Url, localPath) => {
  const urlParts = new URL(s3Url);
  const bucket = urlParts.hostname.split(".")[0];
  const key = urlParts.pathname.substring(1);

  const getObjectParams = {
    Bucket: bucket,
    Key: key,
  };

  const command = new GetObjectCommand(getObjectParams);

  const response = await s3.send(command);
  await pump(response.Body, fs.createWriteStream(localPath));

  console.log(`Downloaded file to: ${localPath}`);
};

const getS3FileStream = async (fileUrl) => {
  const key = fileUrl.split(".amazonaws.com/")[1];
  console.log({key, BUCKET_NAME});

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await s3.send(command);    
    return response.Body;
  } catch (error) {
    throw new Error("Failed to fetch file from S3");
  }
};

module.exports = { uploadFileToS3, downloadFromS3, getS3FileStream };
