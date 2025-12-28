import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

function EditRoom({ room, onSave, onCancel }) {
  const [number, setNumber] = useState(room.number);
  const [type, setType] = useState(room.type);
  const [price, setPrice] = useState(room.price);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API_URL}/api/admin/rooms/${room._id}`, {
        number,
        type,
        price,
      });
      onSave && onSave();
    } catch (err) {
      alert('Failed to update room');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: '10px 0' }}>
      <input value={number} onChange={e => setNumber(e.target.value)} placeholder="Room Number" />
      <select
        value={type}
        onChange={e => setType(e.target.value)}
        style={{ marginRight: '10px' }}
      >
        <option value="">Select Type</option>
        <option value="Single">Single</option>
        <option value="Double">Double</option>
        <option value="Twin">Twin</option>
      </select>
      <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" type="number" />
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
    </form>
  );
}

export default EditRoom;