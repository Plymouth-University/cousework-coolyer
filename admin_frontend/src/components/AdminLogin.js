import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminLogin = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminHealth, setAdminHealth] = useState('checking');
  const navigate = useNavigate();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/admin/health');
        setAdminHealth(res.data.status === 'ok' ? 'Healthy' : 'Unhealthy');
      } catch {
        setAdminHealth('Server Down');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    if (adminHealth !== 'Healthy') {
      alert('Cannot login: Admin backend is down.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:8000/api/admin/login', { username, password });
      if (res.data.success) {
        onLoginSuccess();
        navigate('/admin/dashboard');
      } else {
        alert('Invalid credentials');
      }
    } catch (err) {
      alert('Login failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Admin Login</h2>
      <p>
        Admin Backend Health: <strong>{adminHealth === 'checking' ? 'Checking...' : adminHealth}</strong>
      </p>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        disabled={adminHealth !== 'Healthy'}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        disabled={adminHealth !== 'Healthy'}
      />
      <button
        onClick={handleLogin}
        style={{ width: '100%', padding: '12px', fontSize: '16px' }}
        disabled={adminHealth !== 'Healthy'}
      >
        Login
      </button>
    </div>
  );
};

export default AdminLogin;
