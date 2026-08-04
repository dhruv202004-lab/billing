import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';
import { initDB } from '../database/sqlite';
import { syncService } from '../services/syncService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrapAsync = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Initialize SQLite DB
        await initDB();

        // Perform background sync if online
        syncService.syncIfEnabled(parsedUser.id).catch((err) => console.log('Auto sync error:', err));
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: userToken, user: userData } = res.data;

      await AsyncStorage.setItem('token', userToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(userToken);
      setUser(userData);

      // Initialize SQLite DB and sync — isolated so failures don't mask login success
      try {
        await initDB();
        await syncService.syncIfEnabled(userData.id);
      } catch (postLoginErr) {
        console.log('Post-login setup error (proceeding offline):', postLoginErr.message);
      }

      return { success: true };
    } catch (err) {
      // Only catches API/network errors, not post-login setup errors
      console.error('Login request failed:', err);
      let errMsg = 'Login failed. Please check your credentials.';
      if (err.response) {
        errMsg = err.response.data?.message || 'Login failed. Please check your credentials.';
      } else if (err.request) {
        errMsg = `Connection Error: Cannot connect to the server. Please ensure the backend server is running.`;
      }
      return { success: false, error: errMsg };
    }
  };

  const register = async (registerData) => {
    try {
      const res = await api.post('/auth/register', registerData);
      const { token: userToken, user: userData } = res.data;

      await AsyncStorage.setItem('token', userToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(userToken);
      setUser(userData);

      // Initialize SQLite DB and attempt first sync
      try {
        await initDB();
        await syncService.syncIfEnabled(userData.id);
      } catch (postRegErr) {
        console.log('Post-register setup error (proceeding offline):', postRegErr.message);
      }

      return { success: true };
    } catch (err) {
      console.error('Registration failed:', err);
      let errMsg = 'Registration failed. Please try again.';
      if (err.response) {
        errMsg = err.response.data?.message || 'Registration failed. Please try again.';
      } else if (err.request) {
        errMsg = `Connection Error: Cannot connect to the server. Please ensure the backend server is running.`;
      }
      return { success: false, error: errMsg };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const updateUser = async (updatedData) => {
    try {
      const newUser = { ...user, ...updatedData };
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      return { success: true };
    } catch (err) {
      console.error('Failed to update user context:', err);
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
