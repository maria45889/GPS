// Socket.IO client service
import { io } from 'socket.io-client';
import { getLocalServerUrl } from './api';

let socket = null;
const listeners = new Map();

export const socketService = {
  connect(onStatusChange) {
    if (socket) return socket;

    socket = io(getLocalServerUrl(), {
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect', () => {
      if (onStatusChange) onStatusChange('connected');
    });

    socket.on('disconnect', () => {
      if (onStatusChange) onStatusChange('disconnected');
    });

    socket.on('connect_error', () => {
      if (onStatusChange) onStatusChange('disconnected');
    });

    // Re-bind all active listeners on new socket
    listeners.forEach((callback, event) => {
      socket.on(event, callback);
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  on(event, callback) {
    listeners.set(event, callback);
    if (socket) {
      socket.on(event, callback);
    }
  },

  off(event) {
    listeners.delete(event);
    if (socket) {
      socket.off(event);
    }
  },

  isConnected() {
    return socket ? socket.connected : false;
  }
};
