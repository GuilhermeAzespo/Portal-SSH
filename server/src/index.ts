import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { db } from './db/database'; // Using db for permitted sectors
import authRoutes from './routes/authRoutes';
import hostRoutes from './routes/hostRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import updateRoutes from './routes/updateRoutes';
import sectorRoutes from './routes/sectorRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/update', updateRoutes);
app.use('/api/sectors', sectorRoutes);

import { startSSHConnection, activeSessions, getActiveSessionsList } from './services/sshService';

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Broadcast helper for filtered sessions
const broadcastSessions = async () => {
  const sockets = await io.fetchSockets();
  const allSessions = getActiveSessionsList();

  sockets.forEach(s => {
    const userRole = s.data.user?.role;
    const isAdmin = userRole === 'admin' || userRole === 'Administrador';
    const permittedSectors = s.data.permittedSectors || [];

    const filtered = isAdmin 
      ? allSessions 
      : allSessions.filter(sess => permittedSectors.includes(sess.sectorId));
    
    s.emit('active_sessions_update', filtered);
  });
};

// Socket.IO authentication and sector loading middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  
  jwt.verify(token, process.env.JWT_SECRET || 'portal-ssh-secret-dev', (err: any, decoded: any) => {
    if (err) return next(new Error('Authentication error'));
    socket.data.user = decoded;
    
    // Load permitted sectors for the user
    db.all("SELECT sectorId FROM user_sectors WHERE userId = ?", [decoded.id], (err, rows: any) => {
      socket.data.permittedSectors = rows ? rows.map((r: any) => r.sectorId) : [];
      next();
    });
  });
});

io.on('connection', (socket) => {
  const username = socket.data.user.username;
  const userRole = socket.data.user.role;
  const permittedSectors = socket.data.permittedSectors || [];
  const isAdmin = userRole === 'admin' || userRole === 'Administrador';

  console.log(`Client connected: ${socket.id} user: ${username} role: ${userRole}`);

  // Send initial filtered sessions
  const initialSessions = isAdmin 
    ? getActiveSessionsList() 
    : getActiveSessionsList().filter(sess => permittedSectors.includes(sess.sectorId));
  socket.emit('active_sessions_update', initialSessions);

  socket.on('get_active_sessions', () => {
    const list = isAdmin 
      ? getActiveSessionsList() 
      : getActiveSessionsList().filter(sess => permittedSectors.includes(sess.sectorId));
    socket.emit('active_sessions_update', list);
  });

  socket.on('start_session', (payload) => {
    if (userRole === 'Visualizador') {
      return socket.emit('ssh_error', 'Você não tem permissão para iniciar sessões.');
    }
    const { hostId } = payload;
    startSSHConnection(hostId, socket, io, username);
    
    // Trigger broadcast after short delay to allow session to be added
    setTimeout(broadcastSessions, 1000);
  });

  socket.on('join_session', (payload) => {
    const { sessionId } = payload;
    const session = activeSessions[sessionId];
    
    if (session) {
      // Permission check for joining
      if (!isAdmin && !permittedSectors.includes(session.sectorId)) {
        return socket.emit('ssh_error', 'Você não tem permissão para acessar este servidor.');
      }
      
      socket.join(`session_${sessionId}`);
      socket.emit('session_joined', { sessionId, hostName: session.hostName });
    } else {
      socket.emit('ssh_error', 'Session not found');
    }
  });

  socket.on('close_session', (payload) => {
    const { sessionId } = payload;
    if (userRole === 'Visualizador') {
      return socket.emit('ssh_error', 'Você não tem permissão para fechar sessões.');
    }
    const session = activeSessions[sessionId];
    if (session) {
      session.ssh.end();
      delete activeSessions[sessionId];
      broadcastSessions();
    }
  });

  socket.on('ssh_input', (payload) => {
    if (userRole === 'Visualizador') return;
    
    const { sessionId, data } = payload;
    const session = activeSessions[sessionId];
    
    if (session && session.stream) {
      // Double check permission for input safely (optional as join is already restricted)
      session.stream.write(data);
    }
  });

  socket.on('resize', (payload) => {
    if (userRole === 'Visualizador') return;
    const { sessionId, cols, rows } = payload;
    const session = activeSessions[sessionId];
    if (session && session.stream) {
      session.stream.setWindow(rows, cols, 480, 640);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Note: If no one is watching, session owner disconnect might not close it 
    // depending on the policy. Here we keep sessions open even if owner disconnects.
    broadcastSessions();
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
