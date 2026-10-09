'use strict';
const $=s=>document.querySelector(s);
const el=(t,p={},...k)=>{const e=document.createElement(t);for(const a in p){const v=p[a];if(v===false||v==null)continue;if(v===true){e.setAttribute(a,'');continue;}a.startsWith('on')?e.addEventListener(a.slice(2),v):a=='class'?e.className=v:a=='html'?e.innerHTML=v:e.setAttribute(a,v)}k.flat().forEach(c=>c!=null&&e.append(c));return e};
const DB=new Promise((r,reject)=>{const q=indexedDB.open('schuss',2);q.onupgradeneeded=()=>{const d=q.result;['u','k'].forEach(n=>d.objectStoreNames.contains(n)||d.createObjectStore(n,{keyPath:'id'}))};q.onerror=()=>reject(q.error);q.onsuccess=()=>r(q.result)});
const tx=async(m,f,st='u')=>{const d=await DB;return new Promise((r,reject)=>{const t=d.transaction(st,m),q=f(t.objectStore(st));t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Speichern abgebrochen'));t.oncomplete=()=>r(q.result)})};
const put=u=>tx('readwrite',s=>s.put(u)),all=()=>tx('readonly',s=>s.getAll()),del=id=>tx('readwrite',s=>s.delete(id)),putK=r=>tx('readwrite',s=>s.put(r),'k'),allK=()=>tx('readonly',s=>s.getAll(),'k');
/* WA-Regeln: Ring n endet bei Radius (11-n)/10, X = halber Zehner; Linienberührung = höherer Wert (Pfeilradius 2,2 mm) */
const score=AppCore.score;
const COL={10:'#ffe629',9:'#ffe629',8:'#e8332a',7:'#e8332a',6:'#3fb5cc',5:'#3fb5cc',4:'#111',3:'#111',2:'#fff',1:'#fff',0:'#999'};
const badge=s=>el('span',{class:'b',style:`background:${COL[s.v]};${s.v>=3&&s.v<=4||s.v==7||s.v==8?'color:#fff':''}`},s.x?'X':s.v||'M');
const vib=()=>navigator.vibrate&&navigator.vibrate(12);
const ld=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),today=()=>ld();
const fmt=d=>d.split('-').reverse().join('.');
let S={v:'home',k:{},units:[],u:null,p:0,z:1,f:'all',rf:0,fx:0,fy:0},wl=null,tEnd=0,tIv=null,ac=null;
const N={type:'Training',place:'Freiluft',R:1,P:6,A:6,mode:1,face:122,dist:70,bow:'Recurve',date:today(),wx:'',wind:'',temp:20,zone:8,loc:'',lay:'single'};
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
/* Auswertung: Kennzahlen, Ringverteilung (Prozent + Anzahl) und Verlaufsgrafiken */
const RK=['X','10','9','8','7','6','5','4','3','2','1','M'],val=s=>s.x?10:s.v||0,sd=d=>d.slice(8,10)+'.'+d.slice(5,7)+'.',nf=(v,k=1)=>(Math.round(v*10**k)/10**k).toString().replace('.',',');
function kpi(sh){const n=sh.length,sm=sh.reduce((a,s)=>a+val(s),0),g=sh.filter(s=>s.v>=9).length;return el('div',{class:'cards'},[[n,'Pfeile'],[n?nf(sm/n,2):'–','Schnitt / Pfeil'],[n?Math.round(g/n*100)+' %':'–','Gold (9–10)'],[sm,'Ringe']].map(([a,b])=>el('div',{class:'card'},el('b',{},a),el('small',{},b))))}
function dist(sh){const T=sh.length,n={};RK.forEach(k=>n[k]=0);sh.forEach(s=>n[keyOf(s)]++);return el('div',{},RK.map(k=>{const c=n[k],p=T?c/T*100:0,col=COL[k=='X'?10:k=='M'?0:k];return el('div',{style:`display:flex;align-items:center;gap:8px;margin:5px 0;opacity:${c?1:.45}`},el('span',{class:'b',style:`background:${col};min-width:34px;margin:0;color:${['4','3','8','7','6','5'].includes(k)?'#fff':'#000'}`},k),el('div',{style:'flex:1;background:#0b2a47;border-radius:6px;height:16px;overflow:hidden'},el('div',{style:`width:${p}%;height:100%;background:${col}`})),el('div',{style:'width:132px;text-align:right;font-size:14px'},`${nf(p)} % (${c} ${c==1?'Pfeil':'Pfeile'})`))}))}
function lineX(v,lab){const[c,x]=cv(340,205);x.font='11px sans-serif';x.fillStyle='#8fb0cf';x.textAlign='left';if(v.length<2){x.fillText('Zu wenig Daten für einen Verlauf',10,24);return c}
const a=Math.floor(Math.min(...v)-.5),b0=Math.ceil(Math.max(...v)+.5),b=a+Math.ceil((b0-a)/4)*4,L=34,Rr=332,T0=14,B0=165,Y=q=>B0-(q-a)/(b-a)*(B0-T0),P=i=>[L+i*(Rr-L-8)/(v.length-1),Y(v[i])],avg=v.reduce((p,q)=>p+q,0)/v.length;
x.strokeStyle='rgba(143,176,207,.25)';x.lineWidth=1;for(let g=0;g<=4;g++){const y=T0+g*(B0-T0)/4;x.beginPath();x.moveTo(L,y);x.lineTo(Rr,y);x.stroke();x.fillText(nf(b-g*(b-a)/4,0),0,y+4)}
x.setLineDash([5,4]);x.strokeStyle='#ffe629';x.beginPath();x.moveTo(L,Y(avg));x.lineTo(Rr,Y(avg));x.stroke();x.setLineDash([]);x.fillStyle='#ffe629';x.textAlign='right';x.fillText('Ø '+nf(avg,2),Rr,Y(avg)-4);
x.strokeStyle='#4a90d9';x.lineWidth=3;x.beginPath();v.forEach((q,i)=>x[i?'lineTo':'moveTo'](...P(i)));x.stroke();x.textAlign='center';const st=Math.ceil(v.length/8);
v.forEach((q,i)=>{const[px,py]=P(i);x.fillStyle='#e8f1fa';x.beginPath();x.arc(px,py,3.5,0,7);x.fill();if(v.length<=12)x.fillText(nf(q,2),px,py-8);if(i%st==0||i==v.length-1){x.fillStyle='#8fb0cf';x.fillText(lab&&lab[i]!=null?lab[i]:i+1,px,185)}});return c}
const charts=(sh,ln,lab,tit)=>[kpi(sh),el('h3',{},'Verteilung nach Ringen'),dist(sh),el('h3',{},'Trefferquote nach Zonen (kumuliert)'),hbars(sh),el('h3',{},tit||'Verlauf'),lineX(ln,lab)];
const pe=(u,r)=>u.p.map((a,i)=>[i+1,a&&a.length?sum(a):null]).filter(q=>q[1]!=null&&(!r||q[0]>(r-1)*u.P&&q[0]<=r*u.P));
function dayChart(ru){const m={};ru.forEach(u=>{const q=m[u.date]=m[u.date]||[0,0];q[0]+=tot(u);q[1]+=done(u)});const ds=Object.keys(m).sort();return ds.length<ru.length?[el('h3',{},'Schnitt je Tag (alle Aufschreibungen des Tages)'),lineX(ds.map(d=>Math.round(m[d][0]/m[d][1]*100)/100),ds.map(sd))]:[]}
/* Zettel */
function cards(u){const t=tot(u),dn=done(u),av=dn?t/dn:0,sh=shots(u),zr=Math.floor(av),z=sh.length&&zr>0?Math.round(100*sh.filter(s=>s.v>=zr).length/sh.length)+'%':'0%';
return el('div',{class:'cards'},[[`${t} / ${mx(u)}`,'Punkte'],[av.toFixed(1),'Erfolgszone'],[z,'in Zone '+zr],[`${Math.round(av*mx(u)/10)} / ${mx(u)}`,'Projektion']].map(([a,b])=>el('div',{class:'card'},el('b',{},a),el('small',{},b))))}
async function save(u){await put(u);S.units=await all()}
function sheet(u){const d=el('div',{class:'box'});
if(u.mode>2){const n=u.mode==3?u.R*u.P:u.R;u.sums=u.sums||[];for(let i=0;i<n;i++)d.append(el('div',{class:'row'},el('i',{},i+1),u.mode==3?'Passe '+(i+1):'Durchgang '+(i+1),el('input',{type:'number',inputmode:'numeric',value:u.sums[i]??'',max:u.mode==3?u.A*10:u.P*u.A*10,onchange:e=>{u.sums[i]=e.target.value===''?'':Math.max(0,Math.min(Math.round(+e.target.value),+e.target.max));save(u);render()}})));return d}
for(let r=0;r<u.R;r++){let c=0;d.append(el('div',{class:'sep'}));for(let p=r*u.P;p<(r+1)*u.P;p++){const a=u.p[p]||[],s=sum(a);c+=s;d.append(el('div',{class:'row'+(p==S.p&&S.v=='live'?' on':''),onclick:()=>{if(S.v=='live'){S.p=p;render()}}},el('i',{},p%u.P+1),el('span',{class:'bs'},[...a].sort((x,y)=>y.v-x.v||y.x-x.x).map(badge)),el('b',{},a.length?s:''),el('em',{},a.length?c:'')))}}return d}
/* Live */
const LY=u=>u.lay||'single';
function lay(u){const l=LY(u);if(l=='triple')return{H:1.4,Rf:.44,n:['Oben','Mitte','Unten'],sp:[0,1,2].map(i=>({x:.5,y:.24+i*.46,r:.22}))};
if(l=='vegas')return{H:.95,Rf:.48,n:['Oben links','Oben rechts','Unten'],sp:[{x:.25,y:.26,r:.24},{x:.75,y:.26,r:.24},{x:.5,y:.68,r:.24}]};
return{H:1,Rf:.45,n:['Scheibe'],sp:[{x:.5,y:.5,r:.45}]}}
function drawSpot(x,cx,cy,R){[[1,'#3fb5cc'],[.8,'#e8332a'],[.4,'#ffe629']].forEach(([f,c])=>{x.fillStyle=c;x.beginPath();x.arc(cx,cy,R*f,0,7);x.fill()});x.lineWidth=1;x.strokeStyle='rgba(0,0,0,.45)';for(const f of[1,.8,.6,.4,.2,.1]){x.beginPath();x.arc(cx,cy,R*f,0,7);x.stroke()}}
function plotL(u,sh){const L=lay(u),W=320,Hc=Math.round(W*L.H),[c,x]=cv(W,Hc);L.sp.forEach(sp=>drawSpot(x,sp.x*W,sp.y*W,sp.r*W));sh.filter(s=>s.px!=null).forEach(s=>{const sp=L.sp[s.sp||0];x.fillStyle='#000';x.strokeStyle='#fff';x.lineWidth=1.5;x.beginPath();x.arc((sp.x+s.px*L.Rf)*W,(sp.y+s.py*L.Rf)*W,4,0,7);x.fill();x.stroke()});return c}
function spotStats(u,sh){const L=lay(u),rows=L.n.map((n,i)=>{const a=sh.filter(s=>(s.sp||0)==i);return{n,c:a.length,av:a.length?sum(a)/a.length:0,g:a.filter(s=>s.v>=9).length}}),best=rows.filter(r=>r.c).sort((a,b)=>b.av-a.av)[0];
return el('div',{class:'box'},el('h3',{},'Auswertung nach Spot'),rows.map(r=>el('div',{class:'it'},el('div',{},(best&&r==best?'⭐ ':'')+r.n,el('small',{},`${r.c} Pfeile · ${r.g}× 9/10`)),el('b',{},r.c?r.av.toFixed(2):'–'))),best?el('p',{},`Am besten getroffen: ${best.n} (Ø ${best.av.toFixed(2)})`):null)}
function gfx(u,box){const L=lay(u),W=Math.min(innerWidth-24,460),Hc=Math.round(W*L.H),[c,x]=cv(W,Hc);let drag=null;const P=(wx,wy)=>[W/2+(wx-.5-S.fx)*W*S.z,Hc/2+(wy-L.H/2-S.fy)*W*S.z],Wd=(a,b)=>[(a-W/2)/(W*S.z)+.5+S.fx,(b-Hc/2)/(W*S.z)+L.H/2+S.fy],pas=()=>u.p[S.p]=u.p[S.p]||[],sw=s=>{const sp=L.sp[s.sp||0];return[sp.x+s.px*L.Rf,sp.y+s.py*L.Rf]};
const draw=()=>{x.clearRect(0,0,W,Hc);L.sp.forEach(sp=>{const[cx,cy]=P(sp.x,sp.y),R=sp.r*W*S.z;LY(u)=='single'?drawT(x,cx,cy,R):drawSpot(x,cx,cy,R)});u.p.forEach((a,i)=>a.forEach(s=>{if(s.px==null)return;const cur=i==S.p,[X,Y]=P(...sw(s));x.globalAlpha=cur?1:.35;x.fillStyle='#000';x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(X,Y,cur?6:4,0,7);x.fill();x.stroke();x.globalAlpha=1;if(s.arrowId){x.font='bold 13px sans-serif';x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=3;x.strokeText(s.arrowId,X+8,Y-8);x.fillText(s.arrowId,X+8,Y-8)}if(cur&&drag&&drag.s==s){x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=3;x.font='bold 20px sans-serif';const t=s.x?'X':s.v||'M';x.strokeText(t,X+10,Y-10);x.fillText(t,X+10,Y-10)}}))};
const pos=e=>{const b=c.getBoundingClientRect();return[(e.clientX-b.left)*W/b.width,(e.clientY-b.top)*Hc/b.height]};
const mv=(s,q,dy)=>{const[wx,wy]=Wd(q[0],q[1]+dy);let bi=0,bd=1e9;L.sp.forEach((sp,i)=>{const d=Math.hypot(wx-sp.x,wy-sp.y);if(d<bd){bd=d;bi=i}});const sp=L.sp[bi];s.sp=bi;s.px=(wx-sp.x)/L.Rf;s.py=(wy-sp.y)/L.Rf;Object.assign(s,score(s.px,s.py,u))};
c.className='tt';c.onpointerdown=e=>{e.preventDefault();c.setPointerCapture(e.pointerId);const q=pos(e),a=pas();let s=a.find(s=>{if(s.px==null)return false;const[X,Y]=P(...sw(s));return Math.hypot(X-q[0],Y-q[1])<18});if(s)drag={s,dy:0};else if(a.length<u.A){s={arrowId:nextArrow(u)};a.push(s);drag={s,dy:-44,n:1};mv(s,q,-44)}if(drag)draw()};
c.onpointermove=e=>{if(!drag)return;mv(drag.s,pos(e),drag.dy);draw()};
c.onpointerup=async()=>{if(!drag)return;vib();if(S.z>1){const[wx,wy]=sw(drag.s);S.fx=wx-.5;S.fy=wy-L.H/2}else S.fx=S.fy=0;drag=null;await save(u);render()};
draw();return c}
const KEYS=['X',10,9,8,7,6,5,4,3,2,1,'M'],KC={X:'#e6dc2a',10:'#e6dc2a',9:'#e6dc2a',8:'#c8404a',7:'#c8404a',6:'#2fa9c4',5:'#2fa9c4',4:'#05101c',3:'#05101c',2:'#fff',1:'#fff',M:'#9aa'};
function live(u,box){arrowEditor(u,box);const t=u.R*u.P,sh=shots(u).length;
if(u.mode<3&&LY(u)=='single')box.append(el('button',{class:'s np',style:'width:100%;margin-bottom:8px',onclick:()=>{S.ph=null;go('photo')}},'📷 Foto auswerten'));
box.append(el('div',{class:'bar'},el('span',{},`Gesamt: ${sh} / ${t*u.A}`),el('span',{},`Passe ${S.p+1}/${t}: ${sum(u.p[S.p]||[])} / ${u.A*10}`)));
if(u.mode==1){box.append(gfx(u,box),el('div',{class:'bar',style:'margin-top:8px'},el('button',{class:'s',onclick:()=>{S.z=Math.max(1,S.z-.5);S.fx=S.fy=0;render()}},'Zoom −'),el('span',{},`Zoom: ${Math.round((S.z-1)*100)} %`),el('button',{class:'s',onclick:()=>{S.z=Math.min(4,S.z+.5);render()}},'Zoom +')));
/* feste Leiste unten rechts: letzten Pfeil löschen / nächste Passe */
const dl=async()=>{const p=u.p[S.p]||[];if(!p.length&&S.p>0){S.p--;u.p[S.p].pop()}else p.pop();S.fx=S.fy=0;await save(u);render()};
box.append(el('div',{class:'np live-actions'},el('button',{class:'s',style:'height:48px;min-width:64px;font-size:22px',onclick:dl},'⌫'),el('button',{class:'s',style:'height:48px;padding:0 18px;font-size:17px;font-weight:600',onclick:()=>{S.p<t-1?(S.p++,S.fx=S.fy=0,render()):go('sheet')}},S.p<t-1?'Nächste Passe ▶':'Fertig')));
$('#app').style.paddingBottom='calc(130px + env(safe-area-inset-bottom))'}
if(u.mode==2){const a=el('div',{class:'keys'});if(LY(u)!='single')a.append(el('div',{style:'grid-column:1/-1;display:flex;gap:8px'},lay(u).n.map((n,i)=>el('button',{style:`flex:1;height:40px;border:0;border-radius:10px;font-weight:700;background:${(S.sp||0)==i?'#fff':'#2a5a8a'};color:${(S.sp||0)==i?'#000':'#fff'}`,onclick:()=>{S.sp=i;render()}},n))));KEYS.filter(k=>k!=='X'||u.place!=='Halle').forEach(k=>a.append(el('button',{style:`background:${KC[k]};color:${[4,3,8,7,6,5].includes(k)?'#fff':'#000'}`,onclick:async()=>{const p=u.p[S.p]=u.p[S.p]||[];if(p.length>=u.A)return;p.push({arrowId:nextArrow(u),v:k=='X'?10:k=='M'?0:+k,x:k=='X'&&u.place!=='Halle'?1:0,sp:S.sp||0});if(LY(u)!='single')S.sp=((S.sp||0)+1)%lay(u).n.length;vib();if(p.length>=u.A&&S.p<t-1)S.p++;await save(u);render()}},k)));
a.append(el('button',{style:'background:#e8f1fa;color:#000',onclick:tmr},tEnd?'⏹':'⏱'),el('button',{style:'grid-column:span 3;background:#4a8acf;color:#fff',onclick:async()=>{const p=u.p[S.p]||[];let d;if(!p.length&&S.p>0){S.p--;d=u.p[S.p].pop()}else d=p.pop();if(d&&LY(u)!='single')S.sp=d.sp||0;await save(u);render()}},'⌫ Löschen'));box.append(sheet(u),a);$('#app').className='k';return}
if(u.mode==1)box.append(sheet(u));else box.append(sheet(u));
if(u.mode<3)box.append(el('div',{class:'g',style:'margin-top:8px'},el('button',{class:'s',disabled:S.p==0,onclick:()=>{S.p--;S.fx=S.fy=0;render()}},'Zurück'),el('button',{class:'s',onclick:tmr},tEnd?'⏹':'⏱'),el('button',{class:'s',onclick:()=>{S.p<t-1?(S.p++,S.fx=S.fy=0,render()):go('sheet')}},S.p<t-1?'Weiter':'Fertig')))}
const left=()=>Math.max(0,Math.ceil((tEnd-Date.now())/1000)),tt=()=>{const s=left();return `⏱ ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`},hdc=()=>{const s=left();return s<=30?'#c8404a':s<=60?'#b8860b':'#0a3a63'};
const beep=n=>{try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();ac.resume&&ac.resume();for(let i=0;i<n;i++){const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+i*.3;o.frequency.value=880;o.connect(g);g.connect(ac.destination);g.gain.setValueAtTime(.4,t);o.start(t);o.stop(t+.18)}}catch{}};
function tick(){if(!tEnd)return;const s=left();if(s<=0){tEnd=0;clearInterval(tIv);beep(3);navigator.vibrate&&navigator.vibrate(600);render();return}const h=$('#hd');h.textContent=tt();h.style.background=hdc();if(s==30&&tick.l!=30)beep(2);tick.l=s}
function tmr(){if(tEnd){tEnd=0;clearInterval(tIv);render();return}const u=S.u;tEnd=Date.now()+(u?.timerSeconds||(u&&u.A<=3?120:240))*1000;tick.l=0;beep(1);clearInterval(tIv);tIv=setInterval(tick,250);render()}
/* Neue Einheit */
const stp=(k,l,lo=1)=>el('div',{},el('label',{},l),el('div',{class:'st'},el('button',{class:'s',onclick:()=>{N[k]=Math.max(lo,N[k]-1);render()}},'−'),el('b',{},N[k]),el('button',{class:'s',onclick:()=>{N[k]=Math.min(k==='A'?36:k==='P'?36:12,N[k]+1);render()}},'+')));
const opt=(k,l,o)=>el('div',{},el('label',{},l),el('div',{class:'g'},o.map(([v,t])=>el('button',{class:'s'+(N[k]===v?' on':''),onclick:()=>{N[k]=v;if(k=='face'&&v!=40)N.lay='single';if(k=='place')Object.assign(N,v=='Halle'?{face:40,dist:18,R:2,P:10,A:3,lay:'single'}:{face:122,dist:70,R:1,P:6,A:6,lay:'single'});render()}},t))));
function neu(box){box.append(el('div',{class:'box'},opt('type','Art',[['Training','Training'],['Wettbewerb','Wettbewerb']]),opt('place','Ort',[['Freiluft','Freiluft'],['Halle','Halle']])),
N.type=='Wettbewerb'?el('div',{class:'box'},el('label',{style:'margin-top:0'},'Wettkampfort'),el('input',{type:'text',placeholder:'z. B. Göttingen, Schützenverein …',value:N.loc,oninput:e=>N.loc=e.target.value})):document.createDocumentFragment(),el('div',{class:'box'},el('h3',{},'Aufbau'),el('div',{class:'bar'},el('span',{},'Max. Punkte'),el('b',{},N.R*N.P*N.A*10)),el('div',{class:'g'},stp('R','Runden'),stp('P','Passen'),stp('A','Pfeile'))),
el('div',{class:'box'},opt('mode','Eingabe',[[1,'Pfeile auf die Auflage ziehen'],[2,'Pfeil für Pfeil'],[3,'Summe je Passe'],[4,'Summe je Durchgang']]),opt('face','Auflage (Vollauflage)',[[122,'122 cm'],[80,'80 cm'],[60,'60 cm'],[40,'40 cm']]),N.face==40?opt('lay','Spot-Variante',[['single','Vollauflage'],['triple','3er-Spot'],['vegas','Vegas-Spot']]):null,
el('label',{},'Distanz (m)'),el('input',{type:'number',value:N.dist,onchange:e=>N.dist=+e.target.value||N.dist}),opt('bow','Bogenklasse',[['Recurve','Recurve'],['Compound','Compound'],['Blank','Blank']]),el('label',{},'Datum'),el('input',{type:'date',value:N.date,onchange:e=>N.date=e.target.value})),
el('div',{class:'box'},el('h3',{},'Bedingungen (optional)'),N.place==='Freiluft'?el('div',{},check('Wetter beim Start per Standort abrufen',N.autoWeather,v=>N.autoWeather=v),el('small',{},'Der Browser fragt nach Standortzugriff. Koordinaten werden zum Wetterabruf an Open-Meteo übermittelt.')):null,opt('wx','Wetter',[['sun','☀️'],['cloud','☁️'],['rain1','🌦'],['rain','🌧']]),opt('wind','Wind',[[0,'0'],[1,'leicht'],[2,'mittel'],[3,'stark']]),el('label',{},`Temperatur: ${N.temp} °C`),el('input',{type:'range',min:-10,max:45,value:N.temp,oninput:e=>{N.temp=+e.target.value;e.target.previousSibling.textContent=`Temperatur: ${N.temp} °C`}})),
el('button',{class:'p',onclick:async()=>{const u={...N,id:Date.now(),title:N.type=='Wettbewerb'&&N.loc?`${N.loc} · ${N.dist} m`:`${N.type} · ${N.dist} m`,p:[],sums:[],equipment:structuredClone(material.equipment.find(e=>e.id===N.equipmentId)||null)};u.arrowSet=u.arrowSet||u.equipment?.arrowSet||'';S.u=u;S.p=0;S.sp=0;S.z=1;S.fx=S.fy=0;await save(u);go('live');if(u.autoWeather)fetchWeather(u)}},'Einheit erstellen'));extraNew(box)}
/* Start */
const dl=async(n,t)=>{const b=new Blob([t],{type:'application/json'}),f=new File([b],n,{type:'application/json'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});}else{const url=URL.createObjectURL(b),a=el('a',{href:url,download:n});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}};
const exp=async()=>{try{const createdAt=new Date().toISOString();await dl(`schusszettel-${today()}.json`,JSON.stringify({v:3,createdAt,units:S.units,clicks:Object.values(S.k),material}));localStorage.bk=Date.now();render()}catch(e){if(e.name!=='AbortError')alert('Sicherung fehlgeschlagen: '+e.message)}};
function home(box){box.append(backupPanel());
box.append(el('div',{class:'g'},[['all','Alle'],['Halle','Halle'],['Freiluft','Freiluft']].map(([v,t])=>el('button',{class:'s'+(S.f==v?' on':''),onclick:()=>{S.f=v;render()}},t))));
const us=S.units.filter(u=>S.f=='all'||u.place==S.f).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id),sh=us.flatMap(shots),ru=[...us].reverse().filter(u=>done(u));
if(!us.length)box.append(el('div',{class:'box'},'Noch keine Einheiten. Tippe auf „Neu“, um zu starten.'));else{box.append(el('div',{class:'box'},el('h3',{},'Trefferbild'),plot(sh),...charts(sh,ru.map(u=>Math.round(tot(u)/done(u)*100)/100),ru.map(u=>sd(u.date)),'Schnitt je Aufschreiben'),...dayChart(ru)));
box.append(el('div',{class:'box'},el('h3',{},'Einheiten'),us.map(u=>el('div',{class:'it',onclick:()=>{S.u=u;S.p=0;S.rf=0;go('sheet')}},el('div',{},u.title,el('small',{},`${fmt(u.date)} · ${u.place} · ${u.face} cm${LY(u)=='triple'?' 3er-Spot':LY(u)=='vegas'?' Vegas':''}${u.loc?' · '+u.loc:''}`)),el('b',{},`${tot(u)}/${mx(u)}`)))))}
box.append(el('div',{class:'g np'},el('button',{class:'s',onclick:exp},'JSON sichern'),el('label',{class:'s',style:'text-align:center;margin:0;color:var(--t)'},'JSON laden',el('input',{type:'file',accept:'.json',style:'display:none',onchange:async e=>{if(e.target.files[0])await restoreBackup(e.target.files[0]);}}))))}
/* Zettel-Ansicht */
function zettel(box){const u=S.u;if(!u)return box.append('Keine Einheit gewählt.');const sh=shots(u),rs=[...Array(u.R)].map((_,r)=>r+1);
box.append(el('div',{class:'bar'},el('span',{},u.title),el('span',{},fmt(u.date))),cards(u),sheet(u));
if(u.mode<3){const f=S.rf?(u.p.slice((S.rf-1)*u.P,S.rf*u.P)).flat():sh;box.append(el('div',{class:'box'},el('h3',{},'Trefferbild'),LY(u)=='single'?plot(f):plotL(u,f),el('div',{class:'g'},[0,...rs].map(r=>el('button',{class:'s'+(S.rf==r?' on':''),onclick:()=>{S.rf=r;render()}},r||'Alle'))),...charts(f,pe(u,S.rf).map(q=>q[1]),pe(u,S.rf).map(q=>q[0]),'Ergebnis je Passe')));if(LY(u)!='single')box.append(spotStats(u,f))}
unitDetails(u,box);box.append(check('Trefferbild und Charts im PDF mit ausgeben',u.printAnalysis,async v=>{u.printAnalysis=v;await save(u)}),el('p',{class:'np'},'Druckfähiger Schusszettel mit Unterschriftenfeldern. Vorgaben des Veranstalters prüfen; bei Ringberührung zählt der höhere Wert. Fotoergebnisse vor Abgabe kontrollieren.'));box.append(el('div',{class:'g np'},el('button',{class:'s',onclick:()=>printSheet(u)},'PDF / Drucken'),el('button',{class:'s',onclick:()=>{S.p=Array.from({length:u.R*u.P},(_,i)=>i).find(i=>(u.p[i]||[]).length<u.A)??0;go('live')}},'Weiter erfassen'),el('button',{class:'s',onclick:async()=>{if(confirm('Einheit löschen?')){await del(u.id);S.units=await all();S.u=null;go('home')}}},'Löschen')))}
/* Foto-Auswertung: Kalibrierung per Antippen → automatische Pfeilerkennung → Kontrolle/Korrektur → Übernahme (ohne OpenCV) */
const PH={dev:110,minCm:.8,maxDark:55,maxMask:.3}; /* Stellschrauben: dev = Farbabweichung (kleiner = empfindlicher), minCm = kleinste Pfeilspur in cm, maxDark = Mindesthelligkeit, maxMask = Warnschwelle bei unruhigem Bild */
/* Erkennung: Pixel, die stark von der Median-Farbe ihres Rings abweichen, gelten als Pfeil. d=RGBA, M×h Pixel, Mitte X0/Y0, Radius R in Pixeln, face = Auflage in cm */
function detCore(d,M,h,X0,Y0,R,face){const B=5,ch=[...Array(B)].map(()=>[[],[],[]]);let lum=0,n=0;
for(let y=0;y<h;y+=2)for(let x=0;x<M;x+=2){const q=Math.hypot(x-X0,y-Y0)/R;if(q>.97)continue;const i=(y*M+x)*4,b=Math.min(B-1,q*B|0);for(let c=0;c<3;c++)ch[b][c].push(d[i+c]);lum+=d[i]+d[i+1]+d[i+2];n++}
if(n<50)return{err:'Kalibrierung liegt nicht auf dem Foto – bitte neu kalibrieren'};
if(lum/n/3<PH.maxDark)return{err:'Foto zu dunkel – bitte mit mehr Licht aufnehmen'};
const med=ch.map(a=>a.map(v=>{v.sort((p,q)=>p-q);return v[v.length>>1]??0})),dv=(i,b)=>Math.abs(d[i]-med[b][0])+Math.abs(d[i+1]-med[b][1])+Math.abs(d[i+2]-med[b][2]),m=new Uint8Array(M*h);let cnt=0;
for(let y=0;y<h;y++)for(let x=0;x<M;x++){const q=Math.hypot(x-X0,y-Y0)/R;if(q>.97)continue;const i=(y*M+x)*4,b=Math.min(B-1,q*B|0),f=q*B-b;let e=dv(i,b);/* an Ringkanten auch Nachbarring zulassen */if(f<.08&&b>0)e=Math.min(e,dv(i,b-1));if(f>.92&&b<B-1)e=Math.min(e,dv(i,b+1));if(e>PH.dev){m[y*M+x]=1;cnt++}}
/* Erosion 3×3 entfernt dünne Ringlinien, Pfeilspuren bleiben */
const e=new Uint8Array(M*h);for(let y=1;y<h-1;y++)for(let x=1;x<M-1;x++){const i=y*M+x;if(m[i]&&m[i-1]&&m[i+1]&&m[i-M]&&m[i+M]&&m[i-M-1]&&m[i-M+1]&&m[i+M-1]&&m[i+M+1])e[i]=1}
/* zusammenhängende Flächen = Pfeile; Mindestgröße skaliert mit der Auflage */
const mn=Math.max(8,(PH.minCm/(face/2)*R)**2*.5),cs=[];
for(let s=0;s<e.length;s++)if(e[s]==1){const st=[s],p=[];let a=0,sx=0,sy=0;e[s]=2;while(st.length){const i=st.pop();p.push(i);a++;sx+=i%M;sy+=i/M|0;for(const j of[i-1,i+1,i-M,i+M])if(e[j]==1){e[j]=2;st.push(j)}}if(a>=mn)cs.push({a,x:sx/a,y:sy/a,p})}
const ar=cs.map(c=>c.a).sort((p,q)=>p-q),md=ar[ar.length>>1]||1;
return{hits:cs.map(c=>{const k=c.a>=md*2.5?'big':c.a<=md*.4?'small':'';return{px:(c.x-X0)/R,py:(c.y-Y0)/R,k,pts:k=='big'?c.p.filter((_,j)=>j%4==0).map(i=>[(i%M-X0)/R,((i/M|0)-Y0)/R]):null}}),warn:cnt/(Math.PI*R*R)>PH.maxMask?'Viele auffällige Bereiche (Licht/Schatten?) – bitte alle Punkte genau prüfen':''}}
/* Pfeilerkennung v2: bunte Nocken/Befiederung (passen nicht zur Ringfarbe) finden, dann dem dunklen Schaft bis zum Einstich folgen */
function detArr(d,M,h,X0,Y0,R,face){const N=M*h,m=new Uint8Array(N),ok=[H=>H>=28&&H<=72,H=>H<=28||H>=345,H=>H>=170&&H<=230,()=>0,()=>0],lum=i=>.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];
for(let y=0;y<h;y++)for(let x=0;x<M;x++){const q=Math.hypot(x-X0,y-Y0)/R;if(q>1.02)continue;const i=y*M+x;if(Math.max(d[i*4],d[i*4+1],d[i*4+2])<120)continue;const H=hue(d[i*4],d[i*4+1],d[i*4+2]);if(H<0)continue;const b=Math.min(4,q*5|0),f=q*5-b;if(f<.05||f>.95||ok[b](H))continue;if(b>2&&Math.max(d[i*4],d[i*4+1],d[i*4+2])-Math.min(d[i*4],d[i*4+1],d[i*4+2])<100)continue;m[i]=1}
const e2=new Uint8Array(N);for(let y=1;y<h-1;y++)for(let x=1;x<M-1;x++){const i=y*M+x;e2[i]=m[i]&&m[i-1]&&m[i+1]&&m[i-M]&&m[i+M]?1:0}m.set(e2);
const sn=new Uint8Array(N),E=[];
const tr=(cx,cy,ux,uy,t0)=>{const L=(px,py)=>{const xx=Math.round(px),yy=Math.round(py);return xx>=0&&yy>=0&&xx<M&&yy<h?lum(yy*M+xx):255};let last=null,g=0;for(let k=0,t=t0;k<260;k++,t+=1.5){const x=cx+ux*t,y=cy+uy*t;const c0=Math.min(L(x,y),L(x-uy,y+ux),L(x+uy,y-ux)),dk=c0<110&&c0<Math.min(L(x-uy*6,y+ux*6),L(x+uy*6,y-ux*6))-35;if(dk){last=[x,y,t];g=0}else if(++g>(last?9:14))break}return last};
for(let s0=0;s0<N;s0++)if(m[s0]&&!sn[s0]){const st=[s0],p=[];sn[s0]=1;while(st.length){const i=st.pop();p.push(i);for(const j of[i-1,i+1,i-M,i+M])if(j>=0&&j<N&&m[j]&&!sn[j]){sn[j]=1;st.push(j)}}
if(p.length<6)continue;let mx=0,my=0;for(const i of p){mx+=i%M;my+=i/M|0}mx/=p.length;my/=p.length;let sxx=0,syy=0,sxy=0;for(const i of p){const a=i%M-mx,c=(i/M|0)-my;sxx+=a*a;syy+=c*c;sxy+=a*c}
const th=.5*Math.atan2(2*sxy,sxx-syy);let best=null;
for(const sg of[1,-1]){const ux=Math.cos(th)*sg,uy=Math.sin(th)*sg;let ex=0;for(const i of p)ex=Math.max(ex,(i%M-mx)*ux+((i/M|0)-my)*uy);const r=tr(mx,my,ux,uy,ex+2);if(r&&(!best||r[2]>best[2]))best=r}
E.push(best&&best[2]>8?{x:best[0],y:best[1],u:0,s:best[2]}:{x:mx,y:my,u:1})}
/* doppelte Einstiche zusammenfassen */
const out=[];for(const e of E){if(Math.hypot(e.x-X0,e.y-Y0)>1.03*R)continue;const o=out.find(z=>Math.hypot(z.x-e.x,z.y-e.y)<Math.max(7,R*.02));if(o){if(o.u&&!e.u)Object.assign(o,e)}else out.push(e)}
return{hits:out.map(e=>({px:(e.x-X0)/R,py:(e.y-Y0)/R,k:e.u?'small':'',pts:null,s:e.s||0})),warn:out.length>25?'Sehr viele auffällige Bereiche – bitte alle Punkte genau prüfen':''}}
function detect(img,cx,cy,r,W,face){const M=Math.min(800,img.width),h=Math.round(M*img.height/img.width),k=M/W,c=document.createElement('canvas');c.width=M;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,M,h);return detectNocks(g.getImageData(0,0,M,h).data,M,h,cx*k,cy*k,r*k)}
/* Automatische Scheibenerkennung: Gold = größte gelbe Fläche, äußerer Rand des blauen Rings (=0,6 R) aus dem Radialprofil */
function hue(r,g,b){const mx=Math.max(r,g,b),dd=mx-Math.min(r,g,b);if(dd<50||mx<90)return -1;return 60*(mx==r?((g-b)/dd+6)%6:mx==g?(b-r)/dd+2:(r-g)/dd+4)}
function autoCal(d,M,h){const N=M*h,cl=new Uint8Array(N),sn=new Uint8Array(N);let best=null;for(let i=0;i<N;i++){const H=hue(d[i*4],d[i*4+1],d[i*4+2]);cl[i]=H<0?0:H>=35&&H<=70?1:H<=15||H>=345?2:H>=170&&H<=225?3:0}
const T=(cx,cy,r,v)=>{let c=0;for(let t=0;t<24;t++){const x=Math.round(cx+r*Math.cos(t*Math.PI/12)),y=Math.round(cy+r*Math.sin(t*Math.PI/12));if(x>=0&&x<M&&y>=0&&y<h&&cl[y*M+x]==v)c++}return c/24};
/* Gold = gelbe, runde Fläche, die von Rot und dann Blau umgeben ist (so wird gelbes Gras nicht verwechselt) */
for(let s=0;s<N;s++)if(cl[s]==1&&!sn[s]){const st=[s];sn[s]=1;let a=0,x0=M,x1=0,y0=h,y1=0;while(st.length){const i=st.pop(),x=i%M,y=i/M|0;a++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;for(const j of[i-1,i+1,i-M,i+M])if(j>=0&&j<N&&cl[j]==1&&!sn[j]){sn[j]=1;st.push(j)}}
if(a<300)continue;const w=x1-x0+1,hh=y1-y0+1,as=w/hh;if(as<.6||as>1.7)continue;const rb=(w+hh)/4,mx=(x0+x1)/2,my=(y0+y1)/2,sc=T(mx,my,rb*1.5,2)+T(mx,my,rb*2.5,3);if(sc>(best?best.sc:.8))best={a:Math.PI*rb*rb,x:mx,y:my,sc}}
if(!best||best.a<30)return null;const D=Math.round(Math.min(M,h)*.6),n=new Float32Array(D+2),ry=Math.sqrt(best.a/Math.PI);
for(let i=0;i<N;i++)if(cl[i]==3){const q=Math.round(Math.hypot(i%M-best.x,(i/M|0)-best.y));if(q<=D)n[q]++}
const f=q=>n[q]/(2*Math.PI*Math.max(q,1)),s=q=>(f(q-1)+f(q)+f(q+1))/3;let q=Math.ceil(ry*1.5),on=0;for(;q<D;q++){if(!on&&s(q)>.5)on=1;else if(on&&s(q)<.25)break}
if(!on||q>=D)return null;const R=q/.6;if(ry<R*.1||ry>R*.26)return null;
let sx=0,sy=0,c=0;for(let i=0;i<N;i++)if(cl[i]&&Math.hypot(i%M-best.x,(i/M|0)-best.y)<q*1.02){sx+=i%M;sy+=i/M|0;c++}return{cx:best.x,cy:best.y,r:R}}
function autoCalImg(img,W){const M=Math.min(800,img.width),h=Math.round(M*img.height/img.width),c=document.createElement('canvas');c.width=M;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,M,h);const r=autoCal(g.getImageData(0,0,M,h).data,M,h);return r&&{cx:r.cx*W/M,cy:r.cy*W/M,r:r.r*W/M}}
/* k-Means: teilt eine zusammengewachsene Fläche in n Pfeile */
function km(p,n){let c=[p[0]];while(c.length<n){let b=p[0],bd=-1;for(const q of p){const m=Math.min(...c.map(z=>Math.hypot(q[0]-z[0],q[1]-z[1])));if(m>bd){bd=m;b=q}}c.push(b)}
for(let t=0;t<10;t++){const g=c.map(()=>[0,0,0]);for(const q of p){let bi=0,bd=1e9;c.forEach((z,i)=>{const m=Math.hypot(q[0]-z[0],q[1]-z[1]);if(m<bd){bd=m;bi=i}});g[bi][0]+=q[0];g[bi][1]+=q[1];g[bi][2]++}c=g.map((s,i)=>s[2]?[s[0]/s[2],s[1]/s[2]]:c[i])}return c}
const WD=()=>Math.min(innerWidth-24,460),mk=(u,px,py,c)=>({px,py,c,...score(px,py,u)});
/* Erkennung ausführen: unsichere Treffer wandern in die Rückfrage-Liste ph.q */
function runDet(u,ph,W){const r=detect(ph.img,ph.cx,ph.cy,ph.r,W,u.face);ph.q=[];ph.stage='select';ph.sel=null;ph.msg=r.err||r.warn||'';ph.cand=(r.hits||[]).sort((a,b)=>(b.s||0)-(a.s||0)).map(q=>{const d={...mk(u,q.px,q.py,q.k?.4:1),owned:false};return d})}
const sure=(u,ph)=>false&&!ph.q.length&&ph.cand.length==u.A&&!ph.msg;
/* Übernehmen: nach Wert absteigend in die aktuelle und folgende Passen schreiben */
async function commit(u,ph){try{if(ph.stage!=='assign')throw Error('Bitte zuerst eigene Pfeile auswählen.');if(!ph.cand.some(d=>d.owned&&d.end!=='skip'))throw Error('Keine Treffer ausgewählt.');const p=AppCore.photoPlan(u,ph.cand.filter(d=>d.owned));u.p=p;await save(u);S.ph=null;go('live')}catch(e){alert(e.message)}}
function photo(u,box){if(!u||u.mode>2||LY(u)!='single')return box.append(el('div',{class:'box'},'Foto-Auswertung gibt es nur bei Vollauflagen und den Modi „Auflage“ und „Pfeil für Pfeil“.'));
const ph=S.ph=S.ph||{step:0,cand:[],q:[]};
if(!ph.img){box.append(el('div',{class:'box'},el('h3',{},'Foto der Scheibe'),el('p',{},'Ein Foto genügt: Scheibe möglichst frontal, gleichmäßig beleuchtet und füllend. Die Erkennung schlägt Treffer vor. Prüfe jeden Einstich: überlappende Schäfte, alte Löcher und Perspektive können zu Fehlern führen.'),el('input',{type:'file',accept:'image/*',onchange:e=>{const f=e.target.files[0];if(!f)return;const i=new Image();i.onload=()=>{ph.img=i;URL.revokeObjectURL(i.src);const W=WD(),r=autoCalImg(i,W);if(r){Object.assign(ph,r,{step:3});runDet(u,ph,W);if(sure(u,ph))return commit(u,ph)}else{ph.step=1;ph.msg='Scheibe nicht sicher erkannt – bitte Mitte und Rand antippen'}render()};i.src=URL.createObjectURL(f)}})),el('button',{class:'s',onclick:()=>go('live')},'Zurück'));return}
const W=WD()*(ph.zoom||1);if(ph.width&&ph.width!==W){const scale=W/ph.width;ph.cx*=scale;ph.cy*=scale;ph.r*=scale;}ph.width=W;const H=Math.round(W*ph.img.height/ph.img.width),[c,x]=cv(W,H),pos=e=>{const b=c.getBoundingClientRect();return[(e.clientX-b.left)*W/b.width,(e.clientY-b.top)*W/b.width]};let dr=null;const loupe=photoLoupe(ph,W);
const draw=()=>{x.drawImage(ph.img,0,0,W,H);x.strokeStyle='#0f0';x.lineWidth=2;if(ph.cx!=null){x.beginPath();x.arc(ph.cx,ph.cy,5,0,7);x.stroke()}if(ph.r){x.beginPath();x.arc(ph.cx,ph.cy,ph.r,0,7);x.stroke();x.globalAlpha=.4;for(let i=1;i<10;i++){x.beginPath();x.arc(ph.cx,ph.cy,ph.r*i/10,0,7);x.stroke()}x.globalAlpha=1}
ph.cand.forEach((d,i)=>{const X=ph.cx+d.px*ph.r,Y=ph.cy+d.py*ph.r;x.lineWidth=2;x.strokeStyle=i==ph.sel?'#fff':'#000';x.fillStyle=d.owned?'#40e89a':'#999';x.beginPath();x.arc(X,Y,6,0,7);x.fill();x.stroke();x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=3;x.font='bold 16px sans-serif';const l=(i+1)+': '+(d.x?'X':d.v||'M');x.strokeText(l,X+8,Y-8);x.fillText(l,X+8,Y-8)})};
c.className=ph.pan?'':'tt';c.style.touchAction=ph.pan?'pan-x pan-y':'none';c.onpointerdown=e=>{if(ph.pan)return;e.preventDefault();c.setPointerCapture(e.pointerId);const[X,Y]=pos(e);
if(ph.step==1){ph.cx=X;ph.cy=Y;ph.step=2;render()}else if(ph.step==2){ph.r=Math.hypot(X-ph.cx,Y-ph.cy);if(ph.r<20)return;ph.step=3;runDet(u,ph,W);render()}
else{let i=ph.cand.findIndex(d=>Math.hypot(ph.cx+d.px*ph.r-X,ph.cy+d.py*ph.r-Y)<18);if(i<0){ph.cand.push({...mk(u,(X-ph.cx)/ph.r,(Y-ph.cy)/ph.r,1),owned:true});i=ph.cand.length-1;vib()}else if(ph.stage!=='assign'){ph.cand[i].owned=!ph.cand[i].owned;ph.sel=i;render();return;}ph.sel=i;if(ph.stage==='assign'){dr=i;loupe.show(ph.cand[i],e.clientX,e.clientY);}draw()}};
c.onpointermove=e=>{if(dr==null)return;const[X,Y]=pos(e);Object.assign(ph.cand[dr],mk(u,(X-ph.cx)/ph.r,(Y-ph.cy)/ph.r,1));loupe.show(ph.cand[dr],e.clientX,e.clientY);draw()};
c.onpointerup=()=>{loupe.hide();if(dr!=null){dr=null;vib();render()}else if(ph.stage!=='assign')render()};c.onpointercancel=()=>{loupe.hide();dr=null;render()};
c.style.width=W+'px';c.style.maxWidth='none';const q=ph.step==3&&ph.q[0];if(q)ph.sel=ph.cand.indexOf(q.d);draw();
const Bt=(l,f,k='s')=>el('button',{class:k,onclick:f},l),st3=ph.step==3,info=st3?`Vorschläge: ${ph.cand.length} · ${u.A} Pfeile je Passe · Passe ${S.p+1}`:['','1/3: Tippe auf die Mitte der Scheibe','2/3: Tippe auf den äußeren Rand (Ring 1)'][ph.step];
/* Rückfrage bei unsicheren Treffern: Ausschnitt vergrößert zeigen */
const ans=f=>()=>{f();ph.q.shift();if(sure(u,ph))return commit(u,ph);render()},del=()=>ph.cand.splice(ph.cand.indexOf(q.d),1),
crop=d=>{const[k,y]=cv(220,220),X=ph.cx+d.px*ph.r,Y=ph.cy+d.py*ph.r,hw=Math.max(.12*ph.r,24),s=ph.img.width/W;y.drawImage(ph.img,(X-hw)*s,(Y-hw)*s,2*hw*s,2*hw*s,0,0,220,220);y.strokeStyle='#f0f';y.lineWidth=2;y.beginPath();y.arc(110,110,8,0,7);y.stroke();return k},
split=n=>ans(()=>{if(n==1)q.d.c=1;else ph.cand.splice(ph.cand.indexOf(q.d),1,...km(q.pts,n).map(z=>mk(u,z[0],z[1],1)))});
box.append(el('div',{},q?el('div',{class:'box',style:'text-align:center'},el('h3',{},q.k=='big'?'Wie viele Pfeile stecken hier?':'Ist das ein Pfeil?'),crop(q.d),el('div',{class:'g'},q.k=='big'?[1,2,3].map(n=>Bt(n+(n>1?' Pfeile':' Pfeil'),split(n))):[Bt('Ja, Pfeil',ans(()=>q.d.c=1)),Bt('Nein',ans(del))]),q.k=='big'?el('div',{class:'g'},Bt('Kein Pfeil',ans(del))):null):null,
el('div',{class:'bar'},info),ph.msg?el('div',{class:'warn'},ph.msg):null,el('div',{class:'g'},Bt('Foto −',()=>{ph.zoom=Math.max(1,(ph.zoom||1)-.5);render()}),Bt('Foto +',()=>{ph.zoom=Math.min(3,(ph.zoom||1)+.5);render()}),Bt(ph.pan?'Punkte bearbeiten':'Foto verschieben',()=>{ph.pan=!ph.pan;render()})),el('div',{style:'overflow:auto;max-height:75vh'},c),st3?el('p',{style:'color:var(--m);font-size:13px'},ph.stage==='assign'?'Eigene Punkte ziehen: Die Lupe zeigt den Einstich. Leere Stelle antippen: eigenen Pfeil ergänzen.':'Eigene Pfeile antippen: Grün = ausgewählt, Grau = nicht ausgewählt. Fehlende eigene Treffer durch Antippen ergänzen.'):null,
st3?el('div',{class:'g'},Bt('Neu erkennen',()=>{runDet(u,ph,W);render()}),Bt('Punkt löschen',()=>{if(ph.sel!=null){const removed=ph.cand.splice(ph.sel,1)[0];ph.q=ph.q.filter(q=>q.d!==removed);ph.sel=null;render()}}),Bt('Neu kalibrieren',()=>{ph.cx=ph.r=null;ph.cand=[];ph.q=[];ph.msg='';ph.step=1;render()})):null,
st3?photoAssignments(u,ph):null,st3&&ph.stage==='assign'?Bt(`✔ Zugeordnete Treffer übernehmen`,()=>commit(u,ph),'p'):null,el('div',{class:'g',style:'margin-top:8px'},Bt('Abbrechen',()=>{S.ph=null;go('live')}))))}
/* Klicker: zählt geschossene Pfeile pro Tag und Uhrzeit */
function clk(d){const k=ld(),r=S.k[k]=S.k[k]||{id:k,n:0,h:Array(24).fill(0),l:[]};if(d>0)for(let i=0;i<d;i++){const h=new Date().getHours();r.n++;r.h[h]++;r.l.push(h)}else if(r.n>0){const h=r.l.pop();r.n--;if(h!=null)r.h[h]--}vib();putK(r);render()}
function bar2(v,l,col,ev=1){const[c,x]=cv(340,170),m=Math.max(1,...v),w=340/v.length;v.forEach((n,i)=>{const h=n/m*110;x.fillStyle=col;x.beginPath();x.roundRect(i*w+2,135-h,w-4,h,4);x.fill();x.fillStyle='#e8f1fa';x.font='10px sans-serif';x.textAlign='center';if(n&&w>14)x.fillText(n,i*w+w/2,130-h);if(i%ev==0)x.fillText(l[i],i*w+w/2,155)});return c}
function klick(box){const r=S.k[ld()]||{n:0},days=Object.values(S.k).filter(x=>x.n>0).sort((a,b)=>b.id.localeCompare(a.id)),back=i=>{const d=new Date();d.setDate(d.getDate()-i);return d},cnt=i=>(S.k[ld(back(i))]||{n:0}).n,sumN=n=>[...Array(n)].reduce((a,_,i)=>a+cnt(i),0),all_=days.reduce((a,x)=>a+x.n,0),hrs=Array(24).fill(0);days.forEach(d=>d.h.forEach((n,i)=>hrs[i]+=n));
box.append(el('div',{class:'box',style:'text-align:center'},el('div',{style:'font-size:80px;font-weight:700;line-height:1'},r.n),el('small',{style:'color:var(--m)'},'Pfeile heute'),el('button',{class:'p',style:'height:28vh;margin-top:12px;font-size:60px',onclick:()=>clk(1)},'+1'),el('div',{class:'g',style:'margin-top:8px'},el('button',{class:'s',onclick:()=>clk(-1)},'−1 (zurück)'),[6,10,12,18].map(n=>el('button',{class:'s',onclick:()=>clk(n)},'+'+n))),el('div',{class:'st',style:'margin-top:4px'},el('input',{type:'number',inputmode:'numeric',min:1,max:500,value:localStorage.kc||24,style:'width:90px',oninput:e=>localStorage.kc=e.target.value}),el('button',{class:'s',style:'flex:1;height:44px',onclick:()=>clk(Math.min(500,Math.max(1,parseInt(localStorage.kc)||1)))},'+ eigene Zahl hinzufügen'))),
el('div',{class:'cards'},[[sumN(7),'7 Tage'],[sumN(30),'30 Tage'],[all_,'Gesamt'],[days.length?Math.round(all_/days.length):0,'Ø pro Tag']].map(([a,b])=>el('div',{class:'card'},el('b',{},a),el('small',{},b)))),
el('div',{class:'box'},el('h3',{},'Pfeile pro Tag (14 Tage)'),bar2([...Array(14)].map((_,i)=>cnt(13-i)),[...Array(14)].map((_,i)=>String(back(13-i).getDate())),'#4a90d9'),el('h3',{},'Pfeile nach Uhrzeit'),bar2(hrs,hrs.map((_,i)=>i),'#ffe629',3)),
el('div',{class:'box'},el('h3',{},'Tage'),days.length?days.slice(0,31).map(d=>el('div',{class:'it'},fmt(d.id),el('b',{},d.n))):'Noch keine Pfeile gezählt.'))}
/* Navigation */
const NAV=[['home','🏠','Start'],['new','➕','Neu'],['live','🎯','Live'],['sheet','📋','Zettel'],['klick','🔢','Klicker'],['trends','📈','Trends'],['material','🏹','Material']];
async function go(v){if(v=='live'&&!S.u)v='new';S.v=v;if((v=='live'||v=='klick')&&'wakeLock'in navigator)try{wl=await navigator.wakeLock.request('screen')}catch{}else if(wl){wl.release();wl=null}render()}
function render(){document.querySelectorAll('body > .keys,body > .live-actions').forEach(n=>n.remove());document.querySelectorAll('.photo-loupe').forEach(n=>n.remove());const a=$('#app');a.className='';a.style.paddingBottom='';a.innerHTML='';$('#hd').textContent={home:'Schusszettel',new:'Neue Einheit',live:S.u?S.u.title:'Live',sheet:'Zusammenfassung',photo:'Foto auswerten',klick:'Klicker',trends:'Trends',material:'Material'}[S.v];
if(tEnd){$('#hd').textContent=tt();$('#hd').style.background=hdc()}else $('#hd').style.background='';
$('#nav').replaceChildren(...NAV.map(([v,i,t])=>el('button',{class:S.v==v?'on':'',onclick:()=>go(v)},el('i',{},i),t)));
({home,new:neu,live:b=>S.u?live(S.u,b):neu(b),sheet:zettel,photo:b=>photo(S.u,b),klick,trends:trendsView,material:materialView})[S.v](a);const controls=a.querySelector('.keys,.live-actions');if(controls){document.body.insertBefore(controls,$('#nav'));a.style.paddingBottom='16px';}}
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState=='visible'&&S.v=='live'&&'wakeLock'in navigator)try{wl=await navigator.wakeLock.request('screen')}catch{}});
if('serviceWorker'in navigator){
 let refreshing=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(!refreshing&&S.v==='home'){refreshing=true;location.reload();}
 });
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
  reg.update().catch(()=>{});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{})});
 }).catch(()=>{});
}
all().then(u=>{S.units=u;return allK()}).then(k=>{k.forEach(r=>S.k[r.id]=r);render()});

['gesturestart','gesturechange','dblclick'].forEach(t=>document.addEventListener(t,e=>e.preventDefault()));

// Follow the visible viewport when iOS restores or resizes a standalone app.
function fitAppViewport(){
 const view=window.visualViewport;
 if(view&&Math.abs(view.scale-1)>.01)return;
 const height=view?view.height:window.innerHeight;
 if(height>0){document.documentElement.style.setProperty('--app-height',height+'px');document.documentElement.style.setProperty('--app-top',(view?view.offsetTop:0)+'px');}
}
fitAppViewport();
window.addEventListener('resize',fitAppViewport);
window.addEventListener('pageshow',fitAppViewport);
window.visualViewport?.addEventListener('resize',fitAppViewport);
window.visualViewport?.addEventListener('scroll',fitAppViewport);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)fitAppViewport()});
