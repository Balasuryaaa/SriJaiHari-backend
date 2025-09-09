import express from 'express';
import { verifyAdminToken } from '../middleware/authMiddleware.js';
import { createProduct } from '../controllers/productController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import Product from '../models/Product.js';

const router = express.Router();

router.post(
	'/',
	verifyAdminToken,
	upload.fields([
		{ name: 'images', maxCount: 10 },
		{ name: 'videos', maxCount: 5 },
	]),
	createProduct
);

router.get('/', async (req, res) => {
	const products = await Product.find().sort({ createdAt: -1 });
	res.json(products);
});

router.get('/:id', async (req, res) => {
	const product = await Product.findById(req.params.id);
	res.json(product);
});

router.put('/:id', verifyAdminToken, async (req, res) => {
	const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
	res.json(updated);
});

router.delete('/:id', verifyAdminToken, async (req, res) => {
	await Product.findByIdAndDelete(req.params.id);
	res.json({ message: 'Product deleted' });
});

export default router;
