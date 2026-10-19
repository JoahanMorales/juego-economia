const LIMITS = { investmentMin: 10, investmentMax: 10000000, pmcMin: 0.1, pmcMax: 0.95, nameMax: 16 };

function cleanName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .trim()
    .slice(0, LIMITS.nameMax)
    .trim();
  return name || null;
}

function uniqueName(name, taken) {
  const used = new Set(taken.map((n) => n.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  for (let i = 2; ; i++) {
    const suffix = ` ${i}`;
    const candidate = name.slice(0, LIMITS.nameMax - suffix.length).trimEnd() + suffix;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

function normalizeCode(raw) {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{4}$/.test(code) ? code : null;
}

function validateSettings(s) {
  const fail = (error) => ({ ok: false, error });
  if (!s || typeof s !== 'object') return fail('Configuración inválida.');
  const { investment, pmc } = s;
  if (typeof investment !== 'number' || !Number.isFinite(investment)
    || investment < LIMITS.investmentMin || investment > LIMITS.investmentMax) {
    return fail('La inversión debe estar entre $10.00 y $10,000,000.00.');
  }
  if (typeof pmc !== 'number' || !Number.isFinite(pmc) || pmc < LIMITS.pmcMin || pmc > LIMITS.pmcMax) {
    return fail('La propensión a consumir debe estar entre 0.10 y 0.95.');
  }
  return { ok: true, value: { investment, pmc } };
}

function validateSaving(v) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    return { ok: false, error: 'El ahorro debe ser un número válido.' };
  }
  return { ok: true, value: v };
}

function createRateLimiter({ intervalMs = 1000, now = Date.now } = {}) {
  const last = new Map();
  return {
    allow(key) {
      const t = now();
      const prev = last.get(key);
      if (prev !== undefined && t - prev < intervalMs) return false;
      last.set(key, t);
      return true;
    },
    forget(key) { last.delete(key); },
  };
}

module.exports = { LIMITS, cleanName, uniqueName, normalizeCode, validateSettings, validateSaving, createRateLimiter };
