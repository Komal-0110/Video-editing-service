const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const util = require('util');
require('dotenv').config();

const pump = util.promisify(pipeline);

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

const uploadFileToS3 = async (file) => {
  console.log({ file, BUCKET_NAME});
  const fileName = path.basename(file.originalname)
  console.log({fileName});
  

  const uploadParams = {
    Bucket: BUCKET_NAME,
    Key: `uploads/${Date.now()}_${fileName}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;

  return fileUrl;
};

const downloadFromS3 = async (s3Url, localPath) => {
  const urlParts = new URL(s3Url);
  const bucket = urlParts.hostname.split('.')[0];
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


module.exports = {uploadFileToS3, downloadFromS3}
