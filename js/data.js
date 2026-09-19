export const SOURCES = {
  hunting: {
    label: 'Jaktförordning (1987:905)',
    url: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/jaktforordning-1987905_sfs-1987-905/'
  },
  predators: {
    label: 'NFS 2022:4, 5 kap. Jakttider',
    url: 'https://www.naturvardsverket.se/lagar-och-regler/foreskrifter-och-allmanna-rad/2022/nfs-2022-4/'
  }
};

export const GROUPS = [
  { id: 'klovvilt', name: 'Klövvilt' },
  { id: 'rovdjur', name: 'Rovdjur' },
  { id: 'smavilt', name: 'Småvilt' },
  { id: 'skogsfagel', name: 'Skogsfågel' },
  { id: 'sjofagel', name: 'Änder och gäss' },
  { id: 'ovrig_fagel', name: 'Övrig fågel' }
];

export const SPECIES = [
  ['alg','Älg','klovvilt'], ['radjur','Rådjur','klovvilt'], ['dovhjort','Dovhjort','klovvilt'], ['kronhjort','Kronhjort','klovvilt'], ['vildsvin','Vildsvin','klovvilt'],
  ['bjorn','Björn','rovdjur'], ['varg','Varg','rovdjur'], ['jarv','Järv','rovdjur'], ['lo','Lodjur','rovdjur'], ['rodrav','Rödräv','rovdjur'],
  ['falthare','Fälthare','smavilt'], ['skogshare','Skogshare','smavilt'], ['baver','Bäver','smavilt'], ['iller','Iller','smavilt'], ['skogsmard','Skogsmård','smavilt'], ['gravling','Grävling','smavilt'],
  ['dalripa','Dalripa','skogsfagel'], ['fjallripa','Fjällripa','skogsfagel'], ['jarpe','Järpe','skogsfagel'], ['orre','Orre','skogsfagel'], ['tjader','Tjäder','skogsfagel'],
  ['blasgas','Bläsgås','sjofagel'], ['gragas','Grågås','sjofagel'], ['kanadagas','Kanadagås','sjofagel'], ['blasand','Bläsand','sjofagel'], ['grasand','Gräsand','sjofagel'], ['kricka','Kricka','sjofagel'], ['knipa','Knipa','sjofagel'], ['storskrake','Storskrake','sjofagel'], ['sjoorre','Sjöorre','sjofagel'], ['vigg','Vigg','sjofagel'], ['snatterand','Snatterand','sjofagel'],
  ['rapphona','Rapphöna','ovrig_fagel'], ['fasan','Fasan','ovrig_fagel'], ['morkulla','Morkulla','ovrig_fagel'], ['fiskmas','Fiskmås','ovrig_fagel'], ['gratrut','Gråtrut','ovrig_fagel'], ['ringduva','Ringduva','ovrig_fagel'], ['notskrika','Nötskrika','ovrig_fagel'], ['kaja','Kaja','ovrig_fagel'], ['kraka','Kråka','ovrig_fagel'], ['skata','Skata','ovrig_fagel'], ['raka','Råka','ovrig_fagel']
].map(([id,name,group], index) => ({ id, name, group, index }));

const ALL = { type: 'all' };
const counties = (...names) => ({ type: 'counties', names });
const exceptCounties = (...names) => ({ type: 'exceptCounties', names });
const countyMunicipalities = (county, ...municipalities) => ({ type: 'countyMunicipalities', county, municipalities });
const countyExceptMunicipalities = (county, ...municipalities) => ({ type: 'countyExceptMunicipalities', county, municipalities });
const special = (key, base = ALL) => ({ type: 'special', key, base });
const notSpecial = (key, base = ALL) => ({ type: 'notSpecial', key, base });

const HUNT = 'hunting';
const PRED = 'predators';
const allDay = 'allDay';
const birdsLight = 'sunrise-60_sunset+60';
const deerLight = 'sunrise-60_sunset+60_last60restricted';
const bearLight = 'sunrise-60_sunset-120';

const rule = (id, species, start, end, region = ALL, options = {}) => ({
  id, species: Array.isArray(species) ? species : [species], start, end, region,
  source: options.source || HUNT,
  daily: options.daily || allDay,
  label: options.label || '',
  restriction: options.restriction || '',
  kind: options.kind || 'normal',
  validFrom: options.validFrom || '2021-07-01',
  validTo: options.validTo || null,
  note: options.note || '',
  startTime: Number.isFinite(options.startTime) ? options.startTime : null
});

