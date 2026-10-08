'use strict';
let material = {equipment:[], sights:[]};
try { Object.assign(material, JSON.parse(localStorage.getItem('schuss-material')||'{}')); } catch {}
const storeMaterial=()=>localStorage.setItem('schuss-material',JSON.stringify(material));
const field=(name,value,change,type='text')=>el('label',{},name,el('input',{type,value:value??'',step:type==='number'?'any':null,oninput:e=>change(type==='number'?Number(e.target.value):e.target.value)}));
function choice(label,value,options,change){const s=el('select',{'aria-label':label,onchange:e=>change(e.target.value)},options.map(([v,t])=>el('option',{value:v},t)));s.value=String(value??'');return el('label',{},label,s);}
const check=(label,value,change)=>{const i=el('input',{type:'checkbox',onchange:e=>change(e.target.checked)});i.checked=!!value;return el('label',{class:'check'},i,label)};
const uid=()=>crypto.randomUUID();
function extraNew(box){
  N.shaftMm=N.shaftMm||4.4;
  box.prepend(el('div',{class:'box'},el('h3',{},'Rundenvorlagen'),el('div',{class:'g'},
    el('button',{class:'s',onclick:()=>{Object.assign(N,{place:'Halle',dist:18,face:40,R:2,P:10,A:3,lay:'single'});render()}},'Halle · 60 Pfeile / 18 m'),
    el('button',{class:'s',onclick:()=>{Object.assign(N,{place:'Freiluft',bow:'Recurve',dist:70,face:122,R:2,P:6,A:6,lay:'single'});render()}},'Recurve · 72 Pfeile / 70 m')),
    el('small',{},'Vorlagen für Zielscheibenrunden. Ausschreibung, Altersklasse und Sonderfälle entscheidet der Veranstalter.')));
  const b=el('div',{class:'box'},el('h3',{},'Pfeile & Material'),
    check('Pfeile einzeln verfolgen',N.tracking,v=>{N.tracking=v;render()}),
    field('Pfeilnummern (durch Komma trennen)',N.arrowLabels||'1,2,3,4,5,6',v=>N.arrowLabels=v),
    field('Schaftdurchmesser (mm)',N.shaftMm,v=>N.shaftMm=Math.max(1,Math.min(12,v)),'number'),
    choice('Equipment',N.equipmentId||'',[['','Ohne Zuordnung'],...material.equipment.map(e=>[e.id,e.name])],v=>{N.equipmentId=v;render()}),
    field('Pfeilset (Name)',N.arrowSet||'',v=>N.arrowSet=v),
    field('Schütze / Schützin',N.archer,v=>N.archer=v),field('Verein',N.club,v=>N.club=v),
    field('Wettkampf / Klasse',N.competition,v=>N.competition=v),field('Startnummer / Scheibe',N.targetNo,v=>N.targetNo=v),
    field('Trainingsnotizen',N.notes,v=>N.notes=v),field('Timer je Passe (Sekunden)',N.timerSeconds||240,v=>N.timerSeconds=Math.max(10,Math.min(600,v)),'number'));
  if(N.place==='Freiluft')b.append(check('Wetter beim Start per Standort abrufen',N.autoWeather,v=>N.autoWeather=v),el('small',{},'Der Browser fragt nach Standortzugriff. Koordinaten werden zum Wetterabruf an Open-Meteo übermittelt.'));
  box.insertBefore(b,box.lastElementChild);
}
function arrowIds(u){return [...new Set((u.arrowLabels||'1,2,3,4,5,6').split(',').map(s=>s.trim()).filter(Boolean))];}
function nextArrow(u){if(!u.tracking)return '';const used=(u.p[S.p]||[]).map(s=>s.arrowId);return arrowIds(u).find(n=>!used.includes(n))||'';}
function arrowEditor(u,box){if(!u.tracking)return;const b=el('details',{class:'box np'},el('summary',{},'Pfeilnummern · Passe '+(S.p+1)));b.open=true;
  (u.p[S.p]||[]).forEach((s,i)=>b.append(choice('Treffer '+(i+1)+' · '+keyOf(s),s.arrowId||'',[['','Nicht zugeordnet'],...arrowIds(u).map(n=>[n,n])],async v=>{
    if(v&&(u.p[S.p]||[]).some(t=>t!==s&&t.arrowId===v)){alert('Diese Nummer ist in der Passe bereits vergeben.');render();return;}s.arrowId=v;await save(u);render();
  })));box.prepend(b);
}
function groupPanel(u,sh){const g=AppCore.group(sh,u.face);return el('div',{class:'box'},el('h3',{},'Gruppierung'),
  el('p',{},g.diameter==null?'Mindestens zwei Trefferpositionen erforderlich.':'Gruppierungsdurchmesser: '+nf(g.diameter,2)+' cm'),
  el('small',{},'Größter Abstand zwischen zwei Treffermitten; unabhängig von der Lage zur Scheibenmitte. '+g.n+' von '+sh.length+' Pfeilen mit Position.'),
  g.n?el('p',{},'Gruppenmitte: '+nf(g.cx,2)+' cm rechts / '+nf(-g.cy,2)+' cm oben (negative Werte: links / unten).'):null,
  el('details',{},el('summary',{},'Gruppierungsdurchmesser je Passe'),(u.p||[]).map((p,i)=>{const a=AppCore.group(p,u.face);return el('p',{},'Passe '+(i+1)+': '+(a.diameter==null?'–':nf(a.diameter,2)+' cm')+' ('+a.n+' Positionen)')})));
}
function arrowAnalysis(units){const groups=new Map();
  for(const u of units)for(const s of shots(u)){if(!s.arrowId)continue;const key=[u.arrowSet||u.equipment?.arrowSet||'Ohne Set',u.place,u.dist,u.face,u.bow,s.arrowId].join(' · ');const a=groups.get(key)||{u,sh:[]};a.sh.push(s);groups.set(key,a);}
  return el('div',{class:'box'},el('h3',{},'Pfeile über mehrere Passen'),el('small',{},'Vergleich getrennt nach Pfeilset, Ort, Distanz, Auflage und Bogenklasse. Auffällige Werte sind ein Hinweis zur Prüfung des Pfeils.'),
    groups.size?[...groups].map(([key,{u,sh}])=>{const g=AppCore.group(sh,u.face);return el('div',{class:'it'},el('div',{},key,el('small',{},sh.length+' Treffer · Ø '+nf(sum(sh)/sh.length,2)+' · Streuung '+(g.diameter==null?'–':nf(g.diameter,2)+' cm')),g.n?el('small',{},'Mitte: '+nf(g.cx,1)+' cm rechts / '+nf(-g.cy,1)+' cm oben'):null))}):el('p',{},'Noch keine nummerierten Pfeile.'));
}
let trendFilter={place:'Freiluft',dist:'',bow:'',face:'',from:'',to:'',period:'month'};
function trendsView(box){const f=trendFilter,b=el('div',{class:'box'},el('h3',{},'Wochen & Monate'));
  const select=(k,l,opts)=>choice(l,f[k],opts,v=>{f[k]=v;render()});
  b.append(select('place','Saison',[['Freiluft','Freiluft'],['Halle','Halle']]),select('period','Zeitraum',[['week','Wochen (ab Montag)'],['month','Monate']]),
    select('dist','Distanz',[['','Alle'],...[...new Set(S.units.map(u=>u.dist))].sort((a,b)=>a-b).map(v=>[v,v+' m'])]),
    select('bow','Bogen',[['','Alle'],['Recurve','Recurve'],['Compound','Compound'],['Blank','Blank']]),
    select('face','Auflage',[['','Alle'],...[40,60,80,122].map(v=>[v,v+' cm'])]),
    field('Von',f.from,v=>{f.from=v;render()},'date'),field('Bis',f.to,v=>{f.to=v;render()},'date'));
  const units=S.units.filter(u=>u.place===f.place&&(!f.dist||u.dist==f.dist)&&(!f.bow||u.bow===f.bow)&&(!f.face||u.face==f.face)&&(!f.from||u.date>=f.from)&&(!f.to||u.date<=f.to));
  const data=AppCore.trends(units,f.period),gold=data.filter(d=>d.goldRate!=null);
  b.append(el('h3',{},'Schnitt pro Pfeil'),lineX(data.map(d=>d.average),data.map(d=>d.key)),el('h3',{},'Gold-Quote (9–10) in %'),lineX(gold.map(d=>d.goldRate),gold.map(d=>d.key)),
    el('small',{},'Gold-Quote nur aus einzeln erfassten Pfeilen. Summen fließen nur in den Schnitt ein.'),
    ...(data.length?data.map(d=>el('p',{},d.key+': '+d.n+' Pfeile · Ø '+nf(d.average,2)+' · Gold '+(d.goldRate==null?'–':nf(d.goldRate,1)+' %'))):[el('p',{},'Keine Daten für diesen Filter.')]));
  box.append(b,arrowAnalysis(units));
}
function materialView(box){
  const b=el('div',{class:'box'},el('h3',{},'Equipment'),el('button',{class:'s',onclick:()=>{material.equipment.push({id:uid(),name:'Neues Setup'});storeMaterial();render()}},'Setup hinzufügen'));
  material.equipment.forEach(e=>{const d=el('details',{},el('summary',{},e.name));
    [['name','Name'],['string','Sehne'],['drawWeight','Zuggewicht (lbs)'],['stabilizers','Stabilisatoren'],['arrowSet','Pfeilset'],['arrows','Pfeilkonfiguration (Spine, Länge, Spitze)']].forEach(([k,l])=>d.append(field(l,e[k],v=>{e[k]=v;storeMaterial()})));
    d.append(el('button',{class:'s',onclick:()=>{if(confirm('Setup löschen? Gespeicherte Einheiten behalten ihre Materialdaten.')){material.equipment=material.equipment.filter(x=>x!==e);storeMaterial();render()}}},'Setup löschen'));b.append(d)});
  const s=el('div',{class:'box'},el('h3',{},'Visierbuch'),el('button',{class:'s',onclick:()=>{material.sights.push({id:uid(),distance:18,arrowSet:'',mark:'',date:today()});storeMaterial();render()}},'Visiereinstellung hinzufügen'));
  [...material.sights].sort((a,b)=>a.distance-b.distance||a.arrowSet.localeCompare(b.arrowSet)).forEach(e=>{const d=el('details',{},el('summary',{},e.distance+' m · '+(e.arrowSet||'Pfeilset fehlt')+' · '+e.mark));
    [['distance','Distanz (m)','number'],['arrowSet','Pfeilset','text'],['mark','Visiereinstellung','text'],['date','Datum','date'],['notes','Notiz','text']].forEach(([k,l,t])=>d.append(field(l,e[k],v=>{e[k]=v;storeMaterial()},t)));
    d.append(el('button',{class:'s',onclick:()=>{if(confirm('Visiereinstellung löschen?')){material.sights=material.sights.filter(x=>x!==e);storeMaterial();render()}}},'Löschen'));s.append(d)});box.append(b,s);
}
async function fetchWeather(u){
  if(u.place!=='Freiluft'||u.date!==today())return;
  try {
    if(!navigator.geolocation)throw Error('Standort wird nicht unterstützt.');
    const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:12000,maximumAge:300000}));
    const url=new URL('https://api.open-meteo.com/v1/forecast');
    url.search=new URLSearchParams({latitude:p.coords.latitude.toFixed(3),longitude:p.coords.longitude.toFixed(3),current:'temperature_2m,wind_speed_10m,wind_direction_10m',timezone:'auto'});
    const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Wetterdienst antwortet nicht.');
    const j=await r.json(),c=j.current;if(!c||!['temperature_2m','wind_speed_10m','wind_direction_10m'].every(k=>Number.isFinite(c[k])))throw Error('Wetterdaten unvollständig.');
    u.weather={temperature:c.temperature_2m,speed:c.wind_speed_10m,direction:c.wind_direction_10m,time:c.time,timezone:j.timezone,source:'Open-Meteo'};u.temp=c.temperature_2m;delete u.weatherError;
  }catch(e){u.weatherError='Wetter nicht abrufbar: '+(e.message||'Standortzugriff abgelehnt.');}
  await save(u);if(S.u===u)render();
}
function unitDetails(u,box){const b=el('details',{class:'box np'},el('summary',{},'Material, Wetter & Tagebuch'));b.append(field('Notizen',u.notes,async v=>{u.notes=v;await save(u)}),field('Schütze / Schützin',u.archer,async v=>{u.archer=v;await save(u)}),field('Verein',u.club,async v=>{u.club=v;await save(u)}),field('Wettkampf / Klasse',u.competition,async v=>{u.competition=v;await save(u)}),field('Startnummer / Scheibe',u.targetNo,async v=>{u.targetNo=v;await save(u)}));
  b.append(el('p',{},u.equipment?Object.entries(u.equipment).filter(([k])=>k!=='id').map(([k,v])=>v).filter(Boolean).join(' · '):'Kein Equipment zugeordnet.'),el('p',{},'Pfeilset: '+(u.arrowSet||'–')));
  if(u.weather)b.append(el('p',{},`${u.weather.temperature} °C · ${u.weather.speed} km/h · Wind aus ${u.weather.direction}° · ${u.weather.time} ${u.weather.timezone||''}`),el('a',{href:'https://open-meteo.com/',target:'_blank',rel:'noopener'},'Wetterdaten: Open-Meteo'));
  if(u.weatherError)b.append(el('p',{},u.weatherError));
  if(u.place==='Freiluft'&&u.date===today())b.append(el('button',{class:'s',onclick:()=>fetchWeather(u)},'Wetter per Standort aktualisieren'));
  box.append(b,groupPanel(u,shots(u)),arrowAnalysis([u]));
}
function photoAssignments(u,ph){const b=el('details',{class:'box'},el('summary',{},'Treffer prüfen und Passen zuordnen'));b.open=true;
  b.append(el('button',{class:'s',onclick:()=>{ph.cand.forEach(d=>d.end='skip');render()}},'Alle auf nicht übernehmen setzen'),el('p',{},'Nur eigene, neu geschossene Pfeile übernehmen. Ein Foto kann mehrere Passen oder fremde Pfeile zeigen. Nummern sind keine automatische Pfeilidentifikation.'));
  ph.cand.forEach((d,i)=>{const r=el('div',{class:'photo-assignment'},el('b',{},'Treffer '+(i+1)+' · '+keyOf(d)),choice('Zuordnung',d.end??'',[['','Bitte wählen'],['skip','Nicht übernehmen'],...Array.from({length:u.R*u.P},(_,p)=>[p,'Passe '+(p+1)])],v=>d.end=v));
    if(u.tracking)r.append(choice('Pfeilnummer',d.arrowId||'',[['','Unbekannt'],...arrowIds(u).map(n=>[n,n])],v=>d.arrowId=v));b.append(r)});return b;
}
function printSheet(u){
  const old=document.getElementById('print-sheet');if(old)old.remove();
  const out=el('article',{id:'print-sheet'},el('h1',{},'Schusszettel'),el('p',{},[u.competition||u.title,fmt(u.date),u.loc].filter(Boolean).join(' · ')),el('p',{},'Name: '+(u.archer||'________________')+' · Verein: '+(u.club||'________________')),el('p',{},`${u.bow} · ${u.place} · ${u.dist} m · ${u.face} cm · Startnr./Scheibe: ${u.targetNo||'________'}`));
  let total=0;
  for(let round=0;round<u.R;round++){
    const columns=Math.min(u.A,6),table=el('table'),head=['Passe',...Array.from({length:columns},(_,i)=>String(i+1)),'Summe','Gesamt',u.place==='Halle'?'10':'10+X',u.place==='Halle'?'9':'X'];
    table.append(el('thead',{},el('tr',{},head.map(h=>el('th',{},h)))));const body=el('tbody');
    for(let p=round*u.P;p<(round+1)*u.P;p++){
      const sh=[...(u.p[p]||[])].sort((a,b)=>b.v-a.v||b.x-a.x),val=u.mode<=2?(sh.length?sum(sh):null):u.mode===3?(u.sums[p]??null):null;
      if(val!==null&&val!=='')total+=Number(val);
      for(let offset=0;offset<u.A;offset+=columns){const last=offset+columns>=u.A;
        body.append(el('tr',{},el('td',{},String(p%u.P+1)+(u.A>6?' ['+(offset+1)+'–'+Math.min(offset+columns,u.A)+']':'')),Array.from({length:columns},(_,i)=>el('td',{},sh[offset+i]?keyOf(sh[offset+i]):'')),el('td',{},last?(val??''):''),el('td',{},last&&val!=null&&val!==''?total:''),el('td',{},last&&sh.length?sh.filter(s=>s.v===10).length:''),el('td',{},last&&sh.length?sh.filter(s=>u.place==='Halle'?s.v===9:s.x).length:'')));
      }
    }
    table.append(body);out.append(el('h2',{},'Durchgang '+(round+1)),table);
    if(u.mode===4)out.append(el('p',{},'Durchgangssumme: '+(u.sums[round]??'________')));
  }
  out.append(el('p',{},'Gesamtergebnis: '+tot(u)+' / '+mx(u)+' · Erfasst: '+done(u)+' / '+u.R*u.P*u.A+' Pfeile'),el('p',{},'Unterschrift Schütze/Schützin: ____________________'),el('p',{},'Unterschrift Schreiber/in: ________________________'));
  if(u.mode>2)out.append(el('p',{},'Nur Summen erfasst; Einzelwerte und Trefferzählungen sind nicht vollständig dokumentiert.'));
  if(u.printAnalysis){const a=el('section',{class:'print-analysis'},el('h2',{},'Trefferbild & Auswertung'),LY(u)==='single'?plot(shots(u)):plotL(u,shots(u)),groupPanel(u,shots(u)),...charts(shots(u),pe(u,0).map(q=>q[1]),pe(u,0).map(q=>q[0]),'Passenverlauf'));out.append(a);}
  const toolbar=el('div',{class:'np print-toolbar'},el('button',{class:'s',onclick:()=>window.print()},'Drucken / als PDF speichern'),el('button',{class:'s',onclick:()=>{out.remove();document.body.classList.remove('print-preview')}},'Zurück zur App'));
  out.prepend(toolbar);document.body.append(out);document.body.classList.add('print-preview');window.scrollTo(0,0);
}

