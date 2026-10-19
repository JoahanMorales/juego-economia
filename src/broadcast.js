const { publicState } = require('./game');

function broadcast(io, room) {
  io.to(room.code).emit('room:state', publicState(room));
}

module.exports = { publicState, broadcast };
