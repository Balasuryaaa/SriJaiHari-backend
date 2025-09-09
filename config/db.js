import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function connectDB() {
	const mongoUri = process.env.MONGO_URI;
	if (!mongoUri) {
		throw new Error('MONGO_URI is not set in environment');
	}
	await mongoose.connect(mongoUri);
	console.log('MongoDB connected');
}

export default connectDB;


