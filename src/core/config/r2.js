const { S3Client } = require("@aws-sdk/client-s3");
const env = require("./env");

if (!env.r2.accountId || !env.r2.accessKey || !env.r2.secretKey) {
  console.error('❌ R2 configuration is incomplete — file operations (KML upload/download) will fail.');
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.r2.accessKey,
    secretAccessKey: env.r2.secretKey,
  },
});

module.exports = r2;
