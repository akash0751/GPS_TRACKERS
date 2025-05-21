const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const dotenv = require('dotenv');

dotenv.config()
const app = express();
app.use(cors());
app.use(express.json());


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://gpslivetrack.netlify.app", // React frontend
    methods: ["GET", "POST"]
  }
});

const users = {}; // To track users

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('send-location', ({ name, latitude, longitude }) => {
    users[socket.id] =  { name, latitude, longitude }; // Save user location
    io.emit('receive-locations', users); // Send all users' locations
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete users[socket.id]; // Remove disconnected user
    io.emit('receive-locations', users); // Update all users
  });
});


server.listen(process.env.PORT, () => {
  console.log(`Server running at http://localhost:${process.env.PORT}`);
});

