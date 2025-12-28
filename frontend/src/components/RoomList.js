import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const socket = io('http://localhost:5000');

function RoomList() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  // 1. Memoize imageMap
  const imageMap = useMemo(() => ({
    'Single': '/single.jpg',
    'Double': '/double.jpg',
    'Twin': '/twins.jpg',
  }), []);

  // 2. Memoize fetchRooms
  const fetchRooms = useCallback(async () => {
    const res = await axios.get('http://localhost:5000/api/rooms');
    const roomsWithImages = res.data.map(room => ({
      ...room,
      imageUrl: imageMap[room.type] || '/single.jpg'
    }));
    setRooms(roomsWithImages);
  }, [imageMap]);

  useEffect(() => {
    document.title = "Hotel Frontend";
  }, []);

  useEffect(() => {
    fetchRooms();

    socket.on('roomBooked', ({ roomId }) => {
      setRooms(prev => prev.map(r =>
        r._id === roomId
          ? { ...r, available: false, imageUrl: imageMap[r.type] || '/single.jpg' }
          : r
      ));
    });

    socket.on('roomUnbooked', () => {
      fetchRooms();
    });

    socket.on('roomMaintenance', () => {
      fetchRooms();
    });

    socket.on('roomDeleted', () => {
      fetchRooms();
    });

    socket.on('newRoom', () => {
      fetchRooms();
    });

    socket.on('resetRooms', () => setRooms(prev =>
      prev.map(r => ({
        ...r,
        available: true,
        imageUrl: imageMap[r.type] || '/single.jpg'
      }))
    ));

    socket.on('roomUpdated', (updatedRoom) => {
      setRooms(prev =>
        prev.map(r =>
          r._id === updatedRoom._id
            ? { ...updatedRoom, imageUrl: imageMap[updatedRoom.type] || '/single.jpg' }
            : r
        )
      );
    });

    return () => {
      socket.off('roomBooked');
      socket.off('roomUnbooked');
      socket.off('roomMaintenance');
      socket.off('roomDeleted');
      socket.off('newRoom');
      socket.off('resetRooms');
      socket.off('roomUpdated');
    };
  }, [fetchRooms, imageMap]); // Now safe!

  const startBooking = (room) => navigate('/payment', { state: { room } });

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginTop: '30px', marginBottom: '10px', fontSize: '2.5rem', letterSpacing: '2px' }}>
        COMP3016 Hotel Management
      </h1>
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#555' }}>
        Available Rooms
      </h2>
      <div className="room-list">
        {rooms.map(r => (
          <div className="room-card" key={r._id}>
            <img
              src={r.imageUrl}
              alt={r.type}
              className="room-image"
            />
            <div className="room-type">{r.type}</div>
            <div className="room-price">£{r.price}</div>
            {r.maintenance ? (
              <div className="room-status">Under Maintenance</div>
            ) : r.available ? (
              <button className="book-now-btn" onClick={() => startBooking(r)}>
                Book Now
              </button>
            ) : (
              <div className="room-status">
                Booked {r.bookedBy ? `by ${r.bookedBy}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoomList;