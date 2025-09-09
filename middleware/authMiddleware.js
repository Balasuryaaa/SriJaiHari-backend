import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export function verifyAdminToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.admin = decoded;
    next();
  });
}
