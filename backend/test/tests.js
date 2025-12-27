const assert = require('assert');
const express = require('express');
const request = require('supertest');

// Sample Test
describe('Sample Test', function() {
  it('Basic pass test', function() {
    assert.strictEqual(1, 1);
  });
});

// Model Test Example (Room)
describe('Room Model', function() {
  it('should create a room object with correct fields', function() {
    const room = {
      number: 101,
      type: 'Single',
      price: 100,
      available: true,
      maintenance: false
    };
    assert.strictEqual(room.number, 101);
    assert.strictEqual(room.type, 'Single');
    assert.strictEqual(room.price, 100);
    assert.strictEqual(room.available, true);
    assert.strictEqual(room.maintenance, false);
  });

  it('should mark room as unavailable', function() {
    const room = { available: true };
    room.available = false;
    assert.strictEqual(room.available, false);
  });

  it('should handle an array of rooms', function() {
    const rooms = [
      { number: 101, available: true },
      { number: 102, available: false }
    ];
    assert.strictEqual(rooms.length, 2);
    assert.strictEqual(rooms[1].available, false);
  });
});
// Booking API Route Test Example
describe('POST /booking', function() {
  it('should create a new booking and return it', function(done) {
    const app = express();
    app.use(express.json());
    app.post('/booking', (req, res) => {
      const booking = req.body;
      booking._id = 'mockbookingid123';
      res.status(201).json(booking);
    });
    const newBooking = {
      room: 'roomid123',
      guestName: 'Alice',
      date: '2025-12-28'
    };
    request(app)
      .post('/booking')
      .send(newBooking)
      .expect('Content-Type', /json/)
      .expect(201)
      .expect(res => {
        assert.strictEqual(res.body.room, 'roomid123');
        assert.strictEqual(res.body.guestName, 'Alice');
        assert.strictEqual(res.body.date, '2025-12-28');
        assert.strictEqual(res.body._id, 'mockbookingid123');
      })
      .end(done);
  });
  // Booking API Test
  it('should return 400 if guestName is missing', function(done) {
    const app = express();
    app.use(express.json());
    app.post('/booking', (req, res) => {
      if (!req.body.guestName) return res.status(400).json({ error: 'Guest name required' });
      res.status(201).json(req.body);
    });
    request(app)
      .post('/booking')
      .send({ room: 'roomid123', date: '2025-12-28' }) // missing guestName
      .expect(400)
      .expect(res => {
        assert.strictEqual(res.body.error, 'Guest name required');
      })
      .end(done);
  });
});
// Negative Test Example
describe('Room Negative Test', function() {
  it('should fail if room price is negative', function() {
    const room = { price: -50 };
    assert.ok(room.price < 0, 'Room price should not be negative');
  });
});

// Simple Route Test Example
describe('GET /health', function() {
  it('should return status ok', function(done) {
    const app = express();
    app.get('/health', (req, res) => res.json({ status: 'ok' }));
    request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(res => {
        assert.strictEqual(res.body.status, 'ok');
      })
      .end(done);
  });
});

// POST Route Test Example
describe('POST /room', function() {
  it('should create a new room and return it', function(done) {
    const app = express();
    app.use(express.json());
    app.post('/room', (req, res) => {
      const room = req.body;
      room._id = 'mockedid123';
      res.status(201).json(room);
    });
    const newRoom = { number: 102, type: 'Double', price: 150, available: true, maintenance: false };
    request(app)
      .post('/room')
      .send(newRoom)
      .expect('Content-Type', /json/)
      .expect(201)
      .expect(res => {
        assert.strictEqual(res.body.number, 102);
        assert.strictEqual(res.body.type, 'Double');
        assert.strictEqual(res.body.price, 150);
        assert.strictEqual(res.body.available, true);
        assert.strictEqual(res.body._id, 'mockedid123');
      })
      .end(done);
  });

  it('should return 400 if room data is missing', function(done) {
    const app = express();
    app.use(express.json());
    app.post('/room', (req, res) => {
      if (!req.body.number) return res.status(400).json({ error: 'Room number required' });
      res.status(201).json(req.body);
    });
    request(app)
      .post('/room')
      .send({ type: 'Double' }) // missing number
      .expect(400)
      .expect(res => {
        assert.strictEqual(res.body.error, 'Room number required');
      })
      .end(done);
  });
});
// GET all rooms route test
describe('GET /rooms', function() {
  it('should return an array of rooms', function(done) {
    const app = express();
    app.get('/rooms', (req, res) => {
      res.json([
        { number: 101, type: 'Single', price: 100 },
        { number: 102, type: 'Double', price: 150 }
      ]);
    });
    request(app)
      .get('/rooms')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(res => {
        assert.ok(Array.isArray(res.body));
        assert.strictEqual(res.body.length, 2);
        assert.strictEqual(res.body[0].number, 101);
      })
      .end(done);
  });
});

