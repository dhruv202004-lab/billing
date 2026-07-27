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
        const online = await syncService.isOnline();
        if (online) {
          syncService.sync(parsedUser.id).catch((err) => console.log('Auto sync error:', err));
        }
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

      // Initialize SQLite DB
      await initDB();

      try {
        await syncService.sync(userData.id);
      } catch (syncErr) {
        console.log('Initial sync failed (proceeding offline):', syncErr.message);
      }

      return { success: true };
    } catch (err) {
      console.error('Login request failed:', err);
      let errMsg = 'Login failed. Please check your credentials.';
      if (err.response) {
        errMsg = err.response.data?.message || 'Login failed. Please check your credentials.';
      } else if (err.request) {
        errMsg = `Connection Error: Cannot connect to the server. Please ensure the backend server is running and reachable.`;
      } else {
        errMsg = `Local Database Error: ${err.message || 'Failed to initialize local database.'}`;
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

      // Initialize SQLite DB
      await initDB();

      return { success: true };
    } catch (err) {
      console.error('Registration failed:', err);
      let errMsg = 'Registration failed. Please try again.';
      if (err.response) {
        errMsg = err.response.data?.message || 'Registration failed. Please try again.';
      } else if (err.request) {
        errMsg = `Connection Error: Cannot connect to the server. Please ensure the backend server is running and reachable.`;
      } else {
        errMsg = `Local Database Error: ${err.message || 'Failed to initialize local database.'}`;
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
