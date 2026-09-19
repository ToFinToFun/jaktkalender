const ZENITH = 90.833;
const CIVIL_ZENITH = 96;
const DEG = Math.PI / 180;

function normalizeDeg(v) { return ((v % 360) + 360) % 360; }
function normalizeHour(v) { return ((v % 24) + 24) % 24; }

function dayOfYear(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86400000);
}

function calcEvent(date, lat, lon, sunrise, zenith = ZENITH) {
  const n = dayOfYear(date);
  const lngHour = lon / 15;
  const t = n + ((sunrise ? 6 : 18) - lngHour) / 24;
  const m = (0.9856 * t) - 3.289;
  let l = m + 1.916 * Math.sin(m * DEG) + 0.020 * Math.sin(2 * m * DEG) + 282.634;
  l = normalizeDeg(l);
  let ra = Math.atan(0.91764 * Math.tan(l * DEG)) / DEG;
  ra = normalizeDeg(ra);
  const lQuadrant = Math.floor(l / 90) * 90;
  const raQuadrant = Math.floor(ra / 90) * 90;
  ra = (ra + lQuadrant - raQuadrant) / 15;
  const sinDec = 0.39782 * Math.sin(l * DEG);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(zenith * DEG) - sinDec * Math.sin(lat * DEG)) / (cosDec * Math.cos(lat * DEG));
  if (cosH > 1) return { date: null, polar: 'night' };
  if (cosH < -1) return { date: null, polar: 'day' };
  let h = sunrise ? 360 - (Math.acos(cosH) / DEG) : (Math.acos(cosH) / DEG);
  h /= 15;
  const localMean = h + ra - (0.06571 * t) - 6.622;
  const ut = normalizeHour(localMean - lngHour);
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return { date: new Date(midnight + ut * 3600000), polar: null };
}

export function getSunTimes(date, lat, lon) {
  const rise = calcEvent(date, lat, lon, true, ZENITH);
  const set = calcEvent(date, lat, lon, false, ZENITH);
  return { sunrise: rise.date, sunset: set.date, polar: rise.polar || set.polar || null };
}

export function getCivilTwilightTimes(date, lat, lon) {
  const dawn = calcEvent(date, lat, lon, true, CIVIL_ZENITH);
  const dusk = calcEvent(date, lat, lon, false, CIVIL_ZENITH);
  return { dawn: dawn.date, dusk: dusk.date, polar: dawn.polar || dusk.polar || null };
}

export function roundMinutes(minutes, step = 15) {
  return Math.round(minutes / step) * step;
}

export function addMinutes(date, minutes) {
  return date ? new Date(date.getTime() + minutes * 60000) : null;
}

export function stockholmMinutes(date) {
  if (!date) return null;
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

export function formatStockholmTime(date) {
  if (!date) return '–';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(date);
}