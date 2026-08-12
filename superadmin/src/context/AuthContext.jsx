import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('sa_token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        }
      } catch (error) {
        console.error('Auth check failed', error);
        localStorage.removeItem('sa_token');
        delete api.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Verify they are actually a SUPERADMIN
      if (res.data.user.role !== 'SUPERADMIN') {
        throw new Error('Access denied. Superadmin privileges required.');
      }
      
      setUser(res.data.user);
      if (res.data.token) {
        localStorage.setItem('sa_token', res.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      }
      return true;
    } catch (error) {
      console.error(error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await api.get('/auth/logout');
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    localStorage.removeItem('sa_token');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
