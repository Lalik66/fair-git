// Re-export everything from the new config location for backward compatibility
// New code should import from '../config/cloudinary' directly
export { default, isCloudinaryConfigured } from '../config/cloudinary';
