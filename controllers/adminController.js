import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function login(req, res) {
	const { username, password } = req.body;
	if (!username || !password) {
		return res.status(400).json({ message: 'Username and password are required' });
	}
	if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !process.env.JWT_SECRET) {
		return res.status(500).json({ message: 'Server auth is not configured' });
	}
	if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
		return res.status(401).json({ message: 'Invalid credentials' });
	}
	const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, { expiresIn: '7d' });
	return res.json({ token });
}


