// src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://dam-be.onrender.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically add the Token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});