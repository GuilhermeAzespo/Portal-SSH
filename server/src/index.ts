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
import settingsRoutes from './routes/settingsRoutes';
import pcapRoutes from './routes/pcapRoutes';

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
app.use('/api/settings', settingsRoutes);
app.use('/api/pcap', pcapRoutes);

import { startSSHConnection, activeSessions, getActiveSessionsList, setBroadcastCallback } from './services/sshService';
const io = new Server(server, {
    cors: {
          origin: '*',
          methods: ['GET', 'POST']
    }
});


// Moving setBroadcastCallback after broadcastSessions definition to fix hoisting



const broadcastSessions = async () => {
    const sockets = await io.fetchSockets();
    const allSessions = getActiveSessionsList();

    for (const s of sockets) {
          const user = s.data.user;
          if (!user) continue; // Skip unauthenticated sockets

          const userId = user.id;
          const userRole = user.role;
          const userRoleName = user.roleName;
          const isSuperAdmin = userRoleName === 'Administrador';

          const sectorIds = (user.sectorIds || []).map(Number);
          
          if (isSuperAdmin) {
                  s.emit('active_sessions_update', allSessions);
          } else if (userId) {
                  const filtered = allSessions.filter(sess => {
                    const sid = Number(sess.sectorId);
                    if (!sess.sectorId || isNaN(sid)) return false; 
                    return sectorIds.includes(sid);
                  });
                  s.emit('active_sessions_update', filtered);
          }
    }
};

setBroadcastCallback(broadcastSessions);


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
    const isSuperAdmin = userRoleName === 'Administrador';


        console.log(`Client connected: ${socket.id} user: ${username}`);

        const sectorIds = (socket.data.user?.sectorIds || []).map(Number);

        const sendFilteredSessions = () => {
              const all = getActiveSessionsList();
              if (isSuperAdmin) {
                    socket.emit('active_sessions_update', all);
              } else if (userId) {
                    const filtered = all.filter(sess => {
                          const sid = Number(sess.sectorId);
                          if (!sess.sectorId || isNaN(sid)) return false; 
                          return sectorIds.includes(sid);
                    });
                    socket.emit('active_sessions_update', filtered);
              }
        };

        sendFilteredSessions();

        socket.on('get_active_sessions', () => {
              sendFilteredSessions();
        });



        socket.on('start_session', (payload) => {
              if (userRole === 'Visualizador') return socket.emit('ssh_error', 'Sem permissão para iniciar sessões');
              const { hostId } = payload;
              startSSHConnection(hostId, socket, io, username || 'Anonymous');
        });

        socket.on('join_session', (payload) => {
              const { sessionId } = payload;
              const session = activeSessions[sessionId];
              
              if (!session) {
                    return socket.emit('ssh_error', 'Sessão não encontrada ou já encerrada');
              }

              const sessionSectorId = Number(session.sectorId);
              const userSectorIds = (socket.data.user?.sectorIds || []).map(Number);
              
              // Security check: Administrators see everything, others must match sector
              if (!isSuperAdmin && !userSectorIds.includes(sessionSectorId)) {
                    console.warn(`[Security] Unauthorized join attempt by ${username} to session ${sessionId} (Sector: ${session.sectorId})`);
                    return socket.emit('ssh_error', 'Acesso negado: esta sessão pertence a outro setor');
              }

              socket.join(`session_${sessionId}`);
              socket.emit('session_joined', { 
                    sessionId, 
                    hostName: session.hostName 
              });
              
              console.log(`[SSH] User ${username} joined session ${sessionId} (${session.hostName})`);
        });

        socket.on('close_session', (payload) => {
              const { sessionId } = payload;
              if (activeSessions[sessionId]) {
                    // Only the person who started it or an admin can close?
                    // For now, let's just allow closing if you are in the session
                    // In a real app, we'd check permissions more strictly
                    activeSessions[sessionId].ssh.end();
                    delete activeSessions[sessionId];
                    broadcastSessions();
              }
        });

        socket.on('ssh_input', (payload) => {
              const { sessionId, data } = payload;
              if (activeSessions[sessionId]?.stream) {
                    activeSessions[sessionId].stream.write(data);
              }
        });

        socket.on('resize', (payload) => {
              const { sessionId, cols, rows } = payload;
              if (activeSessions[sessionId]?.stream) {
                    activeSessions[sessionId].stream.setWindow(rows, cols, 0, 0);
              }
        });

        socket.on('disconnect', () => {
              console.log(`Client disconnected: ${socket.id}`);
        });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Fatal] Unhandled error:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
