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

import { startSSHConnection, activeSessions, getActiveSessionsList, setBroadcastCallback } from './services/sshService';
const io = new Server(server, {
    cors: {
          origin: '*',
          methods: ['GET', 'POST']
    }
});

setBroadcastCallback(broadcastSessions);


const broadcastSessions = async () => {
    const sockets = await io.fetchSockets();
    const allSessions = getActiveSessionsList();

    for (const s of sockets) {
          const userId = s.data.user?.id;
          const userRole = s.data.user?.role;
          const userRoleName = s.data.user?.roleName;
          const isSuperAdmin = userRole === 'admin' || userRoleName === 'Administrador';


      if (isSuperAdmin) {
              s.emit('active_sessions_update', allSessions);
      } else if (userId) {
              db.all("SELECT sectorId FROM user_sectors WHERE userId = ?", [userId], (err, rows: any) => {
                        const refreshedSectors = rows ? rows.map((r: any) => r.sectorId) : [];
                        const filtered = allSessions.filter(sess => {
                          // Unassigned sessions are private (admin only)
                          if (sess.sectorId === null || sess.sectorId === undefined) return false;
                          
                          return refreshedSectors.some(rid => String(rid) === String(sess.sectorId));
                        });
                        s.emit('active_sessions_update', filtered);

              });
      }
    }
};

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
    const userRoleName = socket.data.user?.roleName;
    const userId = socket.data.user?.id;
    const isSuperAdmin = userRole === 'admin' || userRoleName === 'Administrador';


        console.log(`Client connected: ${socket.id} user: ${username}`);

        if (isSuperAdmin) {
              socket.emit('active_sessions_update', getActiveSessionsList());
        } else if (userId) {
              db.all("SELECT sectorId FROM user_sectors WHERE userId = ?", [userId], (err, rows: any) => {
                      const sectors = rows ? rows.map((r: any) => r.sectorId) : [];
                      const filtered = getActiveSessionsList().filter(sess => {
                        // Unassigned sessions are private (admin only)
                        if (sess.sectorId === null || sess.sectorId === undefined) return false;
                        
                        return sectors.some(rid => String(rid) === String(sess.sectorId));
                      });
                      socket.emit('active_sessions_update', filtered);

              });
        }

        socket.on('start_session', (payload) => {
              if (userRole === 'Visualizador') return socket.emit('ssh_error', 'Sem permiss
