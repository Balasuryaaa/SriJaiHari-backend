import Product from '../models/Product.js';
import { uploadFiles } from '../middleware/uploadMiddleware.js';

export const createProduct = async (req, res) => {
  try {
    const { name, details } = req.body;

    if (!name || !details) {
      return res.status(400).json({ message: 'Name and details are required.' });
    }

    // Ensure req.files is present and read images/videos arrays safely
    const images = Array.isArray(req.files?.images) ? req.files.images : [];
    const videos = Array.isArray(req.files?.videos) ? req.files.videos : [];

    // Upload files to Cloudinary
    const imageUrls = await uploadFiles(images);
    const videoUrls = await uploadFiles(videos);

    // Create and save new Product
    const product = new Product({
      name,
      details,
      images: imageUrls,
      videos: videoUrls,
    });

    await product.save();

    return res.status(201).json(product);
  } catch (err) {
    console.error('Product creation failed:', err);
    return res.status(500).json({
      message: 'Upload failed',
      error: err.message,
    });
  }
};
