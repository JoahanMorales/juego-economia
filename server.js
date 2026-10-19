const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

function createServer({ turnMs = 10000 } = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const ctx = { turnMs, app, server };

  app.get('/health', (_req, res) => res.send('ok'));
  app.use(express.static(path.join(__dirname, 'public')));

  require('./src/socket-lobby')(io, ctx);
  require('./src/socket-game')(io, ctx);

  return { app, server, io, ctx };
}

module.exports = { createServer };

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const { server } = createServer({});
  server.listen(PORT, '0.0.0.0', () => console.log('Pásala en puerto', PORT));
}
