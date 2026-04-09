import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
}

export const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const API_URL = `http://${window.location.hostname}:4000`;
      const newSocket = io(API_URL, {
        auth: {
          token
        }
      });
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, []); // Basic setup: will reconnect if page refreshes.

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
