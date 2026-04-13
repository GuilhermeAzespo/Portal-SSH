import { Client } from 'ssh2';
import { db } from '../db/database';

export interface ActiveSession {
  ssh: Client;
  stream: any;
  hostName: string;
  startedBy: string;
  sectorId: number; // Added sectorId for isolation
}

export const activeSessions: { [key: string]: ActiveSession } = {};

export const getActiveSessionsList = () => {
  return Object.keys(activeSessions).map(id => ({ 
    id, 
    hostName: activeSessions[id].hostName, 
    startedBy: activeSessions[id].startedBy,
    sectorId: activeSessions[id].sectorId // Added sectorId
  }));
};

export const startSSHConnection = (hostId: number, socket: any, io: any, username: string) => {
  db.get("SELECT * FROM hosts WHERE id = ?", [hostId], (err, host: any) => {
    if (err || !host) {
      return socket.emit('ssh_error', 'Host not found');
    }

    const conn = new Client();
    conn.on('ready', () => {
      conn.shell((err, stream) => {
        if (err) return socket.emit('ssh_error', err.message);

        const sessionId = `${hostId}_${Date.now()}`;
        activeSessions[sessionId] = { 
          ssh: conn, 
          stream, 
          hostName: host.name, 
          startedBy: username,
          sectorId: host.sector_id // Correctly store sector_id
        };

        socket.emit('session_started', { sessionId, hostName: host.name });
        
        // We will now handle filtered broadcast in index.ts
        // Original: io.emit('active_sessions_update', getActiveSessionsList());
        
        stream.on('data', (data: any) => {
          io.to(`session_${sessionId}`).emit('ssh_data', { sessionId, data: data.toString() });
        });

        stream.on('close', () => {
          conn.end();
          delete activeSessions[sessionId];
          // Filtered broadcast handled in index.ts
        });
      });
    }).on('error', (err) => {
      socket.emit('ssh_error', err.message);
    }).connect({
      host: host.ip,
      port: host.port || 22,
      username: host.username,
      password: host.password
    });
  });
};
