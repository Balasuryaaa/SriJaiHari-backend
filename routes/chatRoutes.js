import express from 'express';
import ChatMessage from '../models/ChatMessage.js';

const router = express.Router();

// Get chat history by Room ID
router.get('/history/:roomId', async (req, res) => {
  try {
    const history = await ChatMessage.find({ roomId: req.params.roomId })
      .sort({ timestamp: 1 })
      .limit(100);
    res.json(history);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Post a new message
router.post('/message', async (req, res) => {
  try {
    const { roomId, text, sender, userName, senderName } = req.body;
    
    const chatMsg = new ChatMessage({
      roomId,
      text,
      sender,
      userName: userName || 'User',
      senderName: senderName || userName || 'User'
    });
    
    await chatMsg.save();
    res.status(201).json(chatMsg);
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get all active rooms (For Admin Panel)
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await ChatMessage.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: {
          _id: '$roomId',
          userName: { $first: '$userName' },
          lastMessage: { $first: '$text' },
          timestamp: { $first: '$timestamp' }
      }},
      { $sort: { timestamp: -1 } }
    ]);
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

export default router;
