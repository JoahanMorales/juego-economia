// Optional projector sound (off by default), synthesized with Web Audio: no files, no third parties.
// Browsers only allow audio after a user gesture, so Sfx.set(true) must run from a click.
(function (root) {
  'use strict';
  var ctx = null, on = false;

  function audio() {
    if (!ctx) {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // One enveloped note: a quick attack, then an exponential fade.
  function note(freq, at, dur, type, peak) {
    var a = audio();
    if (!a) return;
    var t = a.currentTime + at, osc = a.createOscillator(), amp = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  root.Sfx = {
    set: function (value) { on = !!value; if (on) audio(); },
    enabled: function () { return on; },
    pass: function () { if (!on) return; note(988, 0, 0.12, 'triangle', 0.18); note(1319, 0.08, 0.22, 'triangle', 0.16); },
    miss: function () { if (!on) return; note(196, 0, 0.28, 'square', 0.07); note(147, 0.12, 0.3, 'square', 0.06); },
    end: function () { if (!on) return; [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { note(f, i * 0.09, 0.9, 'triangle', 0.12); }); }
  };
})(typeof self !== 'undefined' ? self : this);