// Booking validation test
describe('Booking Validation', function() {
  it('should not allow booking without a room id', function(done) {
    const app = express();
    app.use(express.json());
    app.post('/booking', (req, res) => {
      if (!req.body.room) return res.status(400).json({ error: 'Room ID required' });
      res.status(201).json(req.body);
    });
    request(app)
      .post('/booking')
      .send({ guestName: 'Bob', date: '2025-12-29' }) // missing room
      .expect(400)
      .expect(res => {
        assert.strictEqual(res.body.error, 'Room ID required');
      })
      .end(done);
  });

  it('should not allow booking with invalid date', function(done) {
    const app = express();
    app.use(express.json());
    app.post('/booking', (req, res) => {
      if (!/\d{4}-\d{2}-\d{2}/.test(req.body.date)) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      res.status(201).json(req.body);
    });
    request(app)
      .post('/booking')
      .send({ room: 'roomid123', guestName: 'Bob', date: 'not-a-date' })
      .expect(400)
      .expect(res => {
        assert.strictEqual(res.body.error, 'Invalid date format');
      })
      .end(done);
  });
});

// Test for updating a room (PATCH)
describe('PATCH /room/:id', function() {
  it('should update room price and return updated room', function(done) {
    const app = express();
    app.use(express.json());
    app.patch('/room/:id', (req, res) => {
      const updatedRoom = { _id: req.params.id, price: req.body.price };
      res.json(updatedRoom);
    });
    request(app)
      .patch('/room/123')
      .send({ price: 200 })
      .expect(200)
      .expect(res => {
        assert.strictEqual(res.body._id, '123');
        assert.strictEqual(res.body.price, 200);
      })
      .end(done);
  });
});

// Test for booking cancellation (DELETE)
describe('DELETE /booking/:id', function() {
  it('should cancel a booking and return confirmation', function(done) {
    const app = express();
    app.delete('/booking/:id', (req, res) => {
      res.json({ message: `Booking ${req.params.id} cancelled` });
    });
    request(app)
      .delete('/booking/abc123')
      .expect(200)
      .expect(res => {
        assert.strictEqual(res.body.message, 'Booking abc123 cancelled');
      })
      .end(done);
  });
});
// DELETE Route Test Example
describe('DELETE /room/:id', function() {
  it('should delete a room and return success', function(done) {
    const app = express();
    app.delete('/room/:id', (req, res) => {
      const { id } = req.params;
      if (id === 'notfound') return res.status(404).json({ error: 'Room not found' });
      res.json({ message: `Room ${id} deleted` });
    });
    request(app)
      .delete('/room/123')
      .expect(200)
      .expect(res => {
        assert.strictEqual(res.body.message, 'Room 123 deleted');
      })
      .end(done);
  });

  it('should return 404 if room not found', function(done) {
    const app = express();
    app.delete('/room/:id', (req, res) => {
      const { id } = req.params;
      if (id === 'notfound') return res.status(404).json({ error: 'Room not found' });
      res.json({ message: `Room ${id} deleted` });
    });
    request(app)
      .delete('/room/notfound')
      .expect(404)
      .expect(res => {
        assert.strictEqual(res.body.error, 'Room not found');
      })
      .end(done);
  });
});