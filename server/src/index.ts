import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { db } from './db/database';
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

// Broadcast helper for filtered sessions with Real-time DB sync
const broadcastSessions = async () => {
  const sockets = await io.fetchSockets();
  const allSessions = getActiveSessionsList();

  for (const s of sockets) {
    const userId = s.data.user?.id;
    const userRole = s.data.user?.role;
    const isAdmin = userRole === 'admin' || userRole === 'Administrador';

    if (isAdmin) {
      // Admins see all sessions immediately
      s.emit('active_sessions_update', allSessions);
    } else if (userId) {
      // Re-query database for other users to catch permission changes in real-time
      db.all("SELECT sectorId FROM user_sectors WHERE userId = ?", [userId], (err, rows: any) => {
        const refreshedSectors = rows ? rows.map((r: any) => r.sectorId) : [];
        const filtered = allSessions.filter(sess => refreshedSectors.includes(sess.sectorId));
        s.emit('active_sessions_update', filtered);
      });
    }
  }
};

// Socket.IO authentication middleware (runs once at connection)
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
  const username = socket.data.user?.username;
  const userRole = socket.data.user?.role;

  console.log(`Client connected: ${socket.id} user: ${username}`);

  // Initial fetch from DB for newly connected user
  const userId = socket.data.user?.id;
  const isAdmin = userRole === 'admin' || userRole === 'Administrador';

  if (isAdmin) {
    socket.emit('active_sessions_update', getActiveSessionsList());
  } else if (userId) {
    db.all("SELECT sectorId FROM user_sectors WHERE userId = ?", [userId], (err, rows: any) => {
      const sectors = rows ? rows.map((r: any) => r.sectorId) : [];
      const filtered = getActiveSessionsList().filter(sess => sectors.includes(sess.sectorId));
      socket.emit('active_sessions_update', filtered);
    });
  }

  socket.on('start_session', (payload) => {
    if (userRole === 'Visualizador') {
      return socket.emit('ssh_error', 'Sem permissão');
    }
    const { hostId } = payload;
    startSSHConnection(hostId, socket, io, username);
    setTimeout(broadcastSessions, 1000);
  });

  socket.on('join_session', (payload) => {
    const { sessionId } = payload;
    const session = activeSessions[sessionId];
    
    if (session) {
      // Backend check before allowing join
      if (isAdmin) {
        socket.join(`session_${sessionId}`);
        socket.emit('session_joined', { sessionId, hostName: session.hostName });
      } else {
        db.get("SELECT 1 FROM user_sectors WHERE userId = ? AND sectorId = ?", [userId, session.sectorId], (err, row) => {
          if (row) {
            socket.join(`session_${sessionId}`);
            socket.emit('session_joined', { sessionId, hostName: session.hostName });
          } else {
            socket.emit('ssh_error', 'Setor não autorizado.');
          }
        });
      }
    } else {
      socket.emit('ssh_error', 'Session not found');
    }
  });

  socket.on('close_session', (payload) => {
    const { sessionId } = payload;
    if (userRole === 'Visualizador') return;
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
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
