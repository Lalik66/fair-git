import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary';
import fs from 'fs';
import path from 'path';

// Re-export for backward compatibility
export { isCloudinaryConfigured };

export async function uploadToCloud(filePath: string, folder: string): Promise<string | null> {
  if (!isCloudinaryConfigured()) return null;
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `fair-marketplace/${folder}`,
      resource_type: 'image',
    });
    // Delete local file after successful upload
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error(`Failed to delete temporary file ${filePath}:`, err);
      }
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload failed, keeping local file:', error);
    return null;
  }
}

export async function deleteFromCloud(url: string): Promise<boolean> {
  if (!isCloudinaryConfigured() || !url.includes('cloudinary')) return false;
  try {
    const parts = url.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return false;
    const publicIdWithExt = parts.slice(uploadIdx + 2).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete failed:', error);
    return false;
  }
}

export function deleteLocalFile(fileUrl: string): void {
  if (!fileUrl || fileUrl.includes('cloudinary')) return;
  const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
  const fullPath = path.join(process.cwd(), relativePath);

  // Validate path stays within uploads directory to prevent path traversal attacks
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!path.resolve(fullPath).startsWith(path.resolve(uploadsDir))) {
    console.error('Path traversal attempt blocked:', fileUrl);
    return;
  }

  fs.unlink(fullPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error(`Failed to delete file ${fullPath}:`, err);
    }
  });
}
