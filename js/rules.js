import { RULES, SPECIES, SOURCES, GROUPS } from './data.js';
import { getSunTimes, addMinutes, stockholmMinutes, formatStockholmTime } from './sun.js';

export { SPECIES, SOURCES, GROUPS };

const strip = (s='') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(lan|kommun|county|municipality)\b/g,'').replace(/[^a-z0-9åäö]+/g,' ').trim();
const sameName = (a,b) => strip(a) === strip(b);

export function normalizeCounty(value='') {
  const s = value.trim();
  if (!s) return '';
  if (/län$/i.test(s)) return s;
  const map = new Map([
    ['blekinge','Blekinge län'],['dalarna','Dalarnas län'],['gotland','Gotlands län'],['gavleborg','Gävleborgs län'],
    ['halland','Hallands län'],['jamtland','Jämtlands län'],['jonkoping','Jönköpings län'],['kalmar','Kalmar län'],
    ['kronoberg','Kronobergs län'],['norrbotten','Norrbottens län'],['skane','Skåne län'],['stockholm','Stockholms län'],
    ['sodermanland','Södermanlands län'],['uppsala','Uppsala län'],['varmland','Värmlands län'],['vasterbotten','Västerbottens län'],
    ['vasternorrland','Västernorrlands län'],['vastmanland','Västmanlands län'],['vastra gotaland','Västra Götalands län'],
    ['orebro','Örebro län'],['ostergotland','Östergötlands län']
  ]);
  return map.get(strip(s)) || s;
}

export function normalizeMunicipality(value='') {
  const s = value.trim();
  if (!s) return '';
  if (/kommun$/i.test(s)) return s;
  return `${s} kommun`;
}

function matchBase(region, location) {
  if (!region || region.type === 'all') return true;
  const county = normalizeCounty(location.county || '');
  const municipality = normalizeMunicipality(location.municipality || '');
  const countyMatches = name => sameName(county, normalizeCounty(name));
  const municipalityMatches = name => sameName(municipality, normalizeMunicipality(name));
  switch (region.type) {
    case 'counties': return region.names.some(countyMatches);
    case 'exceptCounties': return !region.names.some(countyMatches);
    case 'countyMunicipalities': return countyMatches(region.county) && region.municipalities.some(municipalityMatches);
    case 'countyExceptMunicipalities': return countyMatches(region.county) && !region.municipalities.some(municipalityMatches);
    case 'special': return matchBase(region.base, location) && Boolean(location.special?.[region.key]);
    case 'notSpecial': return matchBase(region.base, location) && !Boolean(location.special?.[region.key]);
    default: return false;
  }
}

export function matchRegion(rule, location) { return matchBase(rule.region, location); }

function isoDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth()+1).padStart(2,'0');
  const d = String(date.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function lastDayOfMonth(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }

function parseMonthDay(text, year) {
  const [m, dRaw] = text.split('-');
  const month = Number(m);
  const day = dRaw === 'last' ? lastDayOfMonth(year, month) : Number(dRaw);
  return { month, day, value: month * 100 + day };
}

export function ruleValidOn(rule, date) {
  const key = isoDate(date);
  if (rule.validFrom && key < rule.validFrom) return false;
  if (rule.validTo && key > rule.validTo) return false;
  return true;
}

export function dateInRule(rule, date) {
  const year = date.getUTCFullYear();
  const now = (date.getUTCMonth()+1) * 100 + date.getUTCDate();
  const start = parseMonthDay(rule.start, year).value;
  const end = parseMonthDay(rule.end, year).value;
  if (start <= end) return now >= start && now <= end;
  return now >= start || now <= end;
}

function deDuplicateVariantRules(rules) {
  const grouped = new Map();
  for (const r of rules) {
    const key = `${r.label}|${r.kind}|${r.source}`;
    const old = grouped.get(key);
    if (!old || (r.restriction && !old.restriction)) grouped.set(key, r);
  }
  let out = [...grouped.values()];
  if (out.some(r => r.id !== 'alg-rest' && r.id.startsWith('alg-'))) out = out.filter(r => r.id !== 'alg-rest');
  return out;
}

export function activeRules(speciesId, date, location) {
  return deDuplicateVariantRules(RULES.filter(r => r.species.includes(speciesId) && ruleValidOn(r,date) && matchRegion(r,location) && dateInRule(r,date)));
}

export function matchingRules(speciesId, date, location) {
  return RULES.filter(r => r.species.includes(speciesId) && ruleValidOn(r,date) && matchRegion(r,location));
}

export function seasonState(speciesId, date, location) {
  const rules = activeRules(speciesId,date,location);
  if (!rules.length) return 'off';
  const nonWindow = rules.filter(r => r.kind !== 'window');
  if (nonWindow.some(r => !r.restriction)) return 'normal';
  if (nonWindow.length && nonWindow.every(r => r.restriction)) return 'restricted';
  if (rules.some(r => r.kind === 'window')) return 'window';
  return 'normal';
}

function clampMinute(v) { return Math.max(0, Math.min(1440, Math.round(v))); }

function isOpeningDate(rule, date) {
  const md = `${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
  return md === rule.start;
}

function applyOpeningClock(rule, date, segments) {
  if (!Number.isFinite(rule.startTime) || !isOpeningDate(rule,date)) return segments;
  return segments.map(seg => ({...seg, start: Math.max(seg.start, rule.startTime)})).filter(seg => seg.end > seg.start);
}

function dailyIntervalsForRule(rule, date, location) {
  let segments;
  if (rule.daily === 'allDay') {
    segments = [{ start:0, end:1440, state: rule.restriction ? 'restricted' : rule.kind }];
    return applyOpeningClock(rule,date,segments);
  }
  const sun = getSunTimes(date, location.lat, location.lon);
  if (!sun.sunrise || !sun.sunset) return [{ start:0, end:1440, state:'uncertain', polar:sun.polar }];
  const rise = stockholmMinutes(sun.sunrise);
  const set = stockholmMinutes(sun.sunset);
  if (rule.daily === 'sunrise-60_sunset+60') {
    segments = [{ start:clampMinute(rise-60), end:clampMinute(set+60), state: rule.restriction ? 'restricted' : rule.kind }];
  } else if (rule.daily === 'sunrise-60_sunset+60_last60restricted') {
    if (rule.restriction) segments = [{ start:clampMinute(rise-60), end:clampMinute(set+60), state:'restricted' }];
    else if (rule.kind === 'window') segments = [{ start:clampMinute(rise-60), end:clampMinute(set+60), state:'window' }];
    else segments = [
      { start:clampMinute(rise-60), end:clampMinute(set), state:'normal' },
      { start:clampMinute(set), end:clampMinute(set+60), state:'restricted' }
    ];
  } else if (rule.daily === 'sunrise-60_sunset-120') {
    segments = [{ start:clampMinute(rise-60), end:clampMinute(set-120), state: rule.kind === 'window' ? 'window' : (rule.restriction ? 'restricted' : 'normal') }];
  } else segments = [{start:0,end:1440,state:'normal'}];
  return applyOpeningClock(rule,date,segments);
}

export function dailySegments(speciesId, date, location) {
  const rules = activeRules(speciesId,date,location);
  if (!rules.length) return [];
  const minute = Array.from({length:1440}, () => ({normal:0, restricted:0, window:0, uncertain:0}));
  for (const r of rules) for (const seg of dailyIntervalsForRule(r,date,location)) {
    for (let m=seg.start; m<seg.end; m++) minute[m][seg.state] = (minute[m][seg.state] || 0) + 1;
  }
  const stateAt = (m) => {
    const x = minute[m];
    if (x.normal) return 'normal';
    if (x.restricted) return 'restricted';
    if (x.window) return 'window';
    if (x.uncertain) return 'uncertain';
    return 'off';
  };
  const out = [];
  let start = 0, state = stateAt(0);
  for (let m=1;m<=1440;m++) {
    const next = m === 1440 ? null : stateAt(m);
    if (next !== state) {
      if (state !== 'off') out.push({start,end:m,state});
      start = m; state = next;
    }
  }
  return out;
}

export function sunSummary(date, location) {
  const sun = getSunTimes(date, location.lat, location.lon);
  return { sunrise: formatStockholmTime(sun.sunrise), sunset: formatStockholmTime(sun.sunset), polar: sun.polar, raw: sun };
}

export function describeDailyRule(rule, date, location) {
  const opening = Number.isFinite(rule.startTime) && isOpeningDate(rule,date) ? ` Öppningsdagen börjar perioden tidigast kl. ${String(Math.floor(rule.startTime/60)).padStart(2,'0')}:${String(rule.startTime%60).padStart(2,'0')}.` : '';
  if (rule.daily === 'allDay') return `Ingen fast solbegränsning i 9 § för denna säsongsrad.${opening}`;
  const s = sunSummary(date,location);
  if (s.polar) return s.polar === 'night' ? 'Solen går inte upp denna dag; ingen artificiell klocktid visas.' : 'Solen går inte ned denna dag; ingen artificiell klocktid visas.';
  const rise = addMinutes(s.raw.sunrise,-60);
  if (rule.daily === 'sunrise-60_sunset+60') return `${formatStockholmTime(rise)}–${formatStockholmTime(addMinutes(s.raw.sunset,60))} (1 h före soluppgång till 1 h efter solnedgång).${opening}`;
  if (rule.daily === 'sunrise-60_sunset+60_last60restricted') return `${formatStockholmTime(rise)}–${formatStockholmTime(addMinutes(s.raw.sunset,60))}; sista timmen efter solnedgång endast smyg-/vaktjakt.${opening}`;
  if (rule.daily === 'sunrise-60_sunset-120') return `${formatStockholmTime(rise)}–${formatStockholmTime(addMinutes(s.raw.sunset,-120))} (1 h före soluppgång till 2 h före solnedgång).${opening}`;
  return '';
}

export function speciesRelevant(speciesId, location, rangeStart, rangeEnd) {
  const cursor = new Date(rangeStart.getTime());
  for (let i=0; cursor <= rangeEnd && i<400; i++, cursor.setUTCDate(cursor.getUTCDate()+1)) if (activeRules(speciesId,cursor,location).length) return true;
  return false;
}

export function sourceFor(rule) { return SOURCES[rule.source]; }

export function periodLabel(rule) {
  const fmt = (md) => {
    const [m,d] = md.split('-');
    const months = ['','jan','feb','mars','apr','maj','juni','juli','aug','sep','okt','nov','dec'];
    return `${d === 'last' ? 'sista' : Number(d)} ${months[Number(m)]}`;
  };
  return `${fmt(rule.start)}–${fmt(rule.end)}`;
}

export function inferSpecialAreas(location) {
  const county = normalizeCounty(location.county || '');
  const municipality = normalizeMunicipality(location.municipality || '');
  const special = {...(location.special || {})};
  const m = strip(municipality);
  const c = strip(county);

  const setLappmark = value => {
    if (value === 'above') { special.aboveLappmark = true; special.belowLappmark = false; }
    else if (value === 'below') { special.belowLappmark = true; special.aboveLappmark = false; }
    else { delete special.aboveLappmark; delete special.belowLappmark; }
  };

  if (c.includes('norrbotten')) {
    const above = ['arjeplog','arvidsjaur','jokkmokk','gallivare','kiruna'];
    const below = ['pitea','lulea','alvsbyn','boden','kalix','haparanda','pajala','overkalix','overtornea'];
    if (above.some(x => m.includes(x))) setLappmark('above');
    else if (below.some(x => m.includes(x))) setLappmark('below');
    else setLappmark(null);

    const borderPossible = ['kiruna','pajala','overtornea','haparanda'].some(x => m.includes(x));
    if (!borderPossible) special.borderRiver = false;

    const cultivationBoundaryPossible = ['kiruna','gallivare','jokkmokk','arjeplog','arvidsjaur'].some(x => m.includes(x));
    if (!cultivationBoundaryPossible) special.westOdlingsgransNorrbotten = false;
  } else if (c.includes('vasterbotten')) {
    const above = ['sorsele','storuman','vilhelmina','dorotea','asele','lycksele','mala'];
    const below = ['umea','skelleftea','robertsfors','vannas','nordmaling','norsjo'];
    if (above.some(x => m.includes(x))) setLappmark('above');
    else if (below.some(x => m.includes(x))) setLappmark('below');
    else setLappmark(null);
    special.borderRiver = false;
    special.westOdlingsgransNorrbotten = false;
  } else {
    delete special.aboveLappmark;
    delete special.belowLappmark;
    special.borderRiver = false;
    special.westOdlingsgransNorrbotten = false;
  }

  if (!(c.includes('dalarna') && m.includes('mora'))) special.northMora = false;
  if (!c.includes('skane')) special.skaneKronhjortArea = false;

  return {...location, county, municipality, special};
}