// src/config/aws.js

require('dotenv').config();

const config = {
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  s3Bucket: process.env.AWS_S3_BUCKET || '',
  s3Endpoint: process.env.AWS_S3_ENDPOINT || '', // for S3-compatible storage
};

function createS3Client() {
  const { S3Client } = require('@aws-sdk/client-s3');
  const params = {
    region: config.region,
    credentials: config.accessKeyId && config.secretAccessKey ? {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    } : undefined,
  };
  if (config.s3Endpoint) {
    params.endpoint = config.s3Endpoint;
    params.forcePathStyle = true;
  }
  return new S3Client(params);
}

module.exports = { config, createS3Client };

