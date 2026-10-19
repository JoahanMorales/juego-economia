// Pásala protocol (IDEA §4.5): event names, limits and slide presets shared by the server and both screens.
// Browser global `Protocol`, Node module. The server is the only source of truth; this file only names things.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Protocol = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EVENTS = {
    // client → server
    HOST_CREATE: 'host:create',     // {} → ack {code, hostToken, joinUrl, qr}
    HOST_RESUME: 'host:resume',     // {code, hostToken} → ack {ok}
    HOST_SETTINGS: 'host:settings', // {investment, pmc} (lobby only)
    HOST_ADD_BOTS: 'host:addBots',  // {count}
    HOST_KICK: 'host:kick',         // {playerId}
    HOST_START: 'host:start',       // {} (2+ connected players)
    HOST_END: 'host:end',           // {}
    HOST_LOBBY: 'host:lobby',       // {}
    PLAYER_JOIN: 'player:join',     // {code, name, playerId?} → ack {playerId}
    PLAYER_PASS: 'player:pass',     // {turn, saving, toId}
    // server → clients
    ROOM_STATE: 'room:state',       // PublicState, to the whole room
    YOU_TURN: 'you:turn',           // {turn, amount, msLeft, pmc}, only to the holder
    ERROR: 'error:msg'              // {code, message} in Spanish, only to the sender
  };

  var LIMITS = {
    investmentMin: 10,
    investmentMax: 10000000,
    pmcMin: 0.1,
    pmcMax: 0.95,
    nameMax: 16,
    turnMs: 10000,
    tolerance: 0.5,
    disconnectedHolderMs: 3000,
    stopBelow: 1,
    ledgerTail: 8
  };

  // The three cases of the presentation (IDEA §1). k = 1 / (1 − PMC); total = k × investment.
  var PRESETS = [
    { id: 'lenas', label: 'Leñeras y carpinteros', investment: 1000, pmc: 2 / 3 },
    { id: 'ej1', label: 'Ejercicio 1', investment: 1000000, pmc: 0.5 },
    { id: 'ej2', label: 'Ejercicio 2', investment: 1000000, pmc: 0.75 }
  ];

  /**
   * @typedef {Object} PublicPlayer
   * @property {string} id         public id (never a reconnect secret)
   * @property {string} name
   * @property {number} saved
   * @property {number} errors
   * @property {boolean} connected
   * @property {boolean} isBot
   *
   * @typedef {Object} LedgerRow
   * @property {number} n
   * @property {string} playerId
   * @property {string} name
   * @property {number} income
   * @property {number} consumption   always the correct amount: the chain never breaks
   * @property {number} saving        the correct saving, kept or lost
   * @property {boolean} ok
   * @property {'ok'|'wrong'|'timeout'} reason
   *
   * @typedef {Object} PublicState   what every socket in the room receives; never includes hostToken
   * @property {string} code
   * @property {'lobby'|'playing'|'final'} phase
   * @property {{investment:number, pmc:number}} settings
   * @property {PublicPlayer[]} players
   * @property {null|{holderId:string, amount:number, turn:number, msLeft:number, moved:number, passes:number,
   *            paused?:boolean, lastEvent:null|{ok:boolean, text:string}, ledgerTail:LedgerRow[]}} game
   * @property {{ledger:LedgerRow[], theoretical:number, moved:number, lostSavings:number,
   *            ranking:{id:string, name:string, saved:number, errors:number, avgMs:number}[]}} [final]
   */

  return { EVENTS: EVENTS, LIMITS: LIMITS, PRESETS: PRESETS };
});
