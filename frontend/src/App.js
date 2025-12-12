import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoomList from './components/RoomList';
import Payment from './components/Payment';

function App() {
  return (
    <Router>
      <Routes>
        {/* User-facing routes */}
        <Route path="/" element={<RoomList />} />
        <Route path="/payment" element={<Payment />} />
      </Routes>
    </Router>
  );
}

export default App;
