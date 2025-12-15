import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin onLoginSuccess={() => setIsAdminLoggedIn(true)} />} />
        <Route path="/admin/dashboard" element={isAdminLoggedIn ? <AdminDashboard /> : <AdminLogin onLoginSuccess={() => setIsAdminLoggedIn(true)} />} />
      </Routes>
      <div style={{ marginBottom: '10px' }}>
      </div>
    </Router>
  );
}

export default App;