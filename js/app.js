import { DEFAULT_LOCATION, DEFAULT_SELECTED } from './data.js';
import { SPECIES, GROUPS, activeRules, matchingRules, seasonState, dailySegments, sunSummary, describeDailyRule, speciesRelevant, sourceFor, periodLabel, inferSpecialAreas, normalizeCounty, normalizeMunicipality } from './rules.js';
import { adviceFor, activityWindowFor } from './advice.js';
import { getSunTimes, getCivilTwilightTimes, stockholmMinutes, roundMinutes } from './sun.js';
import { fetchSmhiForecast, localDateKey, localMinute, huntingWeatherScore, weatherGrade, weatherGradeLabel, summarizeForecastDay } from './weather.js';

const $=id=>document.getElementById(id);
const df=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',weekday:'long',day:'numeric',month:'long',year:'numeric'});
const ds=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',day:'numeric',month:'short'});
const dm=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',month:'short'});
const dml=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',month:'long',year:'numeric'});
const de=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',day:'numeric',month:'short'});
const cap=s=>s? s[0].toUpperCase()+s.slice(1):'';
const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const addDays=(d,n)=>{const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x};
const addMonths=(d,n)=>{const x=new Date(d);x.setUTCDate(1);x.setUTCMonth(x.getUTCMonth()+n);return x};
const dateUTC=(y,m,d)=>new Date(Date.UTC(y,m,d,12));
const daysBetween=(a,b)=>Math.round((Date.UTC(b.getUTCFullYear(),b.getUTCMonth(),b.getUTCDate())-Date.UTC(a.getUTCFullYear(),a.getUTCMonth(),a.getUTCDate()))/86400000);
const clock=m=>m<=0?'00:00':m>=1440?'24:00':`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

function stockholmToday(){
  const p=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  return dateUTC(+p.find(x=>x.type==='year').value,+p.find(x=>x.type==='month').value-1,+p.find(x=>x.type==='day').value);
}
function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
const SWEDISH_COUNTIES = [
  'Blekinge län','Dalarnas län','Gotlands län','Gävleborgs län','Hallands län','Jämtlands län',
  'Jönköpings län','Kalmar län','Kronobergs län','Norrbottens län','Skåne län','Stockholms län',
  'Södermanlands län','Uppsala län','Värmlands län','Västerbottens län','Västernorrlands län',
  'Västmanlands län','Västra Götalands län','Örebro län','Östergötlands län'
];
function addressCounty(a={}){
  for(const raw of [a.state,a.state_district,a.county]){
    if(!raw)continue;
    const n=normalizeCounty(raw);
    if(SWEDISH_COUNTIES.some(x=>normalizeCounty(x)===n))return n;
  }
  return '';
}
function addressMunicipality(a={}){
  const raw=a.municipality||a.city_district||a.city||a.town||a.village||'';
  return raw?normalizeMunicipality(raw):'';
}
function normGeoText(s=''){
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function geographyWarnings(loc, selected=state?.selected){
  const warnings=[], c=normGeoText(loc.county), m=normGeoText(loc.municipality), s=loc.special||{};
  if ((c.includes('norrbotten')||c.includes('vasterbotten')) && s.aboveLappmark!==true && s.belowLappmark!==true)
    warnings.push('Lappmarksgränsen behöver anges för den här platsen.');
  if (c.includes('norrbotten') && ['kiruna','pajala','overtornea','haparanda'].some(x=>m.includes(x)) && s.borderRiver===undefined)
    warnings.push('Bekräfta om platsen ligger inom gränsälvsområdet.');
  if (c.includes('norrbotten') && ['kiruna','gallivare','jokkmokk','arjeplog','arvidsjaur'].some(x=>m.includes(x)) && s.westOdlingsgransNorrbotten===undefined)
    warnings.push('Bekräfta sida om odlingsgränsen.');
  if (c.includes('dalarna') && m.includes('mora') && s.northMora===undefined)
    warnings.push('Bekräfta om platsen ligger i norra delen av Mora.');
  if (selected?.has?.('kronhjort')) {
    if (c.includes('skane') && s.skaneKronhjortArea===undefined)
      warnings.push('Bekräfta om platsen ligger i ett skånskt kronhjortsområde.');
    if (!c.includes('skane') && s.kronhjortManagement===undefined)
      warnings.push('Bekräfta om marken ingår i kronhjortsskötselområde.');
  }
  return warnings;
}
function triState(value){
  return value===true?'yes':value===false?'no':'unknown';
}
function setTriState(obj,key,value){
  const next={...(obj||{})};
  if(value==='unknown') delete next[key];
  else next[key]=value==='yes';
  return next;
}
function repairSavedLocation(loc){
  const x={...loc};
  if(x.county)x.county=normalizeCounty(x.county);
  if(x.municipality)x.municipality=normalizeMunicipality(x.municipality);
  const name=(x.name||'').toLowerCase();
  const municipality=(x.municipality||'').toLowerCase();
  if(!x.county&&(name.includes('luleå')||name.includes('kallax')||municipality.includes('luleå')))x.county='Norrbottens län';
  return inferSpecialAreas(x);
}

const state={
  location:repairSavedLocation(load('jaktkalender.location',structuredClone(DEFAULT_LOCATION))),
  selected:new Set(load('jaktkalender.species',DEFAULT_SELECTED)),view:'year',anchor:stockholmToday(),displayMode:'selected'
};
let locationDraft=structuredClone(state.location),selectedDraft=new Set(state.selected),map=null,marker=null,reverseTimer=null,lastNominatimAt=0;
let weatherState={status:'idle',forecast:null,error:null},weatherAbort=null;

function range(){
  const a=state.anchor;
  if(state.view==='year'){const y=a.getUTCMonth()>=6?a.getUTCFullYear():a.getUTCFullYear()-1;return{start:dateUTC(y,6,1),end:dateUTC(y+1,5,30),label:`${y} / ${y+1}`,context:'Jaktår'}}
  if(state.view==='month'){const y=a.getUTCFullYear(),m=a.getUTCMonth();return{start:dateUTC(y,m,1),end:dateUTC(y,m+1,0),label:cap(dml.format(a)),context:'Månad'}}
  if(state.view==='week'){const wd=(a.getUTCDay()+6)%7,start=addDays(a,-wd);return{start,end:addDays(start,6),label:`${ds.format(start)} – ${ds.format(addDays(start,6))}`,context:'Vecka'}}
  return{start:a,end:a,label:cap(df.format(a)),context:'Dag'};
}
function navigationRange(r){
  if(state.view==='year')return{start:dateUTC(r.start.getUTCFullYear()-1,6,1),end:dateUTC(r.end.getUTCFullYear()+1,5,30)};
  if(state.view==='month')return{start:dateUTC(r.start.getUTCFullYear(),r.start.getUTCMonth()-1,1),end:dateUTC(r.end.getUTCFullYear(),r.end.getUTCMonth()+2,0)};
  if(state.view==='week')return{start:addDays(r.start,-7),end:addDays(r.end,7)};
  return{start:addDays(r.start,-1),end:addDays(r.end,1)};
}
function currentClockMinutes(){
  const p=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  return +p.find(x=>x.type==='hour').value*60 + +p.find(x=>x.type==='minute').value;
}
function currentClockLabel(){
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
}
function durationText(minutes){
  minutes=Math.max(0,Math.round(minutes));
  if(minutes<60)return `${minutes} min`;
  if(minutes<1440){const h=Math.floor(minutes/60),m=minutes%60;return m?`${h} h ${m} min`:`${h} h`}
  const d=Math.floor(minutes/1440),h=Math.floor((minutes%1440)/60);return h?`${d} d ${h} h`:`${d} dagar`;
}
function speciesNowStatus(id){
  const today=stockholmToday(),now=currentClockMinutes(),todayState=seasonState(id,today,state.location);
  if(state.view==='week'||state.view==='day'){
    const segs=dailySegments(id,today,state.location);
    const active=segs.find(s=>now>=s.start&&now<s.end);
    if(active)return `${durationText(active.end-now)} kvar idag`;
    const nextToday=segs.find(s=>s.start>now);
    if(nextToday)return `börjar om ${durationText(nextToday.start-now)}`;
    for(let i=1;i<=7;i++){const next=dailySegments(id,addDays(today,i),state.location);if(next.length)return `börjar om ${durationText(i*1440-now+next[0].start)}`}
  }
  if(todayState!=='off'){
    for(let i=1;i<=400;i++)if(seasonState(id,addDays(today,i),state.location)==='off')return i===1?'sista dagen':`${i} dagar kvar`;
  }else{
    for(let i=1;i<=400;i++)if(seasonState(id,addDays(today,i),state.location)!=='off')return i===1?'börjar i morgon':`börjar om ${i} dagar`;
  }
  return'';
}
function renderTop(){
  $('locationButtonLabel').textContent=state.location.name||'Vald plats';
  const geoWarnings=geographyWarnings(state.location);
  const kicker=$('locationKicker');
  if(kicker){kicker.textContent=geoWarnings.length?'Plats · kontrollera område':'Plats';kicker.classList.toggle('warn',geoWarnings.length>0)}
  const sun=sunSummary(stockholmToday(),state.location);
  $('sunriseNow').textContent=sun.polar==='night'?'ingen':sun.polar==='day'?'midnattssol':sun.sunrise;
  $('sunsetNow').textContent=sun.polar==='night'?'polarnatt':sun.polar==='day'?'ingen':sun.sunset;
  $('sunLocation').textContent=`${state.location.name||'vald plats'} · idag`;
  $('speciesCount').textContent=`(${state.selected.size})`;
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
  $('showRelevant').classList.toggle('active',state.displayMode==='relevant');$('showSelected').classList.toggle('active',state.displayMode==='selected');
}
function markers(r){
  const out=[],days=daysBetween(r.start,r.end)+1;
  if(state.view==='year'){
    for(let d=dateUTC(r.start.getUTCFullYear(),r.start.getUTCMonth(),1);d<=r.end;d=addMonths(d,1))out.push({left:daysBetween(r.start,d)/days*100,label:dm.format(d).replace('.','')});
  }else if(state.view==='month'){
    for(let d=new Date(r.start);d<=r.end;d=addDays(d,7))out.push({left:daysBetween(r.start,d)/days*100,label:ds.format(d).replace('.','')});
  }else if(state.view==='week'){
    for(let d=new Date(r.start);d<=r.end;d=addDays(d,1))out.push({left:daysBetween(r.start,d)/days*100,label:`${cap(new Intl.DateTimeFormat('sv-SE',{weekday:'short'}).format(d))} ${d.getUTCDate()}`});
  }else{
    for(let di=0;di<days;di++)for(let h=0;h<24;h+=3){const d=addDays(r.start,di);out.push({left:(di*1440+h*60)/(days*1440)*100,label:h===0?`${ds.format(d)} · 00`:String(h).padStart(2,'0')})}
  }
  return out;
}
function visible(r){let x=SPECIES.filter(s=>speciesRelevant(s.id,state.location,r.start,r.end));if(state.displayMode==='selected')x=x.filter(s=>state.selected.has(s.id));return x}
function seasonSegments(id,r){
  const n=daysBetween(r.start,r.end)+1,out=[];let st=null,from=0;
  for(let i=0;i<n;i++){const x=seasonState(id,addDays(r.start,i),state.location);if(x!==st){if(st&&st!=='off')out.push({start:from,end:i,state:st});st=x;from=i}}
  if(st&&st!=='off')out.push({start:from,end:n,state:st});
  return out.map(x=>({left:x.start/n*100,width:(x.end-x.start)/n*100,state:x.state,startDate:addDays(r.start,x.start),endDate:addDays(r.start,x.end-1)}));
}
function hourlySegments(id,r){
  const days=daysBetween(r.start,r.end)+1,total=days*1440,raw=[];
  for(let i=0;i<days;i++)for(const x of dailySegments(id,addDays(r.start,i),state.location))raw.push({start:i*1440+x.start,end:i*1440+x.end,state:x.state});
  raw.sort((a,b)=>a.start-b.start);const merged=[];for(const x of raw){const p=merged.at(-1);if(p&&p.state===x.state&&p.end===x.start)p.end=x.end;else merged.push({...x})}
  return merged.map(x=>({left:x.start/total*100,width:(x.end-x.start)/total*100,state:x.state,startAbs:x.start,endAbs:x.end}));
}
function activitySegmentsForDay(id,date){
  const profile=activityWindowFor(id);
  if(!profile||seasonState(id,date,state.location)==='off')return [];
  const sun=getSunTimes(date,state.location.lat,state.location.lon);
  const twilight=getCivilTwilightTimes(date,state.location.lat,state.location.lon);
  const rise=stockholmMinutes(sun.sunrise),set=stockholmMinutes(sun.sunset);
  const dawn=stockholmMinutes(twilight.dawn),dusk=stockholmMinutes(twilight.dusk);
  if(rise===null||set===null)return [];
  const round=v=>clamp(roundMinutes(v,15),0,1440);
  let windows=[];
  if(profile.profile==='dawnDusk'){
    if(dawn!==null)windows.push({start:round(dawn),end:round(rise+(profile.morningAfterSunrise||60))});
    if(dusk!==null)windows.push({start:round(set-(profile.eveningBeforeSunset||60)),end:round(dusk)});
  }else if(profile.profile==='night'){
    if(dawn!==null)windows.push({start:0,end:round(dawn)});
    windows.push({start:round(set),end:1440});
  }else if(profile.profile==='afterSunset'){
    const span=(profile.hours||7)*60;
    const eveningStart=round(set),eveningEnd=set+span;
    windows.push({start:eveningStart,end:round(Math.min(1440,eveningEnd))});
    const previous=addDays(date,-1),prevSun=getSunTimes(previous,state.location.lat,state.location.lon),prevSet=stockholmMinutes(prevSun.sunset);
    if(prevSet!==null){
      const carry=prevSet+span-1440;
      if(carry>0)windows.push({start:0,end:round(Math.min(1440,carry))});
    }
  }
  const legal=dailySegments(id,date,state.location).filter(x=>x.state!=='uncertain');
  const clipped=[];
  for(const w of windows)for(const l of legal){
    const start=Math.max(w.start,l.start),end=Math.min(w.end,l.end);
    if(end>start)clipped.push({start,end});
  }
  clipped.sort((a,b)=>a.start-b.start);
  const merged=[];
  for(const x of clipped){
    const p=merged.at(-1);
    if(p&&x.start<=p.end)p.end=Math.max(p.end,x.end);else merged.push({...x});
  }
  return merged;
}
function activityHourlySegments(id,r){
  const days=daysBetween(r.start,r.end)+1,total=days*1440,raw=[];
  for(let i=0;i<days;i++)for(const x of activitySegmentsForDay(id,addDays(r.start,i)))raw.push({start:i*1440+x.start,end:i*1440+x.end});
  return raw.map(x=>({left:x.start/total*100,width:(x.end-x.start)/total*100,startAbs:x.start,endAbs:x.end}));
}
function renderActivitySegments(id,r,current){
  if(state.view!=='week'&&state.view!=='day')return '';
  return activityHourlySegments(id,r).map(x=>{
    const startDay=Math.floor(x.startAbs/1440);
    const endPoint=Math.max(x.startAbs,x.endAbs-1);
    const endDay=Math.floor(endPoint/1440);
    const startDate=addDays(r.start,startDay),endDate=addDays(r.start,endDay);
    const startMinute=x.startAbs%1440,endMinute=x.endAbs%1440||1440;
    const label=`${clock(startMinute)}–${clock(endMinute)}`;
    const periodClass=startMinute<12*60?'morning':'evening';
    const showLabel=state.view==='day'&&startDate>=current.start&&endDate<=current.end;
    return `<span class="activity-segment ${periodClass}" style="left:${x.left}%;width:${x.width}%" title="Gyllene tid ${label} · civil gryning/skymning, avrundat till 15 min">${showLabel?`<b class="activity-time-label ${periodClass}"><i></i>${label}</b>`:''}</span>`;
  }).join('');
}
function activityTextForDay(id,date){
  const segs=activitySegmentsForDay(id,date);
  return segs.map(x=>`${clock(x.start)}–${clock(x.end)}`).join(' · ');
}
function dateFromKey(key){
  const [y,m,d]=String(key).split('-').map(Number);
  return dateUTC(y,m-1,d);
}
function forecastPointsForDate(date){
  const key=`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
  return weatherState.forecast?.points?.filter(p=>localDateKey(p.time)===key)||[];
}
function weatherHourlySegments(id,r){
  const points=weatherState.forecast?.points||[];
  if(!points.length)return [];
  const totalDays=daysBetween(r.start,r.end)+1,total=totalDays*1440,out=[];
  for(let i=0;i<points.length;i++){
    const p=points[i],key=localDateKey(p.time),d=dateFromKey(key);
    if(d<r.start||d>r.end)continue;
    const minute=localMinute(p.time),dayIndex=daysBetween(r.start,d);
    let duration=60;
    const next=points[i+1];
    if(next){
      const delta=(new Date(next.time)-new Date(p.time))/60000;
      if(Number.isFinite(delta)&&delta>0)duration=Math.min(180,delta);
    }
    const score=huntingWeatherScore(id,p.data||{}),grade=weatherGrade(score);
    const legal=dailySegments(id,d,state.location).filter(x=>x.state!=='uncertain');
    for(const l of legal){
      const start=Math.max(minute,l.start),end=Math.min(minute+duration,l.end);
      if(end<=start)continue;
      const absStart=dayIndex*1440+start,absEnd=dayIndex*1440+end;
      out.push({left:absStart/total*100,width:(absEnd-absStart)/total*100,grade,score});
    }
  }
  return out;
}
function renderWeatherSegments(id,r){
  if((state.view!=='week'&&state.view!=='day')||weatherState.status!=='ready')return '';
  return weatherHourlySegments(id,r).map(x=>`<span class="weather-segment ${x.grade}" style="left:${x.left}%;width:${x.width}%" title="Jaktväder ${weatherGradeLabel(x.score)}"></span>`).join('');
}
function formatNum(v,digits=0){
  return Number.isFinite(v)?Number(v).toFixed(digits).replace('.',','):'–';
}
function weatherDayLabel(key){
  const d=dateFromKey(key);
  return cap(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',weekday:'short',day:'numeric',month:'short'}).format(d).replace('.',''));
}
function renderWeatherPlanner(){
  const panel=$('weatherPlanner'),status=$('weatherStatus'),daysEl=$('weatherDays');
  if(!panel||!status||!daysEl)return;
  panel.hidden=false;
  if(weatherState.status==='loading'){
    status.textContent='Hämtar prognos från SMHI…';daysEl.innerHTML='';return;
  }
  if(weatherState.status==='error'){
    status.textContent='SMHI-prognosen kunde inte hämtas just nu.';daysEl.innerHTML='';return;
  }
  const points=weatherState.forecast?.points||[];
  if(!points.length){
    status.textContent='Ingen prognos tillgänglig för platsen.';daysEl.innerHTML='';return;
  }
  const grouped=new Map();
  for(const p of points){
    const k=localDateKey(p.time);
    if(!grouped.has(k))grouped.set(k,[]);
    grouped.get(k).push(p);
  }
  const entries=[...grouped.entries()].slice(0,8);
  status.textContent=`SMHI · uppdaterad ${weatherState.forecast.referenceTime?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}).format(new Date(weatherState.forecast.referenceTime)).replace('.',''):'nyligen'}`;
  daysEl.innerHTML=entries.map(([key,pts])=>{
    const s=summarizeForecastDay(pts);
    if(!s)return'';
    return `<button type="button" class="weather-day" data-weather-date="${key}">
      <strong>${esc(weatherDayLabel(key))}</strong>
      <span>${formatNum(s.tempMin)}–${formatNum(s.tempMax)} °C</span>
      <small>Vind ${formatNum(s.windAvg,1)}–${formatNum(s.windMax,1)} m/s · ${formatNum(s.precip,1)} mm</small>
    </button>`;
  }).join('');
  daysEl.querySelectorAll('[data-weather-date]').forEach(b=>b.addEventListener('click',()=>{
    state.anchor=dateFromKey(b.dataset.weatherDate);state.view='day';renderAll();
  }));
}
async function loadWeather(){
  weatherAbort?.abort?.();
  weatherAbort=new AbortController();
  weatherState={status:'loading',forecast:null,error:null};
  renderWeatherPlanner();
  try{
    const forecast=await fetchSmhiForecast(state.location,{signal:weatherAbort.signal});
    weatherState={status:'ready',forecast,error:null};
    renderWeatherPlanner();renderTimeline();
  }catch(err){
    if(err?.name==='AbortError')return;
    weatherState={status:'error',forecast:null,error:err};
    renderWeatherPlanner();renderTimeline();
  }
}
function weatherPeriodsForDay(id,date){
  const pts=forecastPointsForDate(date);
  if(!pts.length)return null;
  const scored=pts.map(p=>({p,score:huntingWeatherScore(id,p.data||{})}));
  const max=Math.max(...scored.map(x=>x.score));
  const threshold=max>=78?78:55;
  const chosen=scored.filter(x=>x.score>=threshold);
  const groups=[];
  for(const x of chosen){
    const start=localMinute(x.p.time),end=Math.min(1440,start+60);
    const prev=groups.at(-1);
    if(prev&&start<=prev.end+15){prev.end=Math.max(prev.end,end);prev.score=Math.max(prev.score,x.score)}
    else groups.push({start,end,score:x.score});
  }
  return {max,groups,summary:summarizeForecastDay(pts)};
}
function weatherDetailHtml(id,date){
  const w=weatherPeriodsForDay(id,date);
  if(!w?.summary)return '';
  const s=w.summary;
  const periods=w.groups.length?w.groups.map(x=>`${clock(x.start)}–${clock(x.end)}`).join(' · '):'Ingen tydlig topp i prognosen';
  return `<section class="weather-detail">
    <div class="advice-heading"><span>SMHI-prognos</span><small>Rådgivande jaktväder</small></div>
    <div class="weather-detail-grid">
      <div><span>Temperatur</span><strong>${formatNum(s.tempMin)}–${formatNum(s.tempMax)} °C</strong></div>
      <div><span>Vind</span><strong>${formatNum(s.windAvg,1)}–${formatNum(s.windMax,1)} m/s</strong></div>
      <div><span>Nederbörd</span><strong>≈ ${formatNum(s.precip,1)} mm</strong></div>
      <div><span>Sämsta sikt</span><strong>${formatNum(s.visibilityMin,1)} km</strong></div>
    </div>
    <p><strong>${weatherGradeLabel(w.max)} väderläge:</strong> ${esc(periods)}</p>
  </section>`;
}
function segmentLabels(seg,nav,current){
  if(state.view==='day'||state.view==='week'){
    const startDay=Math.floor(seg.startAbs/1440),endPoint=Math.max(0,seg.endAbs-1),endDay=Math.floor(endPoint/1440);
    const sd=addDays(nav.start,startDay),ed=addDays(nav.start,endDay);
    const startMinute=seg.startAbs%1440,endMinute=seg.endAbs%1440||1440;
    return{start:sd>=current.start&&sd<=current.end?clock(startMinute):'',end:ed>=current.start&&ed<=current.end?clock(endMinute):''};
  }
  return{start:seg.startDate>=current.start&&seg.startDate<=current.end?de.format(seg.startDate).replace('.',''):'',end:seg.endDate>=current.start&&seg.endDate<=current.end?de.format(seg.endDate).replace('.',''):''};
}
function renderSegment(seg,nav,current){
  const labels=segmentLabels(seg,nav,current);
  return `<span class="segment ${seg.state}" style="left:${seg.left}%;width:${seg.width}%">${labels.start?`<b class="edge-label start">${esc(labels.start)}</b>`:''}${labels.end?`<b class="edge-label end">${esc(labels.end)}</b>`:''}</span>`;
}
function subtitle(id){const x=matchingRules(id,state.anchor,state.location);const base=!x.length?'ingen period för området':x.some(r=>r.kind==='window')?'licensjaktsfönster':x.some(r=>r.daily!=='allDay')?'solstyrd dygnstid':'fast säsongsperiod';const countdown=speciesNowStatus(id);return countdown?`${base} · ${countdown}`:base}
function nowPosition(r){
  const today=stockholmToday();
  if(today<r.start||today>r.end)return null;
  const days=daysBetween(r.start,r.end)+1;
  return (daysBetween(r.start,today)+currentClockMinutes()/1440)/days*100;
}
function todayLabel(){
  const today=stockholmToday();
  const dateLabel=new Intl.DateTimeFormat('sv-SE',{
    timeZone:'Europe/Stockholm',
    day:'numeric',
    month:'short'
  }).format(today).replace('.','');
  const weekday=new Intl.DateTimeFormat('sv-SE',{
    timeZone:'Europe/Stockholm',
    weekday:'short'
  }).format(today).replace('.','');
  if(state.view==='day')return `NU ${currentClockLabel()}`;
  if(state.view==='week')return `IDAG ${weekday.toUpperCase()} ${dateLabel.toUpperCase()} · ${currentClockLabel()}`;
  return `IDAG ${dateLabel.toUpperCase()}`;
}
function nowLine(r){
  const left=nowPosition(r);
  return left===null?'':`<i class="now-line" style="left:${left}%" title="${todayLabel()}"></i>`;
}
function nowScaleMarker(r){
  const left=nowPosition(r);
  return left===null?'':`<i class="now-scale-marker" style="left:${left}%"><span>${todayLabel()}</span></i>`;
}
let suppressScrollNavigation=false,scrollTimer=null;
function alignScroller(nav,current){
  const sc=$('timelineScroller'),t=$('timeline');
  requestAnimationFrame(()=>{
    const labelWidth=parseFloat(getComputedStyle(t).getPropertyValue('--species-col'))||178;
    const trackWidth=Math.max(1,sc.scrollWidth-labelWidth),navDays=daysBetween(nav.start,nav.end)+1,before=daysBetween(nav.start,current.start);
    suppressScrollNavigation=true;sc.scrollLeft=trackWidth*(before/navDays);
    setTimeout(()=>{suppressScrollNavigation=false},140);
  });
}
function renderTimeline(){
  const current=range(),nav=navigationRange(current);$('periodTitle').textContent=current.label;$('periodContext').textContent=current.context;const t=$('timeline');t.className=`timeline ${state.view}`;t.style.width='300%';
  const sp=visible(current);$('emptyState').hidden=sp.length>0;
  const head=`<div class="timeline-header"><div class="timeline-header-label">Art</div><div class="timeline-scale">${markers(nav).map(m=>`<i class="scale-marker" style="left:${m.left}%"><span>${esc(m.label)}</span></i>`).join('')}${nowScaleMarker(nav)}</div></div>`;
  t.innerHTML=head+sp.map(s=>{const seg=(state.view==='week'||state.view==='day'?hourlySegments:seasonSegments)(s.id,nav);return `<div class="timeline-row"><button type="button" class="species-cell" data-label="${s.id}"><strong>${esc(s.name)}</strong><small>${esc(subtitle(s.id))}</small></button><div class="track" data-track="${s.id}">${seg.map(x=>renderSegment(x,nav,current)).join('')}${renderActivitySegments(s.id,nav,current)}${renderWeatherSegments(s.id,nav)}${nowLine(nav)}</div></div>`}).join('');
  t.querySelectorAll('[data-label]').forEach(x=>x.addEventListener('click',()=>detail(x.dataset.label,state.anchor)));
  t.querySelectorAll('[data-track]').forEach(x=>x.addEventListener('click',e=>{if($('timelineScroller').classList.contains('dragging'))return;const q=clamp((e.clientX-x.getBoundingClientRect().left)/x.getBoundingClientRect().width,0,.99999);detail(x.dataset.track,addDays(nav.start,Math.floor(q*(daysBetween(nav.start,nav.end)+1))))}));
  alignScroller(nav,current);
}
function handleTimelineScroll(){
  if(suppressScrollNavigation)return;
  clearTimeout(scrollTimer);
  scrollTimer=setTimeout(()=>{
    const sc=$('timelineScroller'),t=$('timeline'),current=range(),nav=navigationRange(current);
    const labelWidth=parseFloat(getComputedStyle(t).getPropertyValue('--species-col'))||178;
    const trackWidth=Math.max(1,sc.scrollWidth-labelWidth),visibleTrack=Math.max(1,sc.clientWidth-labelWidth);
    const midpoint=sc.scrollLeft+visibleTrack/2,fraction=clamp(midpoint/trackWidth,0,.99999);
    const d=addDays(nav.start,Math.floor(fraction*(daysBetween(nav.start,nav.end)+1)));
    if(d<current.start)shift(-1);else if(d>current.end)shift(1);
  },220);
}
function detail(id,date){
  const sp=SPECIES.find(x=>x.id===id);if(!sp)return;
  const rules=activeRules(id,date,state.location),sun=sunSummary(date,state.location),segs=dailySegments(id,date,state.location),advice=adviceFor(id),weatherHtml=weatherDetailHtml(id,date);
  $('detailGroup').textContent=GROUPS.find(g=>g.id===sp.group)?.name||'Art';$('detailTitle').textContent=sp.name;
  const times=segs.length?segs.map(x=>`${clock(x.start)}–${clock(x.end)}${x.state==='restricted'?' särskild delperiod':x.state==='window'?' licensjaktsfönster':x.state==='uncertain'?' solförhållande utan normalt upp-/nedgångspar':''}`).join(' · '):'Ingen säsongstid denna dag';
  const adviceHtml=advice?`
    <section class="advice-card">
      <div class="advice-heading"><span>Praktiskt jaktläge</span><small>Råd – inte jaktregel</small></div>
      ${activityTextForDay(id,date)?`<div class="advice-row"><strong>Markerad tid idag</strong><p>${esc(activityTextForDay(id,date))} · avrundat till 15 min</p></div>`:''}
      ${advice.best?`<div class="advice-row"><strong>Ofta bäst</strong><p>${esc(advice.best)}</p></div>`:''}
      ${advice.conditions?`<div class="advice-row"><strong>Gynnsamma förhållanden</strong><p>${esc(advice.conditions)}</p></div>`:''}
      ${advice.method?`<div class="advice-row"><strong>Jaktform</strong><p>${esc(advice.method)}</p></div>`:''}
      ${advice.sources?.length?`<div class="advice-sources"><span>Källor:</span> ${advice.sources.map(([label,url])=>`<a href="${url}" target="_blank" rel="noreferrer">${esc(label)}</a>`).join(' · ')}</div>`:''}
    </section>`:''; 
  const cards=rules.length?rules.map(r=>{const src=sourceFor(r);return `<article class="rule-card"><h3>${esc(r.label||sp.name)}</h3><p><strong>${esc(periodLabel(r))}</strong>${r.kind==='window'?' · fast ramperiod':''}</p><p>${esc(describeDailyRule(r,date,state.location))}</p>${r.restriction?`<span class="rule-pill">${esc(r.restriction)}</span>`:''}${r.note?`<p>${esc(r.note)}</p>`:''}<p><a href="${src.url}" target="_blank" rel="noreferrer">${esc(src.label)}</a></p></article>`}).join(''):nextPeriod(id,date);
  $('detailContent').innerHTML=`<div class="detail-status"><strong>${rules.length?'Säsongsperiod pågår':'Utanför säsongsperiod'}</strong><span>${esc(cap(df.format(date)))} · ${esc(state.location.name)}</span></div><div class="sun-detail"><div><span>Soluppgång</span><strong>${sun.polar==='night'?'Ingen':sun.polar==='day'?'Midnattssol':sun.sunrise}</strong></div><div><span>Solnedgång</span><strong>${sun.polar==='night'?'Polarnatt':sun.polar==='day'?'Ingen':sun.sunset}</strong></div></div><p class="detail-daytime"><strong>Säsongstid denna dag:</strong> ${esc(times)}</p>${weatherHtml}${adviceHtml}${cards}`;
  $('detailDialog').showModal();
}
function nextPeriod(id,date){for(let i=1;i<=370;i++){const d=addDays(date,i),r=activeRules(id,d,state.location);if(r.length)return `<article class="rule-card"><h3>Nästa säsongsperiod</h3><p>${esc(cap(df.format(d)))}</p><p>${esc(r.map(x=>x.label||periodLabel(x)).join(' · '))}</p></article>`}return'<article class="rule-card"><p>Ingen period hittades för vald plats inom kommande året.</p></article>'}
function renderAll(){renderTop();renderWeatherPlanner();renderTimeline()}
function shift(n){if(state.view==='year')state.anchor=dateUTC(state.anchor.getUTCFullYear()+n,state.anchor.getUTCMonth(),1);else if(state.view==='month')state.anchor=addMonths(state.anchor,n);else state.anchor=addDays(state.anchor,n*(state.view==='week'?7:1));renderAll()}

function speciesDialog(){selectedDraft=new Set(state.selected);renderSpecies();$('speciesDialog').showModal()}
function renderSpecies(active=null){
  $('groupButtons').innerHTML=GROUPS.map(g=>`<button type="button" data-group="${g.id}" class="${active===g.id?'active':''}">${esc(g.name)}</button>`).join('');
  $('groupButtons').querySelectorAll('[data-group]').forEach(b=>b.addEventListener('click',()=>{const ids=SPECIES.filter(s=>s.group===b.dataset.group).map(s=>s.id),all=ids.every(id=>selectedDraft.has(id));ids.forEach(id=>all?selectedDraft.delete(id):selectedDraft.add(id));renderSpecies(b.dataset.group)}));
  const r=range();$('speciesChecklist').innerHTML=SPECIES.map(s=>`<label class="species-option"><input type="checkbox" value="${s.id}" ${selectedDraft.has(s.id)?'checked':''}><span>${esc(s.name)}</span><small>${speciesRelevant(s.id,state.location,r.start,r.end)?'för området':'ingen period här'}</small></label>`).join('');
  $('speciesChecklist').querySelectorAll('input').forEach(i=>i.addEventListener('change',()=>i.checked?selectedDraft.add(i.value):selectedDraft.delete(i.value)));
}
function locationDialog(){locationDraft=structuredClone(state.location);updateLocation();$('locationDialog').showModal();setTimeout(mapInit,80)}
function updateLocation(){$('chosenPlaceName').textContent=locationDraft.name||'Vald punkt';$('chosenPlaceMeta').textContent=[locationDraft.county,locationDraft.municipality].filter(Boolean).join(' · ')||'Administrativt område inte hämtat';$('chosenCoords').textContent=`${(+locationDraft.lat).toFixed(5)}, ${(+locationDraft.lon).toFixed(5)}`;specialControls()}
function specialControls(){
  const c=normGeoText(locationDraft.county),m=normGeoText(locationDraft.municipality),s=locationDraft.special||{};
  const warnings=geographyWarnings(locationDraft,selectedDraft);
  let h=warnings.length?`<div class="geo-warning"><strong>Geografi behöver bekräftas</strong>${warnings.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:'';

  if(c.includes('norrbotten')||c.includes('vasterbotten')){
    const v=s.aboveLappmark?'above':s.belowLappmark?'below':'unknown';
    h+=`<label class="check-row"><span>Lappmarksgränsen</span><select id="lappmarkSelect"><option value="unknown" ${v==='unknown'?'selected':''}>Inte angivet</option><option value="below" ${v==='below'?'selected':''}>Nedanför lappmarksgränsen</option><option value="above" ${v==='above'?'selected':''}>Ovanför lappmarksgränsen</option></select></label>`;
  }

  if(c.includes('norrbotten')&&['kiruna','pajala','overtornea','haparanda'].some(x=>m.includes(x))){
    const v=triState(s.borderRiver);
    h+=`<label class="check-row"><span>Gränsälvsområdet</span><select id="borderRiverSelect"><option value="unknown" ${v==='unknown'?'selected':''}>Inte angivet</option><option value="no" ${v==='no'?'selected':''}>Nej</option><option value="yes" ${v==='yes'?'selected':''}>Ja, inom 200 m från Torne/Muonio/Könkämä älv</option></select></label>`;
  }

  if(c.includes('norrbotten')&&['kiruna','gallivare','jokkmokk','arjeplog','arvidsjaur'].some(x=>m.includes(x))){
    const v=triState(s.westOdlingsgransNorrbotten);
    h+=`<label class="check-row"><span>Odlingsgränsen</span><select id="westCultivationSelect"><option value="unknown" ${v==='unknown'?'selected':''}>Inte angivet</option><option value="no" ${v==='no'?'selected':''}>Öster om / inte väster om odlingsgränsen</option><option value="yes" ${v==='yes'?'selected':''}>Väster om odlingsgränsen</option></select></label>`;
  }

  if(c.includes('dalarna')&&m.includes('mora')){
    const v=triState(s.northMora);
    h+=`<label class="check-row"><span>Mora</span><select id="northMoraSelect"><option value="unknown" ${v==='unknown'?'selected':''}>Inte angivet</option><option value="no" ${v==='no'?'selected':''}>Inte norra delen enligt bilaga 2</option><option value="yes" ${v==='yes'?'selected':''}>Norra delen enligt bilaga 2</option></select></label>`;
  }

  if(c.includes('skane')){
    const v=triState(s.skaneKronhjortArea);
    h+=`<label class="check-row"><span>Kronhjortsområde i Skåne</span><select id="skaneKronSelect"><option value="unknown" ${v==='unknown'?'selected':''}>Inte angivet</option><option value="no" ${v==='no'?'selected':''}>Utanför</option><option value="yes" ${v==='yes'?'selected':''}>Inom kronhjortsområde</option></select></label>`;
  }else{
    const v=triState(s.kronhjortManagement);
    h+=`<label class="check-row"><span>Kronhjortsskötselområde</span><select id="kronManagementSelect"><option value="unknown" ${v==='unknown'?'selected':''}>Inte angivet</option><option value="no" ${v==='no'?'selected':''}>Utanför</option><option value="yes" ${v==='yes'?'selected':''}>Inom skötselområde</option></select></label>`;
  }

  $('specialAreaControls').innerHTML=h||'<p class="field-help">Inga särskilda geografiska val behövs för den här platsen.</p>';

  $('lappmarkSelect')?.addEventListener('change',e=>{
    const next={...(locationDraft.special||{})};
    if(e.target.value==='unknown'){delete next.aboveLappmark;delete next.belowLappmark}
    else{next.aboveLappmark=e.target.value==='above';next.belowLappmark=e.target.value==='below'}
    locationDraft.special=next;specialControls();
  });
  for(const [id,key] of [
    ['borderRiverSelect','borderRiver'],
    ['westCultivationSelect','westOdlingsgransNorrbotten'],
    ['northMoraSelect','northMora'],
    ['skaneKronSelect','skaneKronhjortArea'],
    ['kronManagementSelect','kronhjortManagement']
  ]) $(id)?.addEventListener('change',e=>{locationDraft.special=setTriState(locationDraft.special,key,e.target.value);specialControls()});
}
function mapInit(){
  if(!window.maplibregl){$('map').textContent='Kartan kunde inte laddas.';return}
  if(!map){map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[locationDraft.lon,locationDraft.lat],zoom:8});map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');marker=new maplibregl.Marker({draggable:true,color:'#2c4035'}).setLngLat([locationDraft.lon,locationDraft.lat]).addTo(map);marker.on('dragend',()=>coords(marker.getLngLat().lat,marker.getLngLat().lng,true));map.on('click',e=>{marker.setLngLat(e.lngLat);coords(e.lngLat.lat,e.lngLat.lng,true)})}
  else{map.resize();map.jumpTo({center:[locationDraft.lon,locationDraft.lat]});marker.setLngLat([locationDraft.lon,locationDraft.lat])}
}
async function nom(url){const wait=Math.max(0,1100-(Date.now()-lastNominatimAt));if(wait)await new Promise(r=>setTimeout(r,wait));lastNominatimAt=Date.now();const x=await fetch(url,{headers:{Accept:'application/json'}});if(!x.ok)throw Error(x.status);return x.json()}
const placeName=x=>{const a=x.address||{};return a.city||a.town||a.village||a.hamlet||a.municipality||x.name||String(x.display_name||'Vald plats').split(',')[0]};
async function search(){const q=$('placeSearch').value.trim();if(q.length<2)return;$('searchStatus').textContent='Söker…';$('searchResults').innerHTML='';try{const data=await nom(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=se&limit=8&addressdetails=1&accept-language=sv&q=${encodeURIComponent(q)}`);$('searchStatus').textContent=data.length?`${data.length} träffar`:'Ingen träff';$('searchResults').innerHTML=data.map((x,i)=>`<button type="button" class="search-result" data-result="${i}"><strong>${esc(placeName(x))}</strong><small>${esc([x.address?.state,x.address?.municipality||x.address?.county].filter(Boolean).join(' · '))}</small></button>`).join('');$('searchResults').querySelectorAll('[data-result]').forEach(b=>b.addEventListener('click',()=>applyPlace(data[+b.dataset.result])))}catch{$('searchStatus').textContent='Sökningen kunde inte nå karttjänsten.'}}
function applyPlace(x){const a=x.address||{};locationDraft=repairSavedLocation({name:placeName(x),lat:+x.lat,lon:+x.lon,county:addressCounty(a),municipality:addressMunicipality(a),special:{}});updateLocation();if(map){map.flyTo({center:[locationDraft.lon,locationDraft.lat],zoom:10});marker.setLngLat([locationDraft.lon,locationDraft.lat])}}
function coords(lat,lon,reverse=false){locationDraft={...locationDraft,lat,lon,name:'Vald punkt'};updateLocation();if(reverse){clearTimeout(reverseTimer);reverseTimer=setTimeout(async()=>{try{const x=await nom(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1&accept-language=sv`),a=x.address||{};const nextCounty=addressCounty(a),nextMunicipality=addressMunicipality(a);
      const areaChanged=normalizeCounty(locationDraft.county||'')!==normalizeCounty(nextCounty||'')||normalizeMunicipality(locationDraft.municipality||'')!==normalizeMunicipality(nextMunicipality||'');
      locationDraft=repairSavedLocation({...locationDraft,name:placeName(x),county:nextCounty,municipality:nextMunicipality,special:areaChanged?{}:(locationDraft.special||{})});updateLocation()}catch{}},500)}}
function geolocate(){if(!navigator.geolocation){$('searchStatus').textContent='Webbläsaren har inte platsstöd.';return}$('searchStatus').textContent='Hämtar din position…';navigator.geolocation.getCurrentPosition(p=>{const{latitude:lat,longitude:lon}=p.coords;$('searchStatus').textContent='';marker?.setLngLat([lon,lat]);map?.flyTo({center:[lon,lat],zoom:11});coords(lat,lon,true)},()=>$('searchStatus').textContent='Kunde inte läsa positionen.',{timeout:10000})}

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;renderAll()}));
$('prevPeriod').addEventListener('click',()=>shift(-1));$('nextPeriod').addEventListener('click',()=>shift(1));$('todayButton').addEventListener('click',()=>{state.anchor=stockholmToday();renderAll()});
$('speciesButton').addEventListener('click',speciesDialog);$('locationButton').addEventListener('click',locationDialog);$('sourcesButton').addEventListener('click',()=>$('sourcesDialog').showModal());
$('showRelevant').addEventListener('click',()=>{state.displayMode='relevant';renderAll()});$('showSelected').addEventListener('click',()=>{state.displayMode='selected';renderAll()});
$('searchPlaceButton').addEventListener('click',search);$('placeSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search()}});$('myLocationButton').addEventListener('click',geolocate);
$('selectAllRelevant').addEventListener('click',()=>{const r=range();SPECIES.filter(s=>speciesRelevant(s.id,state.location,r.start,r.end)).forEach(s=>selectedDraft.add(s.id));renderSpecies()});$('clearSpecies').addEventListener('click',()=>{selectedDraft.clear();renderSpecies()});
$('saveSpeciesButton').addEventListener('click',e=>{e.preventDefault();state.selected=new Set(selectedDraft);localStorage.setItem('jaktkalender.species',JSON.stringify([...state.selected]));state.displayMode='selected';$('speciesDialog').close();renderAll()});
$('saveLocationButton').addEventListener('click',e=>{e.preventDefault();state.location=repairSavedLocation(structuredClone(locationDraft));localStorage.setItem('jaktkalender.location',JSON.stringify(state.location));$('locationDialog').close();renderAll();loadWeather()});
document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.closeDialog)?.close()));

const scroller=$('timelineScroller');
scroller.addEventListener('scroll',handleTimelineScroll,{passive:true});
scroller.addEventListener('wheel',e=>{
  e.preventDefault();
  const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
  scroller.scrollLeft+=delta;
},{passive:false});
let dragStartX=0,dragStartScroll=0,dragMoved=false;
scroller.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(e.target.closest('button, a, input, select, label, summary'))return;
  if(!e.target.closest('.track, .timeline-scale'))return;
  dragStartX=e.clientX;dragStartScroll=scroller.scrollLeft;dragMoved=false;
  scroller.setPointerCapture?.(e.pointerId);scroller.classList.add('grabbing');
});
scroller.addEventListener('pointermove',e=>{
  if(!scroller.classList.contains('grabbing'))return;
  const dx=e.clientX-dragStartX;if(Math.abs(dx)>8)dragMoved=true;
  if(dragMoved){scroller.classList.add('dragging');scroller.scrollLeft=dragStartScroll-dx}
});
const endDrag=e=>{
  if(!scroller.classList.contains('grabbing'))return;
  scroller.classList.remove('grabbing');setTimeout(()=>scroller.classList.remove('dragging'),70);
  scroller.releasePointerCapture?.(e.pointerId);
};
scroller.addEventListener('pointerup',endDrag);scroller.addEventListener('pointercancel',endDrag);
renderAll();
loadWeather();
setInterval(()=>{
  renderTop();
  renderTimeline();
},60000);

