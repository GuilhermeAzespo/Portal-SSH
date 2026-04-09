import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Client } from 'ssh2';
import dotenv from 'dotenv';
import './db/database'; // Initialize DB

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// A simple structure to hold active SSH sessions
const activeSessions: Record<string, { ssh: Client, stream: any }> = {};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
