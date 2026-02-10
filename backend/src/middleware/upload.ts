import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { isCloudinaryConfigured as checkCloudinaryConfigured } from '../config/cloudinary';

// Configure cloudinary if credentials available (import triggers config)
import '../config/cloudinary';

// Re-export isCloudinaryConfigured for convenience
export const isCloudinaryConfigured = checkCloudinaryConfigured;

/**
 * File filter for image uploads
 * Accepts: jpeg, jpg, png, gif, webp
 */
const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

/**
 * Creates a local disk storage configuration
 */
const createLocalStorage = (uploadFolder: string, filenamePrefix: string): StorageEngine => {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(__dirname, '../../uploads', uploadFolder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${filenamePrefix}-${uniqueSuffix}${ext}`);
    },
  });
};

/**
 * Creates a Cloudinary storage configuration
 */
const createCloudinaryStorage = (folder: string, maxWidth: number = 1200): StorageEngine => {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `fair-marketplace/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ width: maxWidth, crop: 'limit' }],
    } as any,
  });
};

/**
 * Creates a multer upload instance that uses Cloudinary when configured,
 * otherwise falls back to local disk storage.
 *
 * @param folder - The folder name for uploads (e.g., 'logos', 'products', 'panoramas')
 * @param filenamePrefix - Prefix for local file names
 * @param maxFileSize - Maximum file size in bytes (default 5MB)
 * @param maxWidth - Maximum image width for Cloudinary transformation (default 1200)
 */
export const createUpload = (
  folder: string,
  filenamePrefix: string,
  maxFileSize: number = 5 * 1024 * 1024,
  maxWidth: number = 1200
) => {
  const storage = isCloudinaryConfigured()
    ? createCloudinaryStorage(folder, maxWidth)
    : createLocalStorage(folder, filenamePrefix);

  return multer({
    storage,
    limits: {
      fileSize: maxFileSize,
    },
    fileFilter: imageFileFilter,
  });
};

// Pre-configured upload instances for common use cases

/**
 * Logo upload - 5MB limit, stored in 'logos' folder
 */
export const logoUpload = createUpload('logos', 'logo', 5 * 1024 * 1024, 1200);

/**
 * Product image upload - 5MB limit, stored in 'products' folder
 */
export const productImageUpload = createUpload('products', 'product', 5 * 1024 * 1024, 1200);

/**
 * Panorama image upload - 20MB limit, stored in 'panoramas' folder
 * Larger width limit (4096) to preserve panorama quality
 */
export const panoramaUpload = createUpload('panoramas', 'panorama', 20 * 1024 * 1024, 4096);

/**
 * Gets the URL for an uploaded file
 * For Cloudinary uploads, the URL is in file.path
 * For local uploads, we construct the URL
 */
export const getUploadedFileUrl = (file: Express.Multer.File, folder: string): string => {
  if (isCloudinaryConfigured()) {
    // Cloudinary stores the URL in file.path
    return file.path;
  }
  // Local storage - return relative URL
  return `/uploads/${folder}/${file.filename}`;
};

/**
 * Checks if a URL is a Cloudinary URL
 */
export const isCloudinaryUrl = (url: string): boolean => {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
};

export default {
  createUpload,
  logoUpload,
  productImageUpload,
  panoramaUpload,
  getUploadedFileUrl,
  isCloudinaryUrl,
  isCloudinaryConfigured: checkCloudinaryConfigured,
};
