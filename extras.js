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
function arrowAnalysis(units){const groups=new Map();const comparisons=AppCore.arrowOffsets(units);
  for(const u of units)for(const s of shots(u)){if(!s.arrowId)continue;const key=[u.arrowSet||u.equipment?.arrowSet||'Ohne Set',u.place,u.dist,u.face,u.bow,s.arrowId].join(' · ');const a=groups.get(key)||{u,sh:[]};a.sh.push(s);groups.set(key,a);}
  return el('div',{class:'box'},el('h3',{},'Pfeile über mehrere Passen'),el('small',{},'Vergleich getrennt nach Pfeilset, Ort, Distanz, Auflage und Bogenklasse. Auffällige Werte sind ein Hinweis zur Prüfung des Pfeils.'),
    el('div',{},comparisons.filter(c=>c.leftRight||c.upDown).map(c=>el('div',{class:'warn'},el('b',{},'Pfeil '+c.id+' wiederholt auffällig'),el('p',{},c.label),el('p',{},c.n+' Passen · '+(c.leftRight?nf(Math.abs(c.mx),1)+' cm '+(c.mx<0?'links':'rechts'):'')+(c.leftRight&&c.upDown?' / ':'')+(c.upDown?nf(Math.abs(c.my),1)+' cm '+(c.my<0?'oben':'unten'):'')+' gegenüber den anderen Pfeilen.')))),el('small',{},'Hinweise ab 3 Passen mit jeweils mindestens 2 Vergleichspfeilen: mindestens 1 cm Abweichung, 75 % gleiche Richtung und mehr als 2 Standardfehler. Keine Schadensdiagnose. Ohne Pfeilset nur Vergleich innerhalb einer Einheit.'),groups.size?[...groups].map(([key,{u,sh}])=>{const g=AppCore.group(sh,u.face);return el('div',{class:'it'},el('div',{},key,el('small',{},sh.length+' Treffer · Ø '+nf(sum(sh)/sh.length,2)+' · Streuung '+(g.diameter==null?'–':nf(g.diameter,2)+' cm')),g.n?el('small',{},'Mitte: '+nf(g.cx,1)+' cm rechts / '+nf(-g.cy,1)+' cm oben'):null))}):el('p',{},'Noch keine nummerierten Pfeile.'));
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
  [...material.sights].sort((a,b)=>a.distance-b.distance||String(a.arrowSet||'').localeCompare(String(b.arrowSet||''))).forEach(e=>{const d=el('details',{},el('summary',{},e.distance+' m · '+(e.arrowSet||'Pfeilset fehlt')+' · '+e.mark));
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
  out.append(el('div',{class:'print-footer'},el('p',{},'Gesamtergebnis: '+tot(u)+' / '+mx(u)+' · Erfasst: '+done(u)+' / '+u.R*u.P*u.A+' Pfeile'),el('div',{class:'print-signatures'},el('p',{},'Schütze/Schützin',el('span',{},'Unterschrift')),el('p',{},'Schreiber/in',el('span',{},'Unterschrift')))));
  if(u.mode>2)out.append(el('p',{},'Nur Summen erfasst; Einzelwerte und Trefferzählungen sind nicht vollständig dokumentiert.'));
  if(u.printAnalysis){const a=el('section',{class:'print-analysis'},el('h2',{},'Trefferbild & Auswertung'),LY(u)==='single'?plot(shots(u)):plotL(u,shots(u)),groupPanel(u,shots(u)),...charts(shots(u),pe(u,0).map(q=>q[1]),pe(u,0).map(q=>q[0]),'Passenverlauf'));out.append(a);}
  const toolbar=el('div',{class:'np print-toolbar'},el('button',{class:'s',onclick:()=>window.print()},'Drucken / als PDF speichern'),el('button',{class:'s',onclick:()=>{out.remove();document.body.classList.remove('print-preview')}},'Zurück zur App'));
  out.append(toolbar);document.body.append(out);document.body.classList.add('print-preview');window.scrollTo(0,0);
}

function photoLoupe(ph,W){
  const node=el('div',{class:'photo-loupe',role:'img','aria-label':'Vergrößerter Einstich mit Fadenkreuz'}),canvas=el('canvas',{width:180,height:180}),label=el('div');node.append(canvas,label);
  const ctx=canvas.getContext('2d');
  return {show(d,clientX,clientY){
    if(!node.isConnected)document.body.append(node);
    node.style.left=clientX<innerWidth/2?'auto':'12px';node.style.right=clientX<innerWidth/2?'12px':'auto';
    node.style.top=clientY<260?'auto':'calc(env(safe-area-inset-top) + 12px)';node.style.bottom=clientY<260?'calc(env(safe-area-inset-bottom) + 80px)':'auto';
    const scale=ph.img.width/W,X=(ph.cx+d.px*ph.r)*scale,Y=(ph.cy+d.py*ph.r)*scale,size=180*scale/3;
    ctx.fillStyle='#111';ctx.fillRect(0,0,180,180);ctx.drawImage(ph.img,X-size/2,Y-size/2,size,size,0,0,180,180);
    for(const [color,width] of [['#000',4],['#fff',2]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(70,90);ctx.lineTo(110,90);ctx.moveTo(90,70);ctx.lineTo(90,110);ctx.stroke();}
    label.textContent='3× Lupe · '+keyOf(d);
  },hide(){node.remove()}};
}
function backupPanel(){
  const stamp=Number(localStorage.bk)||0,stale=!stamp||Date.now()-stamp>14*864e5;
  const col=localStorage.bkc==='1';
  const head=el('div',{class:'backup-head'},el('h3',{},'Datensicherung'),el('button',{class:'s backup-toggle','aria-label':col?'Datensicherung aufklappen':'Datensicherung zusammenklappen','aria-expanded':String(!col),onclick:()=>{localStorage.bkc=col?'0':'1';render();}},col?'▾':'▴'));
  if(col)return el('section',{class:'box backup-panel backup-collapsed'+(stale?' backup-due':''),'aria-label':'Datensicherung'},head);
  return el('section',{class:'box backup-panel'+(stale?' backup-due':''),'aria-label':'Datensicherung'},head,
    el('p',{},stamp?'Letzte Sicherungsdatei erstellt: '+new Date(stamp).toLocaleString('de-DE'):'Noch keine Sicherungsdatei erstellt.'),
    el('button',{class:'p',onclick:exp},'Jetzt Daten sichern'),
    el('label',{class:'s backup-load'},'Sicherung wiederherstellen',el('input',{type:'file',accept:'.json,application/json',onchange:async e=>{if(e.target.files[0])await restoreBackup(e.target.files[0]);}})),
    el('small',{},'Enthält Einheiten, Pfeilnummern, Material, Visierbuch und Klicker. Speichere die JSON-Datei in Dateien oder deiner Cloud und lade sie auf dem neuen Handy. Prüfe, dass die Datei tatsächlich gespeichert wurde.'));
}
async function restoreBackup(file){
  try{
    const j=AppCore.validateBackup(JSON.parse(await file.text()));
    if(!confirm(j.units.length+' Einheiten und '+j.clicks.length+' Klickertage importieren? Gleiche Einträge werden ersetzt; andere bleiben erhalten.'))return;
    const merge=(old,items)=>[...new Map([...old,...items].map(e=>[e.id,e])).values()];
    const previous=material,next=j.material?{equipment:merge(material.equipment,j.material.equipment),sights:merge(material.sights,j.material.sights)}:material;
    material=next;try{storeMaterial();const db=await DB;await new Promise((resolve,reject)=>{const t=db.transaction(['u','k'],'readwrite');t.oncomplete=resolve;t.onabort=()=>reject(t.error||Error('Import abgebrochen'));t.onerror=()=>reject(t.error);try{for(const u of j.units)t.objectStore('u').put({...u,p:u.p.map(p=>p||[])});for(const k of j.clicks)t.objectStore('k').put(k);}catch(e){t.abort();reject(e);}});}
    catch(e){material=previous;storeMaterial();throw e;}
    S.units=await all();S.k=Object.fromEntries((await allK()).map(k=>[k.id,k]));S.u=null;S.ph=null;S.v='home';render();alert('Sicherung wiederhergestellt.');
  }catch(e){alert(e.message||'Die Datei konnte nicht importiert werden.');}
}
function photoAssignments(u,ph){
  const selected=ph.cand.filter(d=>d.owned),b=el('div',{class:'box'},el('h3',{},ph.stage==='assign'?'2. Passen zuordnen':'1. Eigene Pfeile auswählen'));
  b.append(el('p',{},selected.length+' eigene Pfeile von '+ph.cand.length+' Vorschlägen ausgewählt.'));
  if(ph.stage!=='assign'){
    b.append(el('p',{},'Tippe deine Pfeile im Foto an oder wähle sie hier. Fremde und bereits erfasste Pfeile nicht markieren.'),el('button',{class:'s',onclick:()=>{ph.cand.forEach(d=>d.owned=false);render()}},'Auswahl aufheben'));
    ph.cand.forEach((d,i)=>b.append(check('Treffer '+(i+1)+' · '+keyOf(d),d.owned,v=>{d.owned=v;render()})));
    b.append(el('button',{class:'p',disabled:!selected.length,onclick:()=>{ph.stage='assign';ph.pan=false;render()}},'Auswahl bestätigen und Passen zuordnen'));return b;
  }
  b.append(el('button',{class:'s',onclick:()=>{ph.stage='select';render()}},'Eigene Pfeile erneut auswählen'));
  ph.cand.forEach((d,i)=>{if(!d.owned)return;const row=el('div',{class:'photo-assignment'},el('b',{},'Treffer '+(i+1)+' · '+keyOf(d)),choice('Passe für Treffer '+(i+1),d.end??'',[['','Bitte wählen'],...Array.from({length:u.R*u.P},(_,p)=>[p,'Passe '+(p+1)+' ('+(u.p[p]||[]).length+'/'+u.A+')'])],v=>d.end=v));
    if(u.tracking)row.append(choice('Pfeilnummer für Treffer '+(i+1),d.arrowId||'',[['','Unbekannt'],...arrowIds(u).map(n=>[n,n])],v=>d.arrowId=v));b.append(row);});return b;
}
