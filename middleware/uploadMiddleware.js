import cloudinary from '../utils/cloudinaryConfig.js';
import multer from 'multer';
import { Readable } from 'stream';

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const uploadFiles = async (files) => {
  const uploadPromises = files.map(file => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },  // Auto-detect image or video
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(stream);
    });
  });

  return Promise.all(uploadPromises);
};

export { upload };
