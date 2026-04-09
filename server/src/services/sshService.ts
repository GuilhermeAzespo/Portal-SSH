import { Client } from 'ssh2';
import { db } from '../db/database';
import { Server, Socket } from 'socket.io';
import crypto from 'crypto';

export const activeSessions: Record<string, { ssh: Client, stream: any, hostName: string, startedBy: string }> = {};

export const startSSHConnection = (
  hostId: number, 
  socket: Socket, 
  io: Server,
  username: string
) => {
  db.get(`SELECT * FROM hosts WHERE id = ?`, [hostId], (err, host: any) => {
    if (err || !host) {
      socket.emit('ssh_error', 'Host not found');
      return;
    }

    const conn = new Client();
    const sessionId = crypto.randomUUID();

    conn.on('ready', () => {
      conn.shell({ term: 'xterm-color' }, (err, stream) => {
        if (err) {
          socket.emit('ssh_error', 'Shell error: ' + err.message);
          return;
        }

        activeSessions[sessionId] = { 
          ssh: conn, 
          stream, 
          hostName: host.name, 
          startedBy: username 
        };
        
        socket.join(`session_${sessionId}`);
        socket.emit('session_started', { sessionId, hostName: host.name });
        
        io.emit('active_sessions_update', getActiveSessionsList());

        stream.on('close', () => {
          conn.end();
          delete activeSessions[sessionId];
          io.to(`session_${sessionId}`).emit('ssh_close');
          io.emit('active_sessions_update', getActiveSessionsList());
        }).on('data', (data: any) => {
          io.to(`session_${sessionId}`).emit('ssh_data', { sessionId, data: data.toString('utf-8') });
        });
      });
    }).on('error', (err) => {
      socket.emit('ssh_error', 'Connection error: ' + err.message);
    }).connect({
      host: host.host,
      port: host.port,
      username: host.username,
      password: host.password,
      privateKey: host.privateKey
    });
  });
};

export const getActiveSessionsList = () => {
  return Object.keys(activeSessions).map(id => ({
    id,
    hostName: activeSessions[id].hostName,
    startedBy: activeSessions[id].startedBy
  }));
};
