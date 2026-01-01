import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoomList from './components/RoomList';
import Payment from './components/Payment';
import RoomDescription from './components/RoomDescription';

function App() {
  return (
    <Router>
      <Routes>
        {/* User facing end routes */}
        <Route path="/" element={<RoomList />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/room/:id" element={<RoomDescription />} />
      </Routes>
    </Router>
  );
}

export default App;
