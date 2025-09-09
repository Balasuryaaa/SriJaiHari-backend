import express from 'express';
import { verifyAdminToken } from '../middleware/authMiddleware.js';
import { createEnquiry, getEnquiries, updateEnquiry } from '../controllers/enquiryController.js';

const router = express.Router();

router.post('/', createEnquiry);
router.get('/', verifyAdminToken, getEnquiries);
router.put('/:id', verifyAdminToken, updateEnquiry);

export default router;
