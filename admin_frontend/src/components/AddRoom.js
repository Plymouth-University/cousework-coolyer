import React, { useState } from 'react';
import axios from 'axios';

const AddRoom = ({ onRoomAdded }) => {
  const [number, setNumber] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');

  const handleAddRoom = async () => {
    if (!number || !type || !price) return alert('Fill all fields');
    try {
      await axios.post('http://localhost:8000/api/admin/rooms', { number, type, price });
      alert('Room added!');
      setNumber('');
      setType('');
      setPrice('');
      onRoomAdded && onRoomAdded();
    } catch (err) {
      alert('Failed to add room: ' + err.message);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>Add Room</h3>
      <input
        type="text"
        placeholder="Room Number"
        value={number}
        onChange={e => setNumber(e.target.value)}
        style={{ marginRight: '10px' }}
      />
      <input
        type="text"
        placeholder="Type"
        value={type}
        onChange={e => setType(e.target.value)}
        style={{ marginRight: '10px' }}
      />
      <input
        type="number"
        placeholder="Price"
        value={price}
        onChange={e => setPrice(e.target.value)}
        style={{ marginRight: '10px' }}
      />
      <button onClick={handleAddRoom}>Add Room</button>
    </div>
  );
};

export default AddRoom;
