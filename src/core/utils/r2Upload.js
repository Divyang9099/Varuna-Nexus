const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");
const env = require("../config/env");

exports.uploadToR2 = async (file, folder = "general") => {
  if (!file || !file.buffer) throw new Error("No file buffer provided to R2 uploader");

  const path = require('path');
  const safeName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9-]/g, '_');
  const safeExt = path.parse(file.originalname).ext.replace(/[^a-zA-Z0-9.-]/g, '');
  const key = `${folder}/${Date.now()}-${safeName}${safeExt}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return key;
};
