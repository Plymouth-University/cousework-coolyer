const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  guestName: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
