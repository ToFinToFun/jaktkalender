const API_ROOT = 'https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point';

const WATERFOWL = new Set(['blasgas','gragas','kanadagas','blasand','grasand','kricka','knipa','storskrake','sjoorre','vigg','snatterand']);
const GEESE = new Set(['blasgas','gragas','kanadagas']);
const TOP_BIRDS = new Set(['orre','tjader']);
const HARES = new Set(['skogshare','falthare']);
const STALK = new Set(['alg','radjur','kronhjort','dovhjort']);
const PREDATORS = new Set(['bjorn','varg','jarv','lo']);

const clean = v => v === 9999 || v === -9999 || !Number.isFinite(v) ? null : v;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

export function stockholmDateParts(value) {
  const d = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('sv-SE',{
    timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(d);
  const get = type => Number(parts.find(p=>p.type===type)?.value || 0);
  return {year:get('year'),month:get('month'),day:get('day'),hour:get('hour'),minute:get('minute')};
}

export function localDateKey(value) {
  const p=stockholmDateParts(value);
  return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
}

export function localMinute(value) {
  const p=stockholmDateParts(value);
  return p.hour*60+p.minute;
}

function cacheKey(location) {
  return `${Number(location.lat).toFixed(3)},${Number(location.lon).toFixed(3)}`;
}

function readCache(location) {
  try {
    const raw=JSON.parse(localStorage.getItem('jaktkalender.smhiForecast')||'null');
    if(!raw||raw.key!==cacheKey(location)||Date.now()-raw.savedAt>30*60*1000)return null;
    return raw.payload;
  } catch { return null; }
}

function writeCache(location,payload) {
  try {
    localStorage.setItem('jaktkalender.smhiForecast',JSON.stringify({key:cacheKey(location),savedAt:Date.now(),payload}));
  } catch {}
}

export async function fetchSmhiForecast(location,{signal}={}) {
  const cached=readCache(location);
  if(cached)return cached;
  const lon=Number(location.lon).toFixed(6),lat=Number(location.lat).toFixed(6);
  const url=`${API_ROOT}/lon/${lon}/lat/${lat}/data.json`;
  const res=await fetch(url,{signal,headers:{Accept:'application/json'}});
  if(!res.ok)throw new Error(`SMHI ${res.status}`);
  const json=await res.json();
  const points=(json.timeSeries||[]).map(x=>({
    time:x.time,
    intervalStart:x.intervalParametersStartTime||null,
    data:Object.fromEntries(Object.entries(x.data||{}).map(([k,v])=>[k,clean(v)]))
  })).filter(x=>x.time);
  const payload={referenceTime:json.referenceTime||null,createdTime:json.createdTime||null,points};
  writeCache(location,payload);
  return payload;
}

function baseScore(d) {
  let s=72;
  const wind=d.wind_speed,gust=d.wind_speed_of_gust,precip=d.precipitation_amount_mean,vis=d.visibility_in_air;
  if(wind!==null){if(wind>14)s-=48;else if(wind>10)s-=30;else if(wind>7)s-=12;}
  if(gust!==null){if(gust>20)s-=30;else if(gust>15)s-=18;else if(gust>11)s-=8;}
  if(precip!==null){if(precip>5)s-=48;else if(precip>2)s-=30;else if(precip>0.8)s-=15;else if(precip>0.2)s-=5;}
  if(vis!==null){if(vis<1)s-=50;else if(vis<3)s-=28;else if(vis<5)s-=14;else if(vis<8)s-=6;}
  return s;
}

export function huntingWeatherScore(speciesId,d={}) {
  let s=baseScore(d);
  const wind=d.wind_speed,precip=d.precipitation_amount_mean,vis=d.visibility_in_air,temp=d.air_temperature,cloud=d.cloud_area_fraction;

  if(GEESE.has(speciesId)){
    if(wind!==null){if(wind>=3&&wind<=9)s+=18;else if(wind>=1.5&&wind<3)s+=8;else if(wind>11)s-=10;}
    if(cloud!==null&&cloud>=50)s+=7;
    if(precip!==null&&precip<=1.5)s+=5;
  } else if(WATERFOWL.has(speciesId)){
    if(wind!==null){if(wind>=3&&wind<=8)s+=16;else if(wind>=1.5&&wind<3)s+=7;else if(wind>10)s-=10;}
    if(precip!==null&&precip<=1)s+=4;
  } else if(speciesId==='rodrav'){
    if(wind!==null){if(wind<=3.5)s+=15;else if(wind>6)s-=22;}
    if(precip!==null){if(precip<=0.2)s+=10;else if(precip>0.8)s-=15;}
    if(vis!==null&&vis>=5)s+=4;
  } else if(TOP_BIRDS.has(speciesId)){
    if(temp!==null){if(temp<=-5)s+=14;else if(temp<=0)s+=8;else if(temp>5)s-=6;}
    if(wind!==null){if(wind<=4)s+=12;else if(wind>7)s-=20;}
    if(precip!==null){if(precip<=0.2)s+=7;else if(precip>1)s-=16;}
    if(cloud!==null&&cloud<=55)s+=5;
  } else if(HARES.has(speciesId)){
    if(wind!==null){if(wind<=3)s+=10;else if(wind>7)s-=16;}
    if(cloud!==null&&cloud>=50)s+=9;
    if(precip!==null){if(precip<=0.2)s+=5;else if(precip>0.8)s-=15;}
  } else if(speciesId==='baver'){
    if(wind!==null){if(wind<=4)s+=10;else if(wind>8)s-=16;}
    if(precip!==null&&precip<=0.5)s+=5;
  } else if(speciesId==='vildsvin'){
    if(wind!==null){if(wind>=1&&wind<=5)s+=9;else if(wind>9)s-=15;}
    if(precip!==null&&precip<=1)s+=4;
  } else if(STALK.has(speciesId)){
    if(wind!==null){if(wind>=1&&wind<=5)s+=9;else if(wind>8)s-=16;}
    if(precip!==null&&precip<=0.5)s+=5;
    if(vis!==null&&vis>=5)s+=3;
  } else if(PREDATORS.has(speciesId)){
    if(wind!==null&&wind<=5)s+=5;
    if(precip!==null&&precip<=0.5)s+=3;
  }
  return Math.round(clamp(s,0,100));
}

export function weatherGrade(score) {
  return score>=78?'good':score>=55?'fair':'poor';
}

export function weatherGradeLabel(score) {
  return score>=78?'Bra':score>=55?'Okej':'Svagare';
}

export function summarizeForecastDay(points) {
  if(!points?.length)return null;
  const vals=(key)=>points.map(p=>p.data?.[key]).filter(Number.isFinite);
  const temps=vals('air_temperature'),winds=vals('wind_speed'),gusts=vals('wind_speed_of_gust'),precs=vals('precipitation_amount_mean'),vis=vals('visibility_in_air');
  const sum=a=>a.reduce((x,y)=>x+y,0);
  return {
    tempMin:temps.length?Math.min(...temps):null,tempMax:temps.length?Math.max(...temps):null,
    windAvg:winds.length?sum(winds)/winds.length:null,windMax:winds.length?Math.max(...winds):null,
    gustMax:gusts.length?Math.max(...gusts):null,precip:precs.length?sum(precs):null,
    visibilityMin:vis.length?Math.min(...vis):null
  };
}
