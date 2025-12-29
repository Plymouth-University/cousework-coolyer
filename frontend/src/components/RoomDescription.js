import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const defaultDescriptions = {
  Single: 'A beautiful single room with en-suite toilet, perfect for solo travelers.',
  Double: 'A spacious double room with a comfortable bed and private bathroom.',
  Twin: 'A cozy twin room with two beds and modern amenities, ideal for friends or family.',
};

function RoomDescription() {
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.room;

  if (!room) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>Room not found</h2>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const description = room.description || defaultDescriptions[room.type] || 'No description provided.';

  const handleBookNow = () => {
    navigate('/payment', { state: { room } });
  };

  return (
    <div className="room-description" style={{ maxWidth: 500, margin: '40px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8 }}>
      <img src={room.imageUrl} alt={room.type} style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} />
      <h2>{room.type} Room</h2>
      <p><strong>Price:</strong> £{room.price}</p>
      <p><strong>Status:</strong> {room.maintenance ? 'Under Maintenance' : room.available ? 'Available' : 'Booked'}</p>
      <p><strong>Description:</strong> {description}</p>
      {room.available && !room.maintenance && (
        <button
          className="book-now-btn"
          style={{ marginTop: 16, marginRight: 8 }}
          onClick={handleBookNow}
        >
          Book Now
        </button>
      )}
      <button
        style={{
          marginTop: 16,
          background: '#f5f5f5',
          color: '#333',
          border: '1px solid #bbb',
          borderRadius: 6,
          padding: '8px 8px',
          fontWeight: 500,
          fontSize: 16,
          cursor: 'pointer',
          transition: 'background 0.2s, color 0.2s',
        }}
        onMouseOver={e => {
          e.target.style.background = '#e0e0e0';
          e.target.style.color = '#1976d2';
        }}
        onMouseOut={e => {
          e.target.style.background = '#f5f5f5';
          e.target.style.color = '#333';
        }}
        onClick={() => navigate(-1)}
      >
        ← Back to List
      </button>
    </div>
  );
}

export default RoomDescription;