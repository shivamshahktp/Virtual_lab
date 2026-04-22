const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// POST /api/rooms - Create a new room with a random 6-character code
router.post('/', async (req, res) => {
  try {
    // Generate a random 6-character alphanumeric code (e.g., "X7B9QA")
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const room = new Room({ roomId: newRoomId });
    await room.save();
    
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// GET /api/rooms - Fetch all saved rooms for the gallery
router.get('/', async (req, res) => {
  try {
    // Fetch recent rooms that have actually been saved (have bodies)
    const rooms = await Room.find({ 'bodies.0': { $exists: true } })
      .select('roomId createdAt bodies constraints')
      .sort({ createdAt: -1 })
      .limit(12);
    
    const gallery = rooms.map(r => ({
      roomId: r.roomId,
      createdAt: r.createdAt,
      bodyCount: r.bodies.length,
      constraintCount: r.constraints.length
    }));

    res.status(200).json(gallery);
  } catch (error) {
    console.error('Error fetching room gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// GET /api/rooms/:roomId - Fetch an existing room's physics data
router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.status(200).json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// PUT /api/rooms/:roomId/save - Save the entire state of the room
router.put('/:roomId/save', async (req, res) => {
  try {
    const { bodies, constraints } = req.body;
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId },
      { bodies: bodies || [], constraints: constraints || [] },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.status(200).json({ message: 'Simulation saved successfully', room });
  } catch (error) {
    console.error('Error saving room state:', error);
    res.status(500).json({ error: 'Failed to save simulation state' });
  }
});

module.exports = router;