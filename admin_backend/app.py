from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from flask_socketio import SocketIO
from datetime import datetime
import sys
import requests

# --- Flask App Setup ---
app = Flask(__name__)
CORS(app, origins=["http://localhost:7000", "http://localhost:3000"])  # allow admin & hotel frontends
socketio = SocketIO(app, cors_allowed_origins="*")

# --- MongoDB Setup ---
client = MongoClient("mongodb://hotel_mongo:27017/hotel")  # Docker service name
db = client.hotel
rooms_collection = db.rooms
bookings_collection = db.bookings

# --- Admin Credentials ---
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123"

# --- Routes ---

# Admin login
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    if data.get('username') == ADMIN_USERNAME and data.get('password') == ADMIN_PASSWORD:
        return jsonify({"success": True}), 200
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

# Health for page
@app.route('/api/admin/health', methods=['GET'])
def admin_health():
    return jsonify({"status": "ok"}), 200

# Health for DB
@app.route('/api/admin/dbhealth', methods=['GET'])
def db_health():
    try:
        rooms_collection.count_documents({})
        return jsonify({"status": "ok"}), 200
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

# Get all bookings
@app.route('/api/admin/bookings', methods=['GET'])
def get_bookings():
    try:
        bookings = list(bookings_collection.find({}))
        result = []
        for b in bookings:
            booking_data = {
                "_id": str(b['_id']),
                "guestName": b.get('guestName')
            }
            room_id = b.get('room')
            if room_id:
                room = rooms_collection.find_one({"_id": room_id})
                if room:
                    booking_data['room'] = {
                        "_id": str(room.get('_id')),
                        "number": room.get('number'),
                        "type": room.get('type'),
                        "price": room.get('price')
                    }
                else:
                    booking_data['room'] = None
            else:
                booking_data['room'] = None
            result.append(booking_data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/book', methods=['POST'])
def book_room():
    data = request.json
    room_id = ObjectId(data['roomId'])
    guest_name = data['guestName']
    rooms_collection.update_one(
        {"_id": room_id},
        {"$set": {"available": False}}
    )
    booking = {
        "room": room_id,
        "guestName": guest_name,
        "date": datetime.utcnow()
    }
    result = bookings_collection.insert_one(booking)
    booking_id = result.inserted_id
    socketio.emit('newBooking', {
        "_id": str(booking_id),
        "room": {
            "number": data.get('roomNumber'),
            "type": data.get('roomType'),
            "price": data.get('roomPrice')
        },
        "guestName": guest_name
    })
    socketio.emit('roomBooked', {
        "roomId": str(room_id)
    })
    return jsonify({"success": True}), 201

# Delete a booking by ID
@app.route('/api/admin/bookings/<booking_id>', methods=['DELETE'])
def delete_booking(booking_id):
    try:
        booking = bookings_collection.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        room_id = booking.get('room')
        if room_id:
            rooms_collection.update_one(
                {"_id": room_id},
                {"$set": {"available": True, "bookedBy": None}}
            )
        bookings_collection.delete_one({"_id": ObjectId(booking_id)})
        socketio.emit('roomUnbooked', {"roomId": str(room_id)})
        return jsonify({"message": "Booking deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/rooms/<room_id>', methods=['DELETE'])
def delete_room(room_id):
    try:
        # delete to the hotel backend dont need to call the database directly
        try:
            resp = requests.delete(f'http://hotel_backend:5000/api/rooms/{room_id}', timeout=2)
            print("Hotel backend delete response:", resp.status_code, resp.text, file=sys.stderr)
            return (resp.text, resp.status_code, resp.headers.items())
        except Exception as e:
            print("Failed to notify hotel backend for delete:", e, file=sys.stderr)
            return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/rooms/<room_id>/maintenance', methods=['PATCH'])
def set_room_maintenance(room_id):
    try:
        data = request.json
        resp = requests.patch(f'http://hotel_backend:5000/api/rooms/{room_id}/maintenance', json=data)
        return (resp.text, resp.status_code, resp.headers.items())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/admin/rooms/<room_id>', methods=['PATCH'])
def edit_room(room_id):
    try:
        data = request.json
        print(f"[ADMIN PATCH] Received edit for room {room_id} with data: {data}", file=sys.stderr)
        # Forward the PATCH to the hotel backend
        try:
            resp = requests.patch(f'http://hotel_backend:5000/api/rooms/{room_id}', json=data, timeout=3)
            print(f"[ADMIN PATCH] Hotel backend response: {resp.status_code} {resp.text}", file=sys.stderr)
        except Exception as e:
            print(f"[ADMIN PATCH] Error contacting hotel backend: {e}", file=sys.stderr)
            return jsonify({"error": f"Hotel backend error: {str(e)}"}), 500
        return (resp.text, resp.status_code, resp.headers.items())
    except Exception as e:
        print(f"[ADMIN PATCH] Exception: {e}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500
# Get all rooms
@app.route('/api/admin/rooms', methods=['GET'])
def get_rooms():
    try:
        resp = requests.get('http://hotel_backend:5000/api/rooms')
        return (resp.text, resp.status_code, resp.headers.items())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add a new room
@app.route('/api/admin/rooms', methods=['POST'])
def add_room():
    print("Received request to add room:",file=sys.stderr)
    try:
        data = request.json
        room = {
            "number": data['number'],
            "type": data['type'],
            "price": data['price'],
            "available": True,
            "bookedBy": None,
            "maintenance": False  
        }
        # Silly mistake of adding a insert to database and a call emit. 
        #rooms_collection.insert_one(room)
        #socketio.emit('newRoom', room)
        room.pop('_id', None)
        # Notify hotel backend to add the room and emit its own event
        try:
            resp = requests.post('http://hotel_backend:5000/api/rooms', json=room, timeout=2)
            print("Hotel backend response:", resp.status_code, resp.text, file=sys.stderr)
        except Exception as e:
            print("Failed to notify hotel backend:", e, file=sys.stderr)
        return jsonify({"message": "Room added"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# Reset all rooms to available
@app.route('/api/admin/reset', methods=['POST'])
def reset_rooms():
    try:
        rooms_collection.update_many({}, {"$set": {"available": True, "bookedBy": None}})
        bookings_collection.delete_many({})
        socketio.emit('resetRooms')
        return jsonify({"message": "All rooms reset"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/unbook/<booking_id>', methods=['DELETE'])
def unbook_room(booking_id):
    try:
        booking = bookings_collection.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            return jsonify({"error": "Booking not found"}), 404
        room_id = booking.get('room')
        if room_id:
            rooms_collection.update_one(
                {"_id": room_id},
                {"$set": {"available": True, "bookedBy": None}}
            )
        bookings_collection.delete_one({"_id": ObjectId(booking_id)})
        socketio.emit('roomUnbooked', {"roomId": str(room_id)})
        return jsonify({"message": "Booking unbooked and deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Run App ---
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=6000, debug=True, allow_unsafe_werkzeug=True)