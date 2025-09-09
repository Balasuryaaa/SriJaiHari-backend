import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  details: { type: String, required: true },
  images: [{ type: String, required: true }],
  videos: [{ type: String }],
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
export default Product;
