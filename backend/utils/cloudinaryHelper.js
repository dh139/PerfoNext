const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

/**
 * Extracts the public ID from a Cloudinary secure_url.
 * E.g., "https://res.cloudinary.com/cloud_name/image/upload/v12345/profile/doc_123.jpg"
 * yields "profile/doc_123"
 */
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/image/upload/');
    if (parts.length < 2) return null;
    const pathAfterUpload = parts[1]; // "v12345/profile/doc_123.jpg"
    const segments = pathAfterUpload.split('/');
    // Remove the version segment (e.g. "v12345")
    if (segments[0].startsWith('v') && /^\d+$/.test(segments[0].substring(1))) {
      segments.shift();
    }
    const publicIdWithExt = segments.join('/');
    const lastDotIndex = publicIdWithExt.lastIndexOf('.');
    if (lastDotIndex === -1) return publicIdWithExt;
    return publicIdWithExt.substring(0, lastDotIndex);
  } catch (e) {
    console.error('Error extracting Cloudinary public_id:', e);
    return null;
  }
};

/**
 * Slugifies a string to make it safe for Cloudinary public IDs.
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
};

/**
 * Uploads a local file to Cloudinary and then deletes the local file.
 * @param {string} filePath - Local file path.
 * @param {string} publicId - Desired Cloudinary public ID (e.g. 'profiles/emp1-profile').
 * @returns {Promise<object>} Cloudinary upload response.
 */
const uploadToCloudinary = async (filePath, publicId) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    const uploadOptions = {
      public_id: publicId,
      overwrite: true,
      resource_type: 'auto'
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    return result;
  } finally {
    // Always clean up local uploaded file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete temporary local file:', err);
      }
    }
  }
};

/**
 * Deletes an asset from Cloudinary using its URL.
 * @param {string} url - Secure URL of the asset.
 * @returns {Promise<object>} Cloudinary destroy response.
 */
const deleteFromCloudinary = async (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) return null;

  try {
    // Delete with 'image' resource type (works for images and PDFs uploaded via auto/image)
    let result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    
    // If not found/not deleted, try 'raw' just in case it was uploaded as raw
    if (result.result !== 'ok') {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
    return result;
  } catch (err) {
    console.error(`Failed to delete asset ${publicId} from Cloudinary:`, err);
    return null;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
  slugify
};
