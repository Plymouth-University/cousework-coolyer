const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const Room = require('./models/Room');
const Booking = require('./models/Booking');

const app = express();

// CORS middleware
const allowedOrigins = [
  'http://localhost:3000', // hotel frontend
  'http://localhost:7000', // admin frontend (see your docker ps)
  'http://localhost:8000'  // admin backend (if needed)
];
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like curl or Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Explicitly handle preflight requests
app.options('*', cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

mongoose.connect('mongodb://hotel_mongo:27017/hotel', { useNewUrlParser: true, useUnifiedTopology: true });

const server = http.createServer(app);

// Initialize Socket.IO after middleware
const io = new Server(server, { 
    cors: { 
        origin: allowedOrigins,
        methods: ['GET','POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected', socket.id));
});

// Get rooms
app.get('/api/rooms', async (req, res) => {
    const rooms = await Room.find();
    res.json(rooms); // This should include .maintenance if your schema has it
});

// Create booking
app.post('/api/bookings', async (req, res) => {
    const { roomId, guestName } = req.body;
    const room = await Room.findById(roomId);
    if (!room || !room.available) return res.status(400).json({ error: 'Room not available' });

    const booking = await Booking.create({ room: room._id, guestName });
    room.available = false;
    room.bookedBy = guestName;
    await room.save();

    // Emit for admin dashboard
io.emit('newBooking', { 
    room: {
        _id: room._id,
        number: room.number,
        type: room.type,
        price: room.price,
        available: room.available,
        bookedBy: room.bookedBy
    },
    guestName
});

    // Emit for hotel frontend
    io.emit('roomBooked', { 
        roomId: room._id, 
        guestName 
    });

    res.status(201).json({ room, booking });
});

// Reset rooms
app.post('/api/reset', async (req, res) => {
    await Room.updateMany({}, { available: true, bookedBy: null });
    io.emit('resetRooms');
    res.json({ message: 'All rooms reset' });
});
// Add a new room
app.post('/api/rooms', async (req, res) => {
    const { number, type, price, available, bookedBy, maintenance } = req.body;
    try {
        const room = await Room.create({
            number,
            type,
            price,
            available: available !== undefined ? available : true,
            bookedBy: bookedBy || null,
            maintenance: maintenance || false
        });

        console.log('Room added:', room); 

        // Emit to all clients that a new room was added
        io.emit('newRoom', {
            _id: room._id,
            number: room.number,
            type: room.type,
            price: room.price,
            available: room.available,
            bookedBy: room.bookedBy,
            maintenance: room.maintenance
        });

        //console.log('Emitted newRoom event for:', room._id); 

        res.status(201).json({ message: 'Room added', room });
    } catch (err) {
        //console.error('Error adding room:', err); 
        res.status(500).json({ error: err.message });
    }
});
// Set room maintenance status
app.patch('/api/rooms/:roomId/maintenance', async (req, res) => {
  const { maintenance } = req.body;
  const room = await Room.findById(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  room.maintenance = maintenance;
  room.available = !maintenance;
  if (maintenance) room.bookedBy = null;
  await room.save();

  console.log('Emitting roomMaintenance', room._id, maintenance);
  io.emit('roomMaintenance', { roomId: room._id, maintenance });
  res.json({ message: 'Room maintenance status updated', room });
});

// Unbook a room
app.post('/api/rooms/:roomId/unbook', async (req, res) => {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    room.available = true;
    room.bookedBy = null;
    await room.save();

    io.emit('roomUnbooked', { roomId: room._id });
    res.json({ message: 'Room unbooked', room });
});
app.delete('/api/rooms/:roomId', async (req, res) => {
    const room = await Room.findByIdAndDelete(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Emit to all clients that a room was deleted
    io.emit('roomDeleted', { roomId: req.params.roomId });

    res.json({ message: 'Room deleted', roomId: req.params.roomId });
});

// health of the backend
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
server.listen(5000, () => console.log('Hotel backend running on port 5000'));
