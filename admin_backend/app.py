from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from flask_socketio import SocketIO
from datetime import datetime
import sys
import requests
import jwt
import datetime
from functools import wraps
import os
from dotenv import load_dotenv
load_dotenv()
from werkzeug.security import check_password_hash

# --- Flask App Setup ---
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:7000", "http://localhost:3000"]}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- MongoDB Setup ---
client = MongoClient("mongodb://hotel_mongo:27017/hotel")
db = client.hotel
rooms_collection = db.rooms
bookings_collection = db.bookings

# --- Admin Credentials ---
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME")
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH")
SECRET_KEY = os.environ.get("JWT_SECRET", "password123")
# print("Loaded SECRET_KEY:", SECRET_KEY, file=sys.stderr)
# --- Token Required Decorator ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # print(" Authorization header received:", request.headers.get('Authorization'), file=sys.stderr)
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        if not token:
            #print(" Token is missing!", file=sys.stderr)
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except Exception as e:
            #print(" Token is invalid! Exception:", e, file=sys.stderr)
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(*args, **kwargs)
    return decorated

# --- Routes ---

# Admin login (returns JWT)
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    if (
        data.get('username') == ADMIN_USERNAME and
        check_password_hash(ADMIN_PASSWORD_HASH, data.get('password'))
    ):
        token = jwt.encode(
            {
                'user': ADMIN_USERNAME,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
            },
            SECRET_KEY,
            algorithm="HS256"
        )
        return jsonify({"success": True, "token": token}), 200
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
@token_required
def get_bookings():
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

# Delete a booking by ID
@app.route('/api/admin/bookings/<booking_id>', methods=['DELETE'])
@token_required
def delete_booking(booking_id):
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

# Get all rooms
@app.route('/api/admin/rooms', methods=['GET'])
@token_required
def get_rooms():
    resp = requests.get('http://hotel_backend:5000/api/rooms')
    return (resp.text, resp.status_code, resp.headers.items())

# Add a new room
@app.route('/api/admin/rooms', methods=['POST'])
@token_required
def add_room():
    data = request.json
    room = {
        "number": data['number'],
        "type": data['type'],
        "price": data['price'],
        "available": True,
        "bookedBy": None,
        "maintenance": False  
    }
    room.pop('_id', None)
    try:
        resp = requests.post('http://hotel_backend:5000/api/rooms', json=room, timeout=2)
    except Exception as e:
        print("Failed to notify hotel backend:", e, file=sys.stderr)
    return jsonify({"message": "Room added"}), 201

# Delete a room by ID
@app.route('/api/admin/rooms/<room_id>', methods=['DELETE'])
@token_required
def delete_room(room_id):
    try:
        resp = requests.delete(f'http://hotel_backend:5000/api/rooms/{room_id}', timeout=2)
        print("Hotel backend delete response:", resp.status_code, resp.text, file=sys.stderr)
        return (resp.text, resp.status_code, resp.headers.items())
    except Exception as e:
        print("Failed to notify hotel backend for delete:", e, file=sys.stderr)
        return jsonify({"error": str(e)}), 500

# Edit a room by ID
@app.route('/api/admin/rooms/<room_id>', methods=['PATCH'])
@token_required
def edit_room(room_id):
    data = request.json
    print(f"[ADMIN PATCH] Received edit for room {room_id} with data: {data}", file=sys.stderr)
    try:
        resp = requests.patch(f'http://hotel_backend:5000/api/rooms/{room_id}', json=data, timeout=3)
        print(f"[ADMIN PATCH] Hotel backend response: {resp.status_code} {resp.text}", file=sys.stderr)
    except Exception as e:
        print(f"[ADMIN PATCH] Error contacting hotel backend: {e}", file=sys.stderr)
        return jsonify({"error": f"Hotel backend error: {str(e)}"}), 500
    return (resp.text, resp.status_code, resp.headers.items())

# Set room maintenance
@app.route('/api/admin/rooms/<room_id>/maintenance', methods=['PATCH'])
@token_required
def set_room_maintenance(room_id):
    data = request.json
    resp = requests.patch(f'http://hotel_backend:5000/api/rooms/{room_id}/maintenance', json=data)
    return (resp.text, resp.status_code, resp.headers.items())

# Reset all rooms to available
@app.route('/api/admin/reset', methods=['POST'])
@token_required
def reset_rooms():
    rooms_collection.update_many({}, {"$set": {"available": True, "bookedBy": None}})
    bookings_collection.delete_many({})
    socketio.emit('resetRooms')
    return jsonify({"message": "All rooms reset"}), 200

# Unbook a room
@app.route('/api/admin/unbook/<booking_id>', methods=['DELETE'])
@token_required
def unbook_room(booking_id):
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

# --- Run App ---
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=6000, debug=True, allow_unsafe_werkzeug=True)