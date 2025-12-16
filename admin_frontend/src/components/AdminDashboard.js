import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AddRoom from './AddRoom';
import EditRoom from './EditRoom';
import BookingsList from './BookingsList';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:8000'; // For admin API requests
const SOCKET_URL = 'http://localhost:5000'; // For real-time booking events
const socket = io(SOCKET_URL);

const AdminDashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [adminHealth, setAdminHealth] = useState('unknown');
  const [dbHealth, setDbHealth] = useState('unknown');
  const [hotelHealth, setHotelHealth] = useState('unknown');
  const [editingRoom, setEditingRoom] = useState(null);

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/bookings`);
      setBookings(res.data);
      console.log("Bookings fetched:", res.data);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
  };

  const handleUnbookRoom = async (bookingId) => {
    try {
      await axios.delete(`${API_URL}/api/admin/unbook/${bookingId}`);
      fetchBookings(); // refresh bookings list
      fetchRooms();    // refresh rooms list so availability updates
    } catch (error) {
      console.error("Failed to unbook:", error);
    }
  };
  
  const handleDeleteBooking = async (bookingId) => {
    try {
      await axios.delete(`${API_URL}/api/admin/bookings/${bookingId}`);
      fetchBookings();
      fetchRooms();
    } catch (err) {
      console.error("Failed to delete booking:", err);
    }
  };

  // Fetch rooms
  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/rooms`);
      setRooms(res.data);
      console.log("Rooms fetched:", res.data);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    }
  };

  // Reset rooms/bookings
  const resetBookings = async () => {
    try {
      await axios.post(`${API_URL}/api/admin/reset`);
      alert('All rooms reset to available');
      fetchBookings();
      fetchRooms();
    } catch (err) {
      console.error("Failed to reset bookings:", err);
    }
  };

  // Move checkHealth outside useEffect so it can be used elsewhere
  const checkHealth = async () => {
    try {
      try {
        const adminRes = await axios.get(`${API_URL}/api/admin/health`);
        setAdminHealth(adminRes.data.status === 'ok' ? 'Healthy' : 'Unhealthy');
      } catch {
        setAdminHealth('Server Down');
      }
      try {
        const dbRes = await axios.get(`${API_URL}/api/admin/dbhealth`);
        setDbHealth(dbRes.data.status === 'ok' ? 'Healthy' : 'Unhealthy');
      } catch {
        setDbHealth('Server Down');
      }
      try {
        const hotelRes = await axios.get('http://localhost:5000/api/health');
        setHotelHealth(hotelRes.data.status === 'ok' ? 'Healthy' : 'Unhealthy');
      } catch {
        setHotelHealth('Server Down');
      }
    } catch (err) {
      setAdminHealth('Server Down');
      setDbHealth('Server Down');
      setHotelHealth('Server Down');
    }
  };

  // Manual refresh button
  const refreshData = () => {
    fetchBookings();
    fetchRooms();
    checkHealth(); 
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);

    // Real-time updates via Socket.IO
    socket.on('newRoom', (room) => setRooms(prev => [...prev, room]));
    socket.on('resetRooms', () => {
      fetchRooms();
      fetchBookings();
    });

    socket.on('newBooking', (booking) => {
      fetchBookings();
      fetchRooms();
    });

    // Listen for maintenance, unbook, and delete events
    socket.on('roomMaintenance', () => {
      fetchRooms();
      fetchBookings();
    });
    socket.on('roomUnbooked', () => {
      fetchRooms();
      fetchBookings();
    });
    socket.on('roomDeleted', () => {
      fetchRooms();
      fetchBookings();
    });
    socket.on('roomUpdated', (updatedRoom) => {
      setRooms(prevRooms =>
        prevRooms.map(room => room._id === updatedRoom._id ? updatedRoom : room)
      );
    });
    return () => {
      clearInterval(interval); // Clear interval on unmount
      socket.off('newRoom');
      socket.off('resetRooms');
      socket.off('newBooking');
      socket.off('roomMaintenance');
      socket.off('roomUnbooked');
      socket.off('roomDeleted');
      socket.off('roomUpdated');
    };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin Dashboard</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={resetBookings} style={{ padding: '10px', marginRight: '10px' }}>
          Reset All Bookings
        </button>
        <button onClick={refreshData} style={{ padding: '10px' }}>
          Refresh Data
        </button>
      </div>

      <AddRoom onRoomAdded={fetchRooms} />
      <BookingsList 
        bookings={bookings} 
        onDeleteBooking={handleDeleteBooking} 
      />
      {/* Optional: display rooms */}
      <h3>Rooms</h3>
      <ul>
        {rooms.map(r => (
          <li key={r._id}>
            Room {r.number} - {r.type} - ${r.price} - 
            {r.maintenance
              ? "Under Maintenance"
              : r.available
                ? "Available"
                : `Booked by ${r.bookedBy || "Unknown"}`}

            {/* Edit button */}
            <button
              style={{ marginLeft: "10px" }}
              onClick={() => setEditingRoom(r)}
            >
              Edit
            </button>

            {/* Show EditRoom form if this room is being edited */}
            {editingRoom && editingRoom._id === r._id && (
              <EditRoom
                room={editingRoom}
                onSave={() => {
                  setEditingRoom(null);
                  fetchRooms();
                }}
                onCancel={() => setEditingRoom(null)}
              />
            )}

            {/* Show Unbook only if booked (not available, not maintenance) */}
            {!r.available && !r.maintenance && (
              <button
                style={{ marginLeft: "10px" }}
                onClick={() => {
                  const booking = bookings.find(
                    b =>
                      (b.room && b.room._id && b.room._id === r._id) ||
                      (b.room && typeof b.room === "string" && b.room === r._id)
                  );
                  if (booking) {
                    handleDeleteBooking(booking._id);
                  } else {
                    alert("No booking found for this room. Try refreshing.");
                    fetchBookings();
                  }
                }}
              >
                Unbook
              </button>
            )}

            {/* Maintenance/End Maintenance buttons */}
            {!r.maintenance && (
              <button
                style={{ marginLeft: "10px", color: "orange" }}
                onClick={async () => {
                  try {
                    await axios.patch(`${API_URL}/api/admin/rooms/${r._id}/maintenance`, { maintenance: true });
                    fetchRooms();
                  } catch (err) {
                    alert("Failed to mark room as under maintenance.");
                  }
                }}
              >
                Maintenance
              </button>
            )}

            {r.maintenance && (
              <button
                style={{ marginLeft: "10px", color: "green" }}
                onClick={async () => {
                  try {
                    await axios.patch(`${API_URL}/api/admin/rooms/${r._id}/maintenance`, { maintenance: false });
                    fetchRooms();
                  } catch (err) {
                    alert("Failed to remove room from maintenance.");
                  }
                }}
              >
                End Maintenance
              </button>
            )}

            <button
              style={{ marginLeft: "10px", color: "red" }}
              onClick={async () => {
                if (window.confirm("Are you sure you want to delete this room?")) {
                  try {
                    await axios.delete(`${API_URL}/api/admin/rooms/${r._id}`);
                    fetchRooms();
                    fetchBookings();
                  } catch (err) {
                    alert("Failed to delete room.");
                  }
                }
              }}
            >
              Delete Room
            </button>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '40px' }}>
        <h3>System Health</h3>
        <p>Admin API Health: <strong>{adminHealth === 'unknown' ? 'Server Down' : adminHealth}</strong></p>
        <p>Database Health: <strong>{dbHealth === 'unknown' ? 'Server Down' : dbHealth}</strong></p>
        <p>Hotel Backend Health: <strong>{hotelHealth === 'unknown' ? 'Server Down' : hotelHealth}</strong></p>
      </div>
    </div>
  );
};

export default AdminDashboard;