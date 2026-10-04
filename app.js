'use strict';
const $=s=>document.querySelector(s);
const el=(t,p={},...k)=>{const e=document.createElement(t);for(const a in p){const v=p[a];a.startsWith('on')?e.addEventListener(a.slice(2),v):a=='class'?e.className=v:a=='html'?e.innerHTML=v:e.setAttribute(a,v)}k.flat().forEach(c=>c!=null&&e.append(c));return e};
const DB=new Promise(r=>{const q=indexedDB.open('schuss',2);q.onupgradeneeded=()=>{const d=q.result;['u','k'].forEach(n=>d.objectStoreNames.contains(n)||d.createObjectStore(n,{keyPath:'id'}))};q.onsuccess=()=>r(q.result)});
const tx=async(m,f,st='u')=>{const d=await DB;return new Promise(r=>{const t=d.transaction(st,m),q=f(t.objectStore(st));t.oncomplete=()=>r(q.result)})};
const put=u=>tx('readwrite',s=>s.put(u)),all=()=>tx('readonly',s=>s.getAll()),del=id=>tx('readwrite',s=>s.delete(id)),putK=r=>tx('readwrite',s=>s.put(r),'k'),allK=()=>tx('readonly',s=>s.getAll(),'k');
/* WA-Regeln: Ring n endet bei Radius (11-n)/10, X = halber Zehner; Linienberührung = höherer Wert (Pfeilradius 2,2 mm) */
const score=(x,y,u)=>{const e=Math.max(0,Math.hypot(x,y)-2.2/(u.face*5));if(e>1)return{v:0,x:0};let n=Math.max(1,10-Math.floor(e*10+1e-9));const X=n==10&&e<.05;if(n==10&&!X&&u.bow=='Compound'&&u.face==40&&u.place=='Halle')n=9;return{v:n,x:X?1:0}};
const COL={10:'#ffe629',9:'#ffe629',8:'#e8332a',7:'#e8332a',6:'#3fb5cc',5:'#3fb5cc',4:'#111',3:'#111',2:'#fff',1:'#fff',0:'#999'};
const badge=s=>el('span',{class:'b',style:`background:${COL[s.v]};${s.v>=3&&s.v<=4||s.v==7||s.v==8?'color:#fff':''}`},s.x?'X':s.v||'M');
const vib=()=>navigator.vibrate&&navigator.vibrate(12);
const ld=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),today=()=>ld();
const fmt=d=>d.split('-').reverse().join('.');
let S={v:'home',k:{},units:[],u:null,p:0,z:1,f:'all',rf:0,fx:0,fy:0},wl=null,tm=null;
const N={type:'Training',place:'Freiluft',R:1,P:6,A:6,mode:1,face:122,dist:70,bow:'Recurve',date:today(),wx:'',wind:'',temp:20,zone:8};
const shots=u=>(u.p||[]).flat(),sum=a=>a.reduce((s,x)=>s+x.v,0);
const mx=u=>u.R*u.P*u.A*10;
const tot=u=>u.mode>2?(u.sums||[]).reduce((a,b)=>a+(+b||0),0):sum(shots(u));
const done=u=>u.mode==3?(u.sums||[]).filter(x=>x!==''&&x!=null).length*u.A:u.mode==4?(u.sums||[]).filter(x=>x!==''&&x!=null).length*u.P*u.A:shots(u).length;
/* Charts */
function cv(w,h){const c=el('canvas'),r=devicePixelRatio||1;c.width=w*r;c.height=h*r;c.style.width='100%';c.style.maxWidth=w+'px';const x=c.getContext('2d');x.scale(r,r);return[c,x]}
const keyOf=s=>s.x?'X':s.v?String(s.v):'M';
function bars(sh){const[c,x]=cv(340,190),k=['X','10','9','8','7','6','5','4','3','2','1','M'],n={};k.forEach(a=>n[a]=0);sh.forEach(s=>n[keyOf(s)]++);let last=k.findLastIndex(a=>n[a]),ks=k.slice(0,Math.max(last+1,3)),m=Math.max(1,...ks.map(a=>n[a])),w=340/ks.length;
ks.forEach((a,i)=>{const h=n[a]/m*130;x.fillStyle=COL[a=='X'?10:a=='M'?0:a];x.beginPath();x.roundRect(i*w+5,160-h,w-10,h,6);x.fill();x.fillStyle='#e8f1fa';x.textAlign='center';x.font='bold 13px sans-serif';x.fillText(n[a],i*w+w/2,154-h);x.fillText(a,i*w+w/2,180)});return c}
function hbars(sh){const[c,x]=cv(340,190),T=sh.length||1,rs=['X',10,9,8,7,6,5,4,3,2,1].filter(r=>sh.length),rows=[];let seen=0;for(const r of rs){const n=sh.filter(s=>r=='X'?s.x:s.v>=r).length;rows.push([r,n]);if(n>=sh.length)break}
const h=Math.min(26,170/Math.max(rows.length,1));rows.forEach(([r,n],i)=>{x.fillStyle='#e8f1fa';x.font='bold 13px sans-serif';x.textAlign='left';x.fillText(`${r} (${Math.round(n/T*100)}%)`,0,i*h+h*.7);x.fillStyle=COL[r=='X'?10:r];x.beginPath();x.roundRect(80,i*h+3,Math.max(4,n/T*250),h-6,5);x.fill()});return c}
function line(v){const[c,x]=cv(340,170);if(v.length<2){x.fillStyle='#8fb0cf';x.fillText('Zu wenig Daten',10,20);return c}const a=Math.min(...v)-1,b=Math.max(...v)+1,P=i=>[20+i*300/(v.length-1),150-(v[i]-a)/(b-a)*130];x.strokeStyle='#4a90d9';x.lineWidth=3;x.beginPath();v.forEach((y,i)=>x[i?'lineTo':'moveTo'](...P(i)));x.stroke();x.fillStyle='#e8f1fa';x.font='11px sans-serif';x.textAlign='center';v.forEach((y,i)=>{const[px,py]=P(i);x.beginPath();x.arc(px,py,3,0,7);x.fill();if(v.length<16)x.fillText(y,px,py-8)});return c}
function drawT(x,cx,cy,R){[[1,'#fff'],[.8,'#111'],[.6,'#3fb5cc'],[.4,'#e8332a'],[.2,'#ffe629']].forEach(([f,c])=>{x.fillStyle=c;x.beginPath();x.arc(cx,cy,R*f,0,7);x.fill()});x.lineWidth=1;for(let i=1;i<=10;i++){x.strokeStyle=i>=7&&i<9||i>=5&&i<7?'rgba(0,0,0,.45)':i>=3&&i<5?'rgba(255,255,255,.5)':'rgba(0,0,0,.45)';x.beginPath();x.arc(cx,cy,R*i/10,0,7);x.stroke()}x.beginPath();x.arc(cx,cy,R*.05,0,7);x.stroke()}
function plot(sh){const[c,x]=cv(320,320);drawT(x,160,160,156);sh.filter(s=>s.px!=null).forEach(s=>{x.fillStyle='#000';x.strokeStyle='#fff';x.lineWidth=1.5;x.beginPath();x.arc(160+s.px*156,160+s.py*156,4,0,7);x.fill();x.stroke()});return c}
const charts=(sh,ln)=>[el('h3',{},'Verteilung der Pfeile'),bars(sh),el('h3',{},'Trefferquote nach Zonen'),hbars(sh),el('h3',{},'Verlauf'),line(ln)];
/* Zettel */
function cards(u){const t=tot(u),dn=done(u),av=dn?t/dn:0,sh=shots(u),zr=Math.floor(av),z=sh.length&&zr>0?Math.round(100*sh.filter(s=>s.v>=zr).length/sh.length)+'%':'0%';
return el('div',{class:'cards'},[[`${t} / ${mx(u)}`,'Punkte'],[av.toFixed(1),'Erfolgszone'],[z,'in Zone '+zr],[`${Math.round(av*mx(u)/10)} / ${mx(u)}`,'Projektion']].map(([a,b])=>el('div',{class:'card'},el('b',{},a),el('small',{},b))))}
async function save(u){await put(u);S.units=await all()}
function sheet(u){const d=el('div',{class:'box'});
if(u.mode>2){const n=u.mode==3?u.R*u.P:u.R;u.sums=u.sums||[];for(let i=0;i<n;i++)d.append(el('div',{class:'row'},el('i',{},i+1),u.mode==3?'Passe '+(i+1):'Serie '+(i+1),el('input',{type:'number',inputmode:'numeric',value:u.sums[i]??'',max:u.mode==3?u.A*10:u.P*u.A*10,onchange:e=>{u.sums[i]=e.target.value===''?'':Math.min(+e.target.value,+e.target.max);save(u);render()}})));return d}
for(let r=0;r<u.R;r++){let c=0;d.append(el('div',{class:'sep'}));for(let p=r*u.P;p<(r+1)*u.P;p++){const a=u.p[p]||[],s=sum(a);c+=s;d.append(el('div',{class:'row'+(p==S.p&&S.v=='live'?' on':''),onclick:()=>{if(S.v=='live'){S.p=p;render()}}},el('i',{},p%u.P+1),el('span',{class:'bs'},[...a].sort((x,y)=>y.v-x.v||y.x-x.x).map(badge)),el('b',{},a.length?s:''),el('em',{},a.length?c:'')))}}return d}
/* Live */
function gfx(u,box){const W=Math.min(innerWidth-24,460),[c,x]=cv(W,W);let drag=null;const R=()=>W/2*.9*S.z,cx=()=>W/2-S.fx*R(),cy=()=>W/2-S.fy*R(),pas=()=>u.p[S.p]=u.p[S.p]||[];
const draw=()=>{x.clearRect(0,0,W,W);drawT(x,cx(),cy(),R());u.p.forEach((a,i)=>a.forEach(s=>{if(s.px==null)return;const cur=i==S.p;x.globalAlpha=cur?1:.35;x.fillStyle='#000';x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(cx()+s.px*R(),cy()+s.py*R(),cur?6:4,0,7);x.fill();x.stroke();x.globalAlpha=1;if(cur&&drag&&drag.s==s){x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=3;x.font='bold 20px sans-serif';const t=s.x?'X':s.v||'M';x.strokeText(t,cx()+s.px*R()+10,cy()+s.py*R()-10);x.fillText(t,cx()+s.px*R()+10,cy()+s.py*R()-10)}}))};
const pos=e=>{const b=c.getBoundingClientRect();return[(e.clientX-b.left)*W/b.width,(e.clientY-b.top)*W/b.width]};
const mv=(s,q,dy)=>{s.px=(q[0]-cx())/R();s.py=(q[1]+dy-cy())/R();Object.assign(s,score(s.px,s.py,u))};
c.className='tt';c.onpointerdown=e=>{e.preventDefault();c.setPointerCapture(e.pointerId);const q=pos(e),a=pas();let s=a.find(s=>s.px!=null&&Math.hypot(cx()+s.px*R()-q[0],cy()+s.py*R()-q[1])<18);if(s)drag={s,dy:0};else if(a.length<u.A){s={};a.push(s);drag={s,dy:-44,n:1};mv(s,q,-44)}if(drag)draw()};
c.onpointermove=e=>{if(!drag)return;mv(drag.s,pos(e),drag.dy);draw()};
c.onpointerup=async()=>{if(!drag)return;vib();S.fx=S.z>1?drag.s.px:0;S.fy=S.z>1?drag.s.py:0;drag=null;await save(u);render()};
draw();return c}
const KEYS=['X',10,9,8,7,6,5,4,3,2,1,'M'],KC={X:'#e6dc2a',10:'#e6dc2a',9:'#e6dc2a',8:'#c8404a',7:'#c8404a',6:'#2fa9c4',5:'#2fa9c4',4:'#05101c',3:'#05101c',2:'#fff',1:'#fff',M:'#9aa'};
function live(u,box){const t=u.R*u.P,sh=shots(u).length;
if(u.mode<3)box.append(el('button',{class:'s np',style:'width:100%;margin-bottom:8px',onclick:()=>{S.ph=null;go('photo')}},'📷 Foto auswerten'));
box.append(el('div',{class:'bar'},el('span',{},`Gesamt: ${sh} / ${t*u.A}`),el('span',{},`Passe ${S.p+1}/${t}: ${sum(u.p[S.p]||[])} / ${u.A*10}`)));
if(u.mode==1){box.append(gfx(u,box),el('div',{class:'bar',style:'margin-top:8px'},el('button',{class:'s',onclick:()=>{S.z=Math.max(1,S.z-.5);S.fx=S.fy=0;render()}},'Zoom −'),el('span',{},`Zoom: ${Math.round((S.z-1)*100)} %`),el('button',{class:'s',onclick:()=>{S.z=Math.min(4,S.z+.5);render()}},'Zoom +')));}
if(u.mode==2){const a=el('div',{class:'keys'});KEYS.forEach(k=>a.append(el('button',{style:`background:${KC[k]};color:${[4,3,8,7,6,5].includes(k)?'#fff':'#000'}`,onclick:async()=>{const p=u.p[S.p]=u.p[S.p]||[];if(p.length>=u.A)return;p.push({v:k=='X'?10:k=='M'?0:+k,x:k=='X'?1:0});vib();if(p.length>=u.A&&S.p<t-1)S.p++;await save(u);render()}},k)));
a.append(el('button',{style:'background:#e8f1fa;color:#000',onclick:tmr},'⏱'),el('button',{style:'grid-column:span 3;background:#4a8acf;color:#fff',onclick:async()=>{const p=u.p[S.p]||[];if(!p.length&&S.p>0){S.p--;u.p[S.p].pop()}else p.pop();await save(u);render()}},'⌫ Löschen'));box.append(sheet(u),a);$('#app').className='k';return}
if(u.mode==1)box.append(sheet(u));else box.append(sheet(u));
if(u.mode<3)box.append(el('div',{class:'g',style:'margin-top:8px'},el('button',{class:'s',disabled:S.p==0,onclick:()=>{S.p--;S.fx=S.fy=0;render()}},'Zurück'),el('button',{class:'s',onclick:tmr},'⏱'),el('button',{class:'s',onclick:()=>{S.p<t-1?(S.p++,S.fx=S.fy=0,render()):go('sheet')}},S.p<t-1?'Weiter':'Fertig')))}
function tmr(){if(tm){clearInterval(tm);tm=null;render();return}let s=120;tm=setInterval(()=>{s--;$('#hd').textContent=`⏱ ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;if(s==10)navigator.vibrate&&navigator.vibrate([200,100,200]);if(s<=0){clearInterval(tm);tm=null;navigator.vibrate&&navigator.vibrate(600);render()}},1000)}
/* Neue Einheit */
const stp=(k,l,lo=1)=>el('div',{},el('label',{},l),el('div',{class:'st'},el('button',{class:'s',onclick:()=>{N[k]=Math.max(lo,N[k]-1);render()}},'−'),el('b',{},N[k]),el('button',{class:'s',onclick:()=>{N[k]++;render()}},'+')));
const opt=(k,l,o)=>el('div',{},el('label',{},l),el('div',{class:'g'},o.map(([v,t])=>el('button',{class:'s'+(N[k]===v?' on':''),onclick:()=>{N[k]=v;if(k=='place')Object.assign(N,v=='Halle'?{face:40,dist:18,R:2,P:10,A:3}:{face:122,dist:70,R:1,P:6,A:6});render()}},t))));
function neu(box){box.append(el('div',{class:'box'},opt('type','Art',[['Training','Training'],['Wettbewerb','Wettbewerb']]),opt('place','Ort',[['Freiluft','Freiluft'],['Halle','Halle']])),
el('div',{class:'box'},el('h3',{},'Aufbau'),el('div',{class:'bar'},el('span',{},'Max. Punkte'),el('b',{},N.R*N.P*N.A*10)),el('div',{class:'g'},stp('R','Runden'),stp('P','Passen'),stp('A','Pfeile'))),
el('div',{class:'box'},opt('mode','Eingabe',[[1,'Pfeile auf die Auflage ziehen'],[2,'Pfeil für Pfeil'],[3,'Summe je Passe'],[4,'Summe je Serie']]),opt('face','Auflage (Vollauflage)',[[122,'122 cm'],[80,'80 cm'],[40,'40 cm']]),
el('label',{},'Distanz (m)'),el('input',{type:'number',value:N.dist,onchange:e=>N.dist=+e.target.value||N.dist}),opt('bow','Bogenklasse',[['Recurve','Recurve'],['Compound','Compound'],['Blank','Blank']]),el('label',{},'Datum'),el('input',{type:'date',value:N.date,onchange:e=>N.date=e.target.value})),
el('div',{class:'box'},el('h3',{},'Bedingungen (optional)'),opt('wx','Wetter',[['sun','☀️'],['cloud','☁️'],['rain1','🌦'],['rain','🌧']]),opt('wind','Wind',[[0,'0'],[1,'leicht'],[2,'mittel'],[3,'stark']]),el('label',{},`Temperatur: ${N.temp} °C`),el('input',{type:'range',min:-10,max:45,value:N.temp,oninput:e=>{N.temp=+e.target.value;e.target.previousSibling.textContent=`Temperatur: ${N.temp} °C`}})),
el('button',{class:'p',onclick:async()=>{const u={...N,id:Date.now(),title:`${N.type} · ${N.dist} m`,p:[],sums:[]};S.u=u;S.p=0;S.z=1;S.fx=S.fy=0;await save(u);go('live')}},'Einheit erstellen'))}
/* Start */
const dl=(n,t)=>{const b=new Blob([t],{type:'application/json'}),f=new File([b],n,{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f]}).catch(()=>{});else{const a=el('a',{href:URL.createObjectURL(b),download:n});a.click()}};
const exp=()=>{localStorage.bk=Date.now();dl(`schusszettel-${today()}.json`,JSON.stringify({v:1,units:S.units,clicks:Object.values(S.k)}));render()};
function home(box){const bk=+localStorage.bk||0;if((S.units.length||Object.keys(S.k).length)&&Date.now()-bk>14*864e5)box.append(el('div',{class:'warn'},'Letzte Datensicherung vor mehr als 14 Tagen. iOS kann lokale Daten löschen. ',el('button',{class:'s',onclick:exp},'Jetzt sichern')));
box.append(el('div',{class:'g'},[['all','Alle'],['Halle','Halle'],['Freiluft','Freiluft']].map(([v,t])=>el('button',{class:'s'+(S.f==v?' on':''),onclick:()=>{S.f=v;render()}},t))));
const us=S.units.filter(u=>S.f=='all'||u.place==S.f).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id),sh=us.flatMap(shots);
if(!us.length)box.append(el('div',{class:'box'},'Noch keine Einheiten. Tippe auf „Neu“, um zu starten.'));else{box.append(el('div',{class:'box'},el('h3',{},'Trefferbild'),plot(sh),...charts(sh,[...us].reverse().filter(u=>done(u)).map(u=>Math.round(tot(u)/done(u)*10)/10))));
box.append(el('div',{class:'box'},el('h3',{},'Einheiten'),us.map(u=>el('div',{class:'it',onclick:()=>{S.u=u;S.p=0;S.rf=0;go('sheet')}},el('div',{},u.title,el('small',{},`${fmt(u.date)} · ${u.place} · ${u.face} cm`)),el('b',{},`${tot(u)}/${mx(u)}`)))))}
box.append(el('div',{class:'g np'},el('button',{class:'s',onclick:exp},'JSON sichern'),el('label',{class:'s',style:'text-align:center;margin:0;color:var(--t)'},'JSON laden',el('input',{type:'file',accept:'.json',style:'display:none',onchange:async e=>{try{const j=JSON.parse(await e.target.files[0].text());for(const u of j.units||[])await put(u);for(const r of j.clicks||[]){await putK(r);S.k[r.id]=r}S.units=await all();render()}catch{alert('Datei ungültig')}}}))))}
/* Zettel-Ansicht */
function zettel(box){const u=S.u;if(!u)return box.append('Keine Einheit gewählt.');const sh=shots(u),rs=[...Array(u.R)].map((_,r)=>r+1);
box.append(el('div',{class:'bar'},el('span',{},u.title),el('span',{},fmt(u.date))),cards(u),sheet(u));
if(u.mode<3){const f=S.rf?(u.p.slice((S.rf-1)*u.P,S.rf*u.P)).flat():sh;box.append(el('div',{class:'box'},el('h3',{},'Trefferbild'),plot(f),el('div',{class:'g'},[0,...rs].map(r=>el('button',{class:'s'+(S.rf==r?' on':''),onclick:()=>{S.rf=r;render()}},r||'Alle'))),...charts(f,u.p.map(a=>sum(a)))))}
box.append(el('div',{class:'g np'},el('button',{class:'s',onclick:()=>print()},'PDF / Drucken'),el('button',{class:'s',onclick:()=>{S.p=Math.max(0,u.p.findIndex(a=>a.length<u.A));S.p<0&&(S.p=0);go('live')}},'Weiter erfassen'),el('button',{class:'s',onclick:async()=>{if(confirm('Einheit löschen?')){await del(u.id);S.units=await all();S.u=null;go('home')}}},'Löschen')))}
/* Foto-Auswertung (manuell, ohne OpenCV) */
function photo(u,box){if(!u||u.mode>2)return box.append(el('div',{class:'box'},'Foto-Auswertung gibt es nur bei den Modi „Auflage“ und „Pfeil für Pfeil“.'));
const ph=S.ph=S.ph||{step:0,dots:[]},t=u.R*u.P;
if(!ph.img){box.append(el('div',{class:'box'},el('h3',{},'Foto der Scheibe'),el('p',{},'Fotografiere die Scheibe möglichst frontal und füllend.'),el('input',{type:'file',accept:'image/*',onchange:e=>{const f=e.target.files[0];if(!f)return;const i=new Image();i.onload=()=>{ph.img=i;ph.step=1;render()};i.src=URL.createObjectURL(f)}})),el('button',{class:'s',onclick:()=>go('live')},'Zurück'));return}
const W=Math.min(innerWidth-24,460),H=Math.round(W*ph.img.height/ph.img.width),[c,x]=cv(W,H),pas=()=>u.p[S.p]=u.p[S.p]||[];
const draw=()=>{x.drawImage(ph.img,0,0,W,H);x.strokeStyle='#0f0';x.lineWidth=2;if(ph.cx!=null){x.beginPath();x.arc(ph.cx,ph.cy,5,0,7);x.stroke()}if(ph.r){x.beginPath();x.arc(ph.cx,ph.cy,ph.r,0,7);x.stroke();x.globalAlpha=.4;for(let i=1;i<10;i++){x.beginPath();x.arc(ph.cx,ph.cy,ph.r*i/10,0,7);x.stroke()}x.globalAlpha=1}
ph.dots.forEach(d=>{const X=ph.cx+d.px*ph.r,Y=ph.cy+d.py*ph.r;x.fillStyle='#f0f';x.beginPath();x.arc(X,Y,4,0,7);x.fill();x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=3;x.font='bold 16px sans-serif';const l=d.x?'X':d.v||'M';x.strokeText(l,X+6,Y-6);x.fillText(l,X+6,Y-6)})};
c.className='tt';c.onpointerdown=async e=>{const b=c.getBoundingClientRect(),X=(e.clientX-b.left)*W/b.width,Y=(e.clientY-b.top)*W/b.width;
if(ph.step==1){ph.cx=X;ph.cy=Y;ph.step=2;render()}else if(ph.step==2){ph.r=Math.hypot(X-ph.cx,Y-ph.cy);if(ph.r<20)return;ph.step=3;render()}
else{if(pas().length>=u.A){if(S.p<t-1)S.p++;else return}const p=pas(),d={px:(X-ph.cx)/ph.r,py:(Y-ph.cy)/ph.r};Object.assign(d,score(d.px,d.py,u));p.push(d);ph.dots.push(d);vib();await save(u);render()}};
draw();
const msg=['','1/3: Tippe auf die Mitte der Scheibe','2/3: Tippe auf den äußeren Rand (Ring 1)',`3/3: Tippe auf jeden Einschuss · Passe ${S.p+1}: ${(u.p[S.p]||[]).length}/${u.A}`][ph.step];
box.append(el('div',{class:'bar'},msg),c,el('div',{class:'g',style:'margin-top:8px'},el('button',{class:'s',onclick:()=>{ph.cx=ph.r=null;ph.step=1;render()}},'Neu kalibrieren'),el('button',{class:'s',onclick:async()=>{const d=ph.dots.pop();if(d){u.p.forEach(a=>{const i=a.indexOf(d);if(i>=0)a.splice(i,1)});await save(u);render()}}},'Rückgängig'),el('button',{class:'s',onclick:()=>{S.ph=null;go('live')}},'Fertig')))}
/* Klicker: zählt geschossene Pfeile pro Tag und Uhrzeit */
function clk(d){const k=ld(),r=S.k[k]=S.k[k]||{id:k,n:0,h:Array(24).fill(0),l:[]};if(d>0)for(let i=0;i<d;i++){const h=new Date().getHours();r.n++;r.h[h]++;r.l.push(h)}else if(r.n>0){const h=r.l.pop();r.n--;if(h!=null)r.h[h]--}vib();putK(r);render()}
function bar2(v,l,col,ev=1){const[c,x]=cv(340,170),m=Math.max(1,...v),w=340/v.length;v.forEach((n,i)=>{const h=n/m*110;x.fillStyle=col;x.beginPath();x.roundRect(i*w+2,135-h,w-4,h,4);x.fill();x.fillStyle='#e8f1fa';x.font='10px sans-serif';x.textAlign='center';if(n&&w>14)x.fillText(n,i*w+w/2,130-h);if(i%ev==0)x.fillText(l[i],i*w+w/2,155)});return c}
function klick(box){const r=S.k[ld()]||{n:0},days=Object.values(S.k).filter(x=>x.n>0).sort((a,b)=>b.id.localeCompare(a.id)),back=i=>{const d=new Date();d.setDate(d.getDate()-i);return d},cnt=i=>(S.k[ld(back(i))]||{n:0}).n,sumN=n=>[...Array(n)].reduce((a,_,i)=>a+cnt(i),0),all_=days.reduce((a,x)=>a+x.n,0),hrs=Array(24).fill(0);days.forEach(d=>d.h.forEach((n,i)=>hrs[i]+=n));
box.append(el('div',{class:'box',style:'text-align:center'},el('div',{style:'font-size:80px;font-weight:700;line-height:1'},r.n),el('small',{style:'color:var(--m)'},'Pfeile heute'),el('button',{class:'p',style:'height:28vh;margin-top:12px;font-size:60px',onclick:()=>clk(1)},'+1'),el('div',{class:'g',style:'margin-top:8px'},el('button',{class:'s',onclick:()=>clk(-1)},'−1 (zurück)'),[6,10,12,18].map(n=>el('button',{class:'s',onclick:()=>clk(n)},'+'+n))),el('div',{class:'st',style:'margin-top:4px'},el('input',{type:'number',inputmode:'numeric',min:1,max:500,value:localStorage.kc||24,style:'width:90px',oninput:e=>localStorage.kc=e.target.value}),el('button',{class:'s',style:'flex:1;height:44px',onclick:()=>clk(Math.min(500,Math.max(1,parseInt(localStorage.kc)||1)))},'+ eigene Zahl hinzufügen'))),
el('div',{class:'cards'},[[sumN(7),'7 Tage'],[sumN(30),'30 Tage'],[all_,'Gesamt'],[days.length?Math.round(all_/days.length):0,'Ø pro Tag']].map(([a,b])=>el('div',{class:'card'},el('b',{},a),el('small',{},b)))),
el('div',{class:'box'},el('h3',{},'Pfeile pro Tag (14 Tage)'),bar2([...Array(14)].map((_,i)=>cnt(13-i)),[...Array(14)].map((_,i)=>String(back(13-i).getDate())),'#4a90d9'),el('h3',{},'Pfeile nach Uhrzeit'),bar2(hrs,hrs.map((_,i)=>i),'#ffe629',3)),
el('div',{class:'box'},el('h3',{},'Tage'),days.length?days.slice(0,31).map(d=>el('div',{class:'it'},fmt(d.id),el('b',{},d.n))):'Noch keine Pfeile gezählt.'))}
/* Navigation */
const NAV=[['home','🏠','Start'],['new','➕','Neu'],['live','🎯','Live'],['sheet','📋','Zettel'],['klick','🔢','Klicker']];
async function go(v){if(v=='live'&&!S.u)v='new';S.v=v;if((v=='live'||v=='klick')&&'wakeLock'in navigator)try{wl=await navigator.wakeLock.request('screen')}catch{}else if(wl){wl.release();wl=null}render()}
function render(){const a=$('#app');a.className='';a.innerHTML='';if(tm){}$('#hd').textContent={home:'Schusszettel',new:'Neue Einheit',live:S.u?S.u.title:'Live',sheet:'Zusammenfassung',photo:'Foto auswerten',klick:'Klicker'}[S.v];
$('#nav').replaceChildren(...NAV.map(([v,i,t])=>el('button',{class:S.v==v?'on':'',onclick:()=>go(v)},el('i',{},i),t)));
({home,new:neu,live:b=>S.u?live(S.u,b):neu(b),sheet:zettel,photo:b=>photo(S.u,b),klick})[S.v](a)}
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState=='visible'&&S.v=='live'&&'wakeLock'in navigator)try{wl=await navigator.wakeLock.request('screen')}catch{}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
all().then(u=>{S.units=u;return allK()}).then(k=>{k.forEach(r=>S.k[r.id]=r);render()});

['gesturestart','gesturechange','dblclick'].forEach(t=>document.addEventListener(t,e=>e.preventDefault()));
