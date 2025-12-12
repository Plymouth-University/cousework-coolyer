const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  number: String,
  type: String,
  price: Number,
  available: { type: Boolean, default: true },
  bookedBy: { type: String, default: null },
  maintenance: { type: Boolean, default: false }
});

module.exports = mongoose.model('Room', roomSchema);
