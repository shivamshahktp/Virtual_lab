const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const auth = require('../middleware/auth');

// POST /api/rooms: Set up a new simulation room with a random 6-letter join code
router.post('/', auth, async (req, res) => {
  try {
    // Make a simple 6-letter tag like "X7B9QA"
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const room = new Room({ 
      roomId: newRoomId,
      ownerId: req.user.userId 
    });
    await room.save();
    
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// GET /api/rooms: Get the public gallery list
router.get('/', async (req, res) => {
  try {
    // Only show rooms that aren't empty (i.e. they actually have shapes in them)
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

// GET /api/rooms/my-experiments: Grab the user's personal saved physics models
router.get('/my-experiments', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ ownerId: req.user.userId, 'bodies.0': { $exists: true } })
      .select('roomId createdAt bodies constraints')
      .sort({ createdAt: -1 });
    
    const gallery = rooms.map(r => ({
      roomId: r.roomId,
      createdAt: r.createdAt,
      bodyCount: r.bodies.length,
      constraintCount: r.constraints.length
    }));

    res.status(200).json(gallery);
  } catch (error) {
    console.error('Error fetching user experiments:', error);
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
});

// GET /api/rooms/:roomId: Load a room's canvas elements by code
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

// PUT /api/rooms/:roomId/save: Commit the current layout, masses, and pivots to Mongo
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