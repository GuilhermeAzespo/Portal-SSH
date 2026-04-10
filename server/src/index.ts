import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Client } from 'ssh2';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import './db/database'; // Initialize DB
import authRoutes from './routes/authRoutes';
import hostRoutes from './routes/hostRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);

import { startSSHConnection, activeSessions, getActiveSessionsList } from './services/sshService';

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  jwt.verify(token, process.env.JWT_SECRET || 'portal-ssh-secret-dev', (err: any, decoded: any) => {
    if (err) return next(new Error('Authentication error'));
    socket.data.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  const username = socket.data.user.username;
  console.log(`Client connected: ${socket.id} user: ${username}`);

  // Send initial list of sessions
  socket.emit('active_sessions_update', getActiveSessionsList());

  socket.on('get_active_sessions', () => {
    socket.emit('active_sessions_update', getActiveSessionsList());
  });

  socket.on('start_session', (payload) => {
    const { hostId } = payload;
    startSSHConnection(hostId, socket, io, username);
  });

  socket.on('join_session', (payload) => {
    const { sessionId } = payload;
    if (activeSessions[sessionId]) {
      socket.join(`session_${sessionId}`);
      socket.emit('session_joined', { sessionId, hostName: activeSessions[sessionId].hostName });
    } else {
      socket.emit('ssh_error', 'Session not found');
    }
  });

  socket.on('close_session', (payload) => {
    const { sessionId } = payload;
    const session = activeSessions[sessionId];
    if (session) {
      session.ssh.end();
      delete activeSessions[sessionId];
      io.emit('active_sessions_update', getActiveSessionsList());
    }
  });

  socket.on('ssh_input', (payload) => {
    const { sessionId, data } = payload;
    const session = activeSessions[sessionId];
    if (session && session.stream) {
      session.stream.write(data);
    }
  });

  socket.on('resize', (payload) => {
    const { sessionId, cols, rows } = payload;
    const session = activeSessions[sessionId];
    if (session && session.stream) {
      session.stream.setWindow(rows, cols, 480, 640);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
