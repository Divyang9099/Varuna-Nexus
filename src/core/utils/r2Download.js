const { GetObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");
const env = require("../config/env");

exports.getFileStream = async (key) => {
  if (!key) throw new Error("No file key provided for download");

  const command = new GetObjectCommand({
    Bucket: env.r2.bucket,
    Key: key,
  });

  const response = await r2.send(command).catch(err => {
    throw new Error(`Failed to fetch from R2: ${err.message}`);
  });

  return response.Body;
};