const north6 = ['Dalarnas län','Gävleborgs län','Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län'];
const north4 = ['Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län'];
const southHare = ['Gotlands län','Hallands län','Jönköpings län','Kalmar län','Kronobergs län','Skåne län','Södermanlands län','Västra Götalands län','Östergötlands län'];
const grouseShort = ['Östergötlands län','Jönköpings län','Kronobergs län','Kalmar län','Blekinge län','Hallands län','Västra Götalands län'];
const duckSouth = ['Gotlands län','Blekinge län','Skåne län'];
const duckNorth = ['Dalarnas län','Gävleborgs län','Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län'];
const northPredator = ['Norrbottens län','Västerbottens län','Jämtlands län','Västernorrlands län'];

export const RULES = [
  rule('falthare-current','falthare','09-01','02-last',ALL,{validTo:'2027-06-30'}),
  rule('falthare-2027-north','falthare','09-01','02-last',counties(...north4),{validFrom:'2027-07-01'}),
  rule('falthare-2027-rest','falthare','08-21','02-last',exceptCounties(...north4),{validFrom:'2027-07-01'}),

  rule('skogshare-south','skogshare','09-01','02-15',counties(...southHare)),
  rule('skogshare-rest','skogshare','09-01','02-last',exceptCounties(...southHare)),
  rule('baver-north','baver','10-01','05-15',counties(...north6)),
  rule('baver-rest','baver','10-01','05-10',exceptCounties(...north6)),

  rule('rodrav-south','rodrav','08-01','02-last',counties('Blekinge län','Skåne län','Hallands län')),
  rule('rodrav-middle','rodrav','08-01','03-31',counties('Värmlands län','Örebro län','Gävleborgs län')),
  rule('rodrav-dalarna','rodrav','08-01','03-31',countyExceptMunicipalities('Dalarnas län','Älvdalens kommun')),
  rule('rodrav-alvdalen','rodrav','08-01','04-15',countyMunicipalities('Dalarnas län','Älvdalens kommun')),
  rule('rodrav-north','rodrav','08-01','04-15',counties('Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län')),
  rule('rodrav-rest','rodrav','08-01','03-15',exceptCounties('Blekinge län','Skåne län','Hallands län','Värmlands län','Örebro län','Dalarnas län','Gävleborgs län','Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län')),

  rule('iller','iller','09-01','02-last'),
  rule('skogsmard-north','skogsmard','09-01','03-31',counties('Värmlands län','Dalarnas län','Gävleborgs län','Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län')),
  rule('skogsmard-rest','skogsmard','09-01','02-last',exceptCounties('Värmlands län','Dalarnas län','Gävleborgs län','Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län')),
  rule('gravling','gravling','08-01','01-31'),

  rule('vildsvin-general','vildsvin','04-01','01-31',ALL,{label:'Vildsvin utom sugga som följs av randiga eller bruna små kultingar'}),
  rule('vildsvin-young','vildsvin','07-01','06-30',ALL,{label:'Årsunge'}),

  rule('dov-all-oct','dovhjort','10-01','10-20',ALL,{daily:deerLight,label:'Alla djur'}),
  rule('dov-all-winter','dovhjort','11-16','02-last',ALL,{daily:deerLight,label:'Alla djur'}),
  rule('dov-antler-calf','dovhjort','09-01','09-30',ALL,{daily:deerLight,label:'Hornbärande djur och kalv',restriction:'Endast smyg- eller vaktjakt'}),
  rule('dov-hind-calf-autumn','dovhjort','10-21','11-15',ALL,{daily:deerLight,label:'Hind och kalv'}),
  rule('dov-hind-calf-march','dovhjort','03-01','03-31',ALL,{daily:deerLight,label:'Hind och kalv',restriction:'Endast smyg- eller vaktjakt'}),

  rule('kron-skane-out','kronhjort','10-08','01-31',notSpecial('skaneKronhjortArea', counties('Skåne län')),{daily:deerLight,label:'Utanför kronhjortsområde i Skåne'}),
  rule('kron-calf-outside','kronhjort','08-16','01-31',notSpecial('kronhjortManagement', exceptCounties('Skåne län')),{daily:deerLight,label:'Årskalv utanför kronhjortsskötselområde'}),
  rule('kron-calf-outside-restricted','kronhjort','08-16','09-30',notSpecial('kronhjortManagement', exceptCounties('Skåne län')),{daily:deerLight,label:'Årskalv utanför kronhjortsskötselområde',restriction:'Endast smyg- eller vaktjakt'}),
  rule('kron-skane-area','kronhjort','10-08','01-31',special('skaneKronhjortArea', counties('Skåne län')),{daily:deerLight,label:'Kronhjortsområde i Skåne',kind:'window',note:'Länsstyrelsen beslutar en eller flera perioder inom denna fasta ram.'}),
  rule('kron-management-stag','kronhjort','10-08','01-31',special('kronhjortManagement', exceptCounties('Skåne län')),{daily:deerLight,label:'Hjort inom kronhjortsskötselområde'}),
  rule('kron-management-hind-calf','kronhjort','08-16','02-last',special('kronhjortManagement', exceptCounties('Skåne län')),{daily:deerLight,label:'Hind och årskalv inom kronhjortsskötselområde'}),
  rule('kron-management-hind-calf-early','kronhjort','08-16','09-30',special('kronhjortManagement', exceptCounties('Skåne län')),{daily:deerLight,label:'Hind och årskalv inom kronhjortsskötselområde',restriction:'Endast smyg- eller vaktjakt'}),
  rule('kron-management-hind-calf-feb','kronhjort','02-01','02-last',special('kronhjortManagement', exceptCounties('Skåne län')),{daily:deerLight,label:'Hind och årskalv inom kronhjortsskötselområde',restriction:'Endast smyg- eller vaktjakt'}),

  rule('radjur-antler-autumn','radjur','08-16','09-30',ALL,{daily:deerLight,label:'Hornbärande',restriction:'Endast smyg- eller vaktjakt'}),
  rule('radjur-antler-spring','radjur','05-01','06-15',ALL,{daily:deerLight,label:'Hornbärande',restriction:'Endast smyg- eller vaktjakt'}),
  rule('radjur-kid-sep','radjur','09-01','09-30',ALL,{daily:deerLight,label:'Kid',restriction:'Endast smyg- eller vaktjakt'}),
  rule('radjur-general','radjur','10-01','01-31',ALL,{daily:deerLight,label:'Rådjur'}),
  rule('radjur-kid-feb-2027','radjur','02-01','02-last',ALL,{daily:deerLight,label:'Kid',restriction:'Endast smyg- eller vaktjakt',validFrom:'2027-07-01'}),

  rule('blasgas-skane','blasgas','10-01','01-31',counties('Skåne län'),{daily:birdsLight}),
  rule('gray-canada-main',['gragas','kanadagas'],'08-11','01-31',notSpecial('borderRiver'),{daily:birdsLight}),
  rule('gray-canada-border',['gragas','kanadagas'],'08-20','01-31',special('borderRiver', counties('Norrbottens län')),{daily:birdsLight,label:'Gränsälvsområdet',note:'Perioden börjar kl. 11.00 den 20 augusti.',startTime:660}),

  rule('duck-south-current',['blasand','grasand','kricka'],'08-21','12-31',counties(...duckSouth),{daily:birdsLight,validTo:'2027-06-30'}),
  rule('duck-north-current',['blasand','grasand','kricka'],'08-25','11-30',notSpecial('borderRiver', counties(...duckNorth)),{daily:birdsLight,validTo:'2027-06-30'}),
  rule('duck-border-current',['blasand','grasand','kricka'],'08-20','11-30',special('borderRiver', counties('Norrbottens län')),{daily:birdsLight,validTo:'2027-06-30',note:'Perioden börjar kl. 11.00 den 20 augusti.',startTime:660}),
  rule('blasand-kricka-rest-current',['blasand','kricka'],'08-21','11-30',exceptCounties(...duckSouth,...duckNorth),{daily:birdsLight,validTo:'2027-06-30'}),
  rule('grasand-rest-current','grasand','08-21','12-31',exceptCounties(...duckSouth,...duckNorth),{daily:birdsLight,validTo:'2027-06-30'}),

  rule('duck-south-2027',['blasand','kricka'],'08-21','12-31',counties(...duckSouth),{daily:birdsLight,validFrom:'2027-07-01'}),
  rule('duck-north-2027',['blasand','kricka'],'08-25','11-30',notSpecial('borderRiver', counties(...duckNorth)),{daily:birdsLight,validFrom:'2027-07-01'}),
  rule('duck-border-2027',['blasand','grasand','kricka'],'08-20','11-30',special('borderRiver', counties('Norrbottens län')),{daily:birdsLight,validFrom:'2027-07-01',note:'Perioden börjar kl. 11.00 den 20 augusti.',startTime:660}),
  rule('blasand-kricka-rest-2027',['blasand','kricka'],'08-21','11-30',exceptCounties(...duckSouth,...duckNorth),{daily:birdsLight,validFrom:'2027-07-01'}),
  rule('grasand-rest-2027','grasand','08-21','01-31',notSpecial('borderRiver'),{daily:birdsLight,validFrom:'2027-07-01'}),

  rule('knipa-storskrake-current',['knipa','storskrake'],'08-21','01-31',notSpecial('borderRiver'),{daily:birdsLight,validTo:'2027-06-30'}),
  rule('knipa-storskrake-2027',['knipa','storskrake'],'08-21','02-20',notSpecial('borderRiver'),{daily:birdsLight,validFrom:'2027-07-01'}),
  rule('knipa-storskrake-border',['knipa','storskrake'],'08-20','01-31',special('borderRiver',counties('Norrbottens län')),{daily:birdsLight,note:'Perioden börjar kl. 11.00 den 20 augusti.',startTime:660}),
  rule('sjoorre','sjoorre','09-21','01-31',ALL,{daily:birdsLight}),
  rule('vigg-main','vigg','08-21','01-31',notSpecial('borderRiver'),{daily:birdsLight}),
  rule('vigg-border','vigg','08-20','01-31',special('borderRiver',counties('Norrbottens län')),{daily:birdsLight,note:'Perioden börjar kl. 11.00 den 20 augusti.',startTime:660}),

  rule('ripa-alvdalen-current',['dalripa','fjallripa'],'08-25','02-last',countyMunicipalities('Dalarnas län','Älvdalens kommun'),{validTo:'2027-06-30'}),
  rule('ripa-jamtland-current',['dalripa','fjallripa'],'08-25','02-last',counties('Jämtlands län'),{validTo:'2027-06-30'}),
  rule('ripa-below-current',['dalripa','fjallripa'],'08-25','02-15',special('belowLappmark',counties('Västerbottens län','Norrbottens län')),{validTo:'2027-06-30'}),
  rule('ripa-above-current',['dalripa','fjallripa'],'08-25','03-15',special('aboveLappmark',counties('Västerbottens län','Norrbottens län')),{validTo:'2027-06-30'}),
  rule('ripa-dalarna-rest-current',['dalripa','fjallripa'],'08-25','02-15',countyExceptMunicipalities('Dalarnas län','Älvdalens kommun'),{validTo:'2027-06-30'}),
  rule('ripa-mid-current',['dalripa','fjallripa'],'08-25','11-15',counties('Värmlands län','Gävleborgs län','Västernorrlands län'),{validTo:'2027-06-30'}),
  rule('ripa-2027',['dalripa','fjallripa'],'08-25','03-15',counties('Norrbottens län','Västerbottens län','Jämtlands län','Gävleborgs län','Dalarnas län','Värmlands län'),{validFrom:'2027-07-01'}),

  rule('jarpe','jarpe','08-25','11-15',counties('Norrbottens län','Västerbottens län','Jämtlands län','Västernorrlands län','Gävleborgs län','Dalarnas län','Värmlands län')),
  rule('grouse-short',['orre','tjader'],'08-25','09-30',counties(...grouseShort),{label:'Orre och tjäder'}),
  rule('grouse-main',['orre','tjader'],'08-25','11-15',exceptCounties(...grouseShort,'Gotlands län','Skåne län'),{label:'Orre och tjäder'}),
  rule('grouse-cocks-short',['orre','tjader'],'01-01','01-31',counties(...grouseShort),{label:'Endast tupp'}),
  rule('grouse-cocks-skane-sep',['orre','tjader'],'09-01','09-15',counties('Skåne län'),{label:'Endast tupp'}),
  rule('grouse-cocks-skane-jan',['orre','tjader'],'01-01','01-31',counties('Skåne län'),{label:'Endast tupp'}),
  rule('grouse-cocks-rest',['orre','tjader'],'11-16','02-15',exceptCounties(...grouseShort,'Gotlands län'),{label:'Endast tupp'}),

  rule('rapphona','rapphona','09-16','11-30'),
  rule('fasan','fasan','10-01','01-31'),
  rule('morkulla','morkulla','09-11','12-31'),
  rule('fiskmas','fiskmas','08-11','02-last'),
  rule('gratrut-current','gratrut','08-01','03-31',ALL,{validTo:'2027-06-30'}),
  rule('ringduva-north','ringduva','08-01','12-31',counties(...north6)),
  rule('ringduva-rest','ringduva','08-16','12-31',exceptCounties(...north6)),
  rule('notskrika','notskrika','08-21','03-10'),
  rule('corvids-north',['kaja','kraka','skata'],'07-16','04-30',counties(...north4)),
  rule('corvids-rest',['kaja','kraka','skata'],'07-01','04-15',exceptCounties(...north4)),
  rule('raka','raka','07-21','01-31',counties('Skåne län','Hallands län')),
  rule('snatterand-2027','snatterand','08-21','12-31',counties('Värmlands län','Örebro län','Västmanlands län','Uppsala län','Stockholms län','Södermanlands län','Västra Götalands län','Östergötlands län','Hallands län','Jönköpings län','Kalmar län','Gotlands län','Kronobergs län','Skåne län'),{daily:birdsLight,validFrom:'2027-07-01'}),

  rule('alg-north-counties','alg','09-01','01-31',counties('Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län'),{daily:deerLight,label:'Bilaga 2 – grundperiod'}),
  rule('alg-torsby','alg','09-01','01-31',countyMunicipalities('Värmlands län','Torsby kommun'),{daily:deerLight,label:'Bilaga 2 – grundperiod'}),
  rule('alg-dalarna-north','alg','09-01','01-31',countyMunicipalities('Dalarnas län','Malung-Sälens kommun','Orsa kommun','Rättviks kommun','Älvdalens kommun'),{daily:deerLight,label:'Bilaga 2 – grundperiod'}),
  rule('alg-mora-north','alg','09-01','01-31',special('northMora',counties('Dalarnas län')),{daily:deerLight,label:'Norra delar av Mora kommun'}),
  rule('alg-gavleborg','alg','09-01','01-31',countyMunicipalities('Gävleborgs län','Ljusdals kommun','Ovanåkers kommun','Hudiksvalls kommun','Nordanstigs kommun'),{daily:deerLight,label:'Bilaga 2 – grundperiod'}),
  rule('alg-rest','alg','10-08','01-31',ALL,{daily:deerLight,label:'Övriga landet',note:'Om platsen omfattas av en särskild 1-septemberregel visas den parallellt och har företräde.'}),

  rule('bjorn-window','bjorn','08-21','10-15',notSpecial('westOdlingsgransNorrbotten'),{daily:bearLight,source:PRED,kind:'window',label:'Fast ram för licensjaktsbeslut'}),
  rule('bjorn-west-norrbotten','bjorn','08-21','09-30',special('westOdlingsgransNorrbotten',counties('Norrbottens län')),{daily:bearLight,source:PRED,kind:'window',label:'Väster om odlingsgränsen i Norrbotten'}),
  rule('varg-window','varg','01-02','02-15',ALL,{daily:deerLight,source:PRED,kind:'window',label:'Fast ram för licensjaktsbeslut'}),
  rule('jarv-window','jarv','10-01','12-31',ALL,{daily:deerLight,source:PRED,kind:'window',label:'Fast ram för licensjaktsbeslut'}),
  rule('lo-north-window','lo','03-01','04-15',counties(...northPredator),{daily:deerLight,source:PRED,kind:'window',label:'Norra rovdjursförvaltningsområdet'}),
  rule('lo-rest-window','lo','03-01','03-31',exceptCounties(...northPredator),{daily:deerLight,source:PRED,kind:'window',label:'Övriga landet'})
];

export const DEFAULT_LOCATION = {
  name: 'Luleå',
  lat: 65.5848,
  lon: 22.1567,
  county: 'Norrbottens län',
  municipality: 'Luleå kommun',
  special: { belowLappmark: true }
};

export const DEFAULT_SELECTED = ['alg','radjur','rodrav','bjorn','vildsvin','skogshare','orre','tjader'];
