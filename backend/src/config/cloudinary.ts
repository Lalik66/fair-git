import { v2 as cloudinary } from 'cloudinary';

// Only configure if credentials are available
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Always use HTTPS URLs (Feature 225: Cloudinary URLs secure)
  });
}

export const isCloudinaryConfigured = () => !!process.env.CLOUDINARY_CLOUD_NAME;

export default cloudinary;
