import { Client } from 'ssh2';
import { db } from '../db/database';

export interface ActiveSession {
  ssh: Client;
  stream: any;
  hostName: string;
  startedBy: string;
  sectorId: number; 
  sectorName?: string; // Added sectorName
}

export const activeSessions: { [key: string]: ActiveSession } = {};

let broadcastCallback: (() => void) | null = null;
export const setBroadcastCallback = (cb: () => void) => {
  broadcastCallback = cb;
};


export const getActiveSessionsList = () => {
  return Object.keys(activeSessions).map(id => ({ 
    id, 
    hostName: activeSessions[id].hostName, 
    startedBy: activeSessions[id].startedBy,
    sectorId: activeSessions[id].sectorId,
    sectorName: activeSessions[id].sectorName // Include sectorName
  }));
};


export const startSSHConnection = (hostId: number, socket: any, io: any, username: string) => {
  const query = `
    SELECT h.*, s.name as sectorName 
    FROM hosts h 
    LEFT JOIN sectors s ON h.sectorId = s.id 
    WHERE h.id = ?
  `;
  
  db.get(query, [hostId], (err, host: any) => {
    if (err || !host) {
      console.error(`[SSH] Host not found for id ${hostId}`);
      return socket.emit('ssh_error', 'Host not found');
    }

    console.log(`[SSH] Starting session for host: ${host.name} (ID: ${hostId}), Sector: ${host.sectorName} (${host.sectorId})`);

    const conn = new Client();
    conn.on('ready', () => {
      conn.shell((err, stream) => {
        if (err) return socket.emit('ssh_error', err.message);

        const sessionId = Math.random().toString(36).substring(7);
        activeSessions[sessionId] = { 
          ssh: conn, 
          stream, 
          hostName: host.name, 
          startedBy: username,
          sectorId: host.sectorId,
          sectorName: host.sectorName
        };

        console.log(`[SSH] Session created: ${sessionId}, sector: ${host.sectorName}`);

        socket.emit('session_started', { sessionId, hostName: host.name });
        
        // Trigger real-time broadcast
        if (broadcastCallback) broadcastCallback();


        
        stream.on('data', (data: any) => {
          io.to(`session_${sessionId}`).emit('ssh_data', { sessionId, data: data.toString() });
        });

        stream.on('close', () => {
          conn.end();
          delete activeSessions[sessionId];
          // Trigger real-time broadcast
          if (broadcastCallback) broadcastCallback();
        });

      });
    }).on('error', (err) => {
      socket.emit('ssh_error', err.message);
    }).connect({
      host: host.host, // Corrected from host.ip to host.host

      port: host.port || 22,
      username: host.username,
      password: host.password
    });
  });
};
