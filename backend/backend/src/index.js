const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const locationRoutes = require('./routes/location');
const deviceRoutes = require('./routes/devices');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/location', locationRoutes);
app.use('/api/devices', deviceRoutes);

// Dashboard SPA — todas las rutas no-API sirven el dashboard
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor GPS corriendo en http://0.0.0.0:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});
