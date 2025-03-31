


// client/src/services/socketService.js
import { io } from 'socket.io-client';
// Replace with your actual server address if different
// Use http://localhost:3001 if your server is running locally on port 3001
// Use your deployed server URL in production

const SERVER_URL = import.meta.env.VITE_URL ; // <--- Make sure this is correct!

let socket = null;

const socketService = {
  connect: () => {
    // Check if socket is already connected
    if (socket && socket.connected) {
        console.log("Socket already connected.");
        return socket;
    }

    // Disconnect previous socket if exists but not connected properly
    if (socket) {
        socket.disconnect();
    }

    console.log(`Attempting to connect to server at ${SERVER_URL}...`);
    socket = io(SERVER_URL, {
      // Optional: Add connection options if needed
      // transports: ['websocket'], // Example: force websocket
      // reconnectionAttempts: 5,
    });

    // --- Optional: Add listeners for debugging connection ---
    socket.on('connect', () => {
      console.log(`Socket connected successfully: ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      // Optional: Handle disconnection logic if needed
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Optional: Handle connection errors (e.g., show message to user)
    });
    // --- End optional debug listeners ---


    return socket;
  },

  // Optional helper to get the current socket instance
  getSocket: () => socket,

  // Optional: Explicit disconnect function if needed elsewhere
  disconnect: () => {
    if (socket && socket.connected) {
        console.log("Disconnecting socket...");
        socket.disconnect();
        socket = null;
    }
  }
};

// Ensure connection is attempted when service is loaded (or use connect() explicitly in App/components)
// socketService.connect(); // You might call connect() here or within your main App component useEffect

export default socketService;