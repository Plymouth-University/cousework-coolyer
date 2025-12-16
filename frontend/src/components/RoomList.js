import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const socket = io('http://localhost:5000');

function RoomList() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    const res = await axios.get('http://localhost:5000/api/rooms');
    setRooms(res.data);
  };

  useEffect(() => {
    fetchRooms();

    socket.on('roomBooked', ({ roomId }) => {
      setRooms(prev => prev.map(r =>
        r._id === roomId ? { ...r, available: false } : r
      ));
    });

    socket.on('roomUnbooked', () => {
      fetchRooms();
    });

    socket.on('roomMaintenance', () => {
      fetchRooms();
      console.log('Received roomMaintenance event, fetching rooms');
    });

    socket.on('roomDeleted', () => {
      fetchRooms();
    });

    socket.on('newRoom', () => {
      fetchRooms();
      console.log('Received newRoom event, fetching rooms');
    });
    socket.on('resetRooms', () => setRooms(prev => prev.map(r => ({ ...r, available: true }))));

    socket.on('roomUpdated', (updatedRoom) => {
    setRooms(prev =>
      prev.map(r => r._id === updatedRoom._id ? updatedRoom : r)
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
  }, []);

  const startBooking = (room) => navigate('/payment', { state: { room } });

  return (
    <div>
      <h2>Available Rooms</h2>
      <ul>
        {rooms.map(r => (
          <li key={r._id}>
            Room {r.number} - {r.type} - ${r.price} -{" "}
            {r.maintenance
              ? "Under Maintenance"
              : r.available
                ? "Available"
                : `Booked by ${r.bookedBy || "Unknown"}`}
            {r.available && !r.maintenance && (
              <button onClick={() => startBooking(r)}>Book</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RoomList;
