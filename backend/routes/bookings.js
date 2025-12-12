// backend/routes/bookings.js
const express = require('express');
const Booking = require('../models/Booking');
const Room = require('../models/Room');

module.exports = function(io) {
  const router = express.Router();

  // POST /api/bookings - create a new booking
 router.post('/', async (req, res) => {
  try {
    const { roomId, guestName } = req.body;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!room.available) return res.status(400).json({ error: 'Room already booked' });

    const booking = await Booking.create({ room: room._id, guestName });

    room.available = false;
    await room.save();

    // Emit only room ID and availability, not guestName
    io.emit('newBooking', { roomId });

    res.status(201).json({
      _id: booking._id,
      room: {
        _id: room._id,
        number: room.number,
        price: room.price,
        type: room.type
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  return router;
};
