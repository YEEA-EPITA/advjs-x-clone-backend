const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION,
});

const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  try {
    const sanitizedFileName = fileName.replace(/\s+/g, "_");
    // Determine folder based on MIME type
    let folder = "";
    if (mimeType.startsWith("image/")) {
      folder = "images/posts";
    } else if (mimeType.startsWith("video/")) {
      folder = "videos/original";
    } else {
      throw new Error("Unsupported file type");
    }
    const key = `${folder}/${Date.now()}_${sanitizedFileName}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      //   ACL: "public-read",
    };

    console.log("uploading to S3:", key);

    const { Location } = await s3.upload(params).promise();
    console.log("✅ S3 Upload Success:", Location);
    return Location;
  } catch (error) {
    console.error("❌ uploadToS3 error:", error);
    throw new Error("Failed to upload file to S3");
  }
};

module.exports = { uploadToS3 };
