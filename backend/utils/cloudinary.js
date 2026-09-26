import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import path from "path";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ensureCloudinaryConfigured = () => {
  const missing = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!process.env.CLOUDINARY_API_KEY) missing.push("CLOUDINARY_API_KEY");
  if (!process.env.CLOUDINARY_API_SECRET)
    missing.push("CLOUDINARY_API_SECRET");

  if (missing.length) {
    const err = new Error(
      `Cloudinary is not configured. Missing env var(s): ${missing.join(", ")}`,
    );
    err.statusCode = 500;
    throw err;
  }
};

const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (_) {
    // ignore
  }
};

export const uploadPDFToCloudinary = async (localFilePath, options = {}) => {
  ensureCloudinaryConfigured();
  if (!localFilePath) {
    const err = new Error("No file path provided for upload");
    err.statusCode = 400;
    throw err;
  }

  const ext = path.extname(localFilePath).toLowerCase();
  if (ext && ext !== ".pdf") {
    await safeUnlink(localFilePath);
    const err = new Error("Only PDF files are allowed");
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "raw",
      folder: "tlai-pdfs",
      type: "upload",
      access_mode: "public",
      ...options,
    });

    await safeUnlink(localFilePath);
    return response;
  } catch (error) {
    const err = new Error("Failed to upload PDF to Cloudinary");
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }
};
