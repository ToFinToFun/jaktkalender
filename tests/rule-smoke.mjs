import { DEFAULT_LOCATION } from '../js/data.js';
import { activeRules, dailySegments, seasonState, sunSummary, speciesRelevant, inferSpecialAreas } from '../js/rules.js';

const D = value => new Date(value + 'T12:00:00Z');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log('PASS', message);
};

const lulea = structuredClone(DEFAULT_LOCATION);
const sun = sunSummary(D('2026-09-19'), lulea);
assert(sun.sunrise.startsWith('06:'), 'Luleå sunrise is around 06 on 19 Sep');
assert(sun.sunset.startsWith('18:'), 'Luleå sunset is around 18 on 19 Sep');

assert(
  activeRules('alg', D('2026-09-19'), lulea).some(rule => rule.id === 'alg-north-counties'),
  'Elk uses the northern base period on 19 Sep'
);

const elk = dailySegments('alg', D('2026-09-19'), lulea);
assert(
  elk.length === 2 && elk[0].state === 'normal' && elk[1].state === 'restricted',
  'Elk gets normal time plus the restricted last hour after sunset'
);


const luleaFromMap = {
  ...lulea,
  county: 'Norrbotten County',
  municipality: 'Luleå Municipality'
};
assert(
  activeRules('alg', D('2026-09-19'), luleaFromMap).some(rule => rule.id === 'alg-north-counties'),
  'English map county name still matches Norrbottens län'
);
const elkFromMap = dailySegments('alg', D('2026-09-19'), luleaFromMap);
assert(
  elkFromMap.length === 2 && elkFromMap[0].state === 'normal' && elkFromMap[1].state === 'restricted',
  'Elk day bar renders for map-geocoded Luleå on 19 Sep'
);

assert(
  seasonState('vildsvin', D('2026-06-15'), lulea) === 'normal',
  'Wild-boar yearling season spans June'
);

const border = { ...lulea, special: { ...(lulea.special || {}), borderRiver: true } };
const goose = dailySegments('gragas', D('2026-08-20'), border);
assert(goose[0]?.start === 660, 'Border-river goose opening starts 11:00 on 20 Aug');

assert(
  seasonState('falthare', D('2027-08-25'), lulea) === 'off',
  'From 2027 northern field hare is not open on 25 Aug'
);

const pajalaGeo = inferSpecialAreas({name:'Pajala',lat:67.2,lon:23.4,county:'Norrbotten County',municipality:'Pajala Municipality',special:{}});
assert(pajalaGeo.special.belowLappmark === true, 'Pajala is automatically classified below lappmarksgränsen');
assert(pajalaGeo.special.borderRiver === undefined, 'Pajala keeps gränsälvsområdet unresolved for manual confirmation');

const kirunaGeo = inferSpecialAreas({name:'Kiruna',lat:67.85,lon:20.23,county:'Norrbotten County',municipality:'Kiruna Municipality',special:{}});
assert(kirunaGeo.special.aboveLappmark === true, 'Kiruna is automatically classified above lappmarksgränsen');
assert(kirunaGeo.special.westOdlingsgransNorrbotten === undefined, 'Kiruna keeps odlingsgränsen unresolved for manual confirmation');

const norsjoGeo = inferSpecialAreas({name:'Norsjö',lat:64.91,lon:19.48,county:'Västerbotten County',municipality:'Norsjö Municipality',special:{}});
assert(norsjoGeo.special.belowLappmark === true, 'Norsjö is automatically classified below lappmarksgränsen');

const bjurholmGeo = inferSpecialAreas({name:'Bjurholm',lat:63.93,lon:19.21,county:'Västerbotten County',municipality:'Bjurholm Municipality',special:{}});
assert(bjurholmGeo.special.aboveLappmark === undefined && bjurholmGeo.special.belowLappmark === undefined, 'Bjurholm stays unresolved where lappmarksgränsen crosses the municipality');

const stockholm = {
  name: 'Stockholm',
  lat: 59.3293,
  lon: 18.0686,
  county: 'Stockholms län',
  municipality: 'Stockholms kommun',
  special: {}
};

assert(
  seasonState('falthare', D('2027-08-25'), stockholm) === 'normal',
  'From 2027 field hare in the rest of Sweden opens 21 Aug'
);
assert(
  seasonState('gratrut', D('2027-08-10'), stockholm) === 'off',
  'Herring gull no longer has a general season after 1 Jul 2027'
);
assert(
  seasonState('snatterand', D('2027-09-01'), stockholm) === 'normal',
  'Gadwall future season is active in Stockholm'
);
assert(
  speciesRelevant('tjader', lulea, D('2026-07-01'), D('2027-06-30')),
  'Capercaillie is relevant for a Luleå hunting year'
);

console.log('All rule smoke tests passed.');
