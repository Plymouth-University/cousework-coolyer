import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const Payment = ({ onComplete }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { room } = location.state || {}; // room passed from RoomList

  const [name, setName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
  document.title = "Payment Page for Room " + (room ? room.number : "");
  }, [room]);
  // Redirect back if no room is passed
  useEffect(() => {
    if (!room) navigate('/');
  }, [room, navigate]);

  if (!room) return null; // safeguard if no room

  const handlePayment = async () => {
    if (!name || !cardNumber || !expiry || !cvc) {
      return alert("Please fill in all payment fields");
    }

    setProcessing(true);

    // Fake payment delay
    setTimeout(async () => {
      try {
        const res = await axios.post('http://localhost:5000/api/bookings', {
          roomId: room._id,
          guestName: name // this won't be displayed publicly
        });

        setProcessing(false);

        onComplete && onComplete(res.data);

        alert(`Successfully booked Room ${res.data.room.number} for £${res.data.room.price}`);
        navigate('/');

      } catch (err) {
        setProcessing(false);
        alert("Payment failed: " + (err.response?.data?.error || err.message));
      }
    }, 1500);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Payment for Room {room.number}</h2>
      <p>Price: £{room.price}</p>

      <input
        type="text"
        placeholder="Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={processing}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />

      <input
        type="text"
        placeholder="Card Number"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value)}
        disabled={processing}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />

      <input
        type="text"
        placeholder="MM/YY"
        value={expiry}
        onChange={(e) => setExpiry(e.target.value)}
        disabled={processing}
        style={{ width: '48%', padding: '10px', marginRight: '4%', marginBottom: '10px' }}
      />

      <input
        type="text"
        placeholder="CVC"
        value={cvc}
        onChange={(e) => setCvc(e.target.value)}
        disabled={processing}
        style={{ width: '48%', padding: '10px', marginBottom: '10px' }}
      />

      <button
        onClick={handlePayment}
        disabled={processing}
        style={{ width: '100%', padding: '12px', fontSize: '16px' }}
      >
        {processing ? "Processing..." : "Pay Now"}
      </button>

      {processing && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <div className="spinner"></div>
          <p>Processing payment…</p>
        </div>
      )}

      <style>{`
        .spinner {
          margin: 0 auto;
          width: 40px;
          height: 40px;
          border: 4px solid #ccc;
          border-top-color: #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Payment;
