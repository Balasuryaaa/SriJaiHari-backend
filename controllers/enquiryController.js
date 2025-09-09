import Enquiry from '../models/Enquiry.js';

export async function createEnquiry(req, res) {
	try {
		const { name, email, message } = req.body;
		if (!name || !email || !message) {
			return res.status(400).json({ message: 'name, email and message are required' });
		}
		const enquiry = new Enquiry({ name, email, message });
		await enquiry.save();
		return res.status(201).json(enquiry);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create enquiry', error: error.message });
	}
}

export async function getEnquiries(req, res) {
	try {
		const enquiries = await Enquiry.find().sort({ createdAt: -1 });
		return res.json(enquiries);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch enquiries', error: error.message });
	}
}

export async function updateEnquiry(req, res) {
	try {
		const updated = await Enquiry.findByIdAndUpdate(
			req.params.id,
			req.body,
			{ new: true }
		);
		return res.json(updated);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update enquiry', error: error.message });
	}
}


