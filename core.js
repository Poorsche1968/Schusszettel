'use strict';
/* Pure calculations, shared by the browser and regression tests. */
const AppCore = (() => {
  function score(x, y, u) {
    const radius = (Number(u.shaftMm) || 4.4) / (u.face * 10);
    const r = Math.max(0, Math.hypot(x, y) - radius);
    const limit = (u.lay || 'single') === 'single' ? 1 : .5;
    if (r > limit + 1e-10) return {v: 0, x: 0};
    let v = Math.min(10, Math.max(1, 11 - Math.ceil(r * 10 - 1e-10)));
    const indoor = u.place === 'Halle';
    if (indoor && u.bow === 'Compound' && r > .05 + 1e-10) v = Math.min(v, 9);
    return {v, x: !indoor && r <= .05 + 1e-10 ? 1 : 0};
  }
  function group(shots, face) {
    const p = shots.filter(s => Number.isFinite(s.px) && Number.isFinite(s.py));
    if (!p.length) return {n: 0, diameter: null, cx: null, cy: null};
    const scale = face / 2;
    let max = 0;
    for (let i = 0; i < p.length; i++) for (let j = 0; j < i; j++)
      max = Math.max(max, Math.hypot(p[i].px-p[j].px, p[i].py-p[j].py));
    return {n: p.length, diameter: p.length > 1 ? max*scale : null,
      cx: p.reduce((a,s)=>a+s.px,0)/p.length*scale,
      cy: p.reduce((a,s)=>a+s.py,0)/p.length*scale};
  }
  function period(date, granularity) {
    if (granularity === 'month') return date.slice(0,7);
    const d = new Date(date+'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - (d.getUTCDay()+6)%7);
    return d.toISOString().slice(0,10);
  }
  function trends(units, granularity) {
    const buckets = new Map();
    for (const u of units) {
      const key=period(u.date,granularity), b=buckets.get(key)||{key,n:0,sum:0,gold:0,individual:0};
      const sh=(u.p||[]).flat();
      if (u.mode <= 2) {b.n+=sh.length;b.sum+=sh.reduce((a,s)=>a+s.v,0);b.individual+=sh.length;b.gold+=sh.filter(s=>s.v>=9).length;}
      else for(const v of u.sums||[]) if(v!==''&&v!=null){b.sum+=Number(v);b.n+=u.A*(u.mode===4?u.P:1);}
      if(b.n)buckets.set(key,b);
    }
    return [...buckets.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(b=>({...b,average:b.sum/b.n,goldRate:b.individual?100*b.gold/b.individual:null}));
  }
  function photoPlan(u, candidates) {
    const p=Array.from({length:u.R*u.P},(_,i)=>(u.p[i]||[]).map(s=>({...s})));
    for(const d of candidates) {
      if(d.owned===false||d.end==='skip')continue;
      if(d.end==null||d.end===''||!Number.isInteger(Number(d.end))||!p[Number(d.end)])throw Error('Jedem Treffer eine Passe zuordnen oder „Nicht übernehmen“ wählen.');
      const end=p[Number(d.end)];
      if(end.length>=u.A)throw Error('Passe '+(Number(d.end)+1)+' ist voll. Bitte Zuordnung korrigieren.');
      if(d.arrowId&&end.some(s=>s.arrowId===d.arrowId))throw Error('Pfeil '+d.arrowId+' ist in dieser Passe bereits vorhanden.');
      end.push({px:d.px,py:d.py,...score(d.px,d.py,u),arrowId:d.arrowId||'',source:'photo'});
    }
    return p;
  }
  function arrowOffsets(units){
    const groups=new Map();
    for(const u of units){
      const set=u.arrowSet||u.equipment?.arrowSet;
      const cohort=[set||('Einheit '+u.id),u.place,u.dist,u.face,u.bow,u.lay||'single',JSON.stringify(u.equipment||null)].join('|');
      for(const end of u.p||[]){
        const positioned=end.filter(s=>s.arrowId&&Number.isFinite(s.px)&&Number.isFinite(s.py));
        if(new Set(positioned.map(s=>s.arrowId)).size!==positioned.length)continue;
        for(const s of positioned){
          const peers=positioned.filter(t=>t.arrowId!==s.arrowId);if(peers.length<2)continue;
          const key=cohort+'|'+s.arrowId,g=groups.get(key)||{id:s.arrowId,label:[set||'Ohne Set (nur diese Einheit)',u.place,u.dist+' m',u.bow].join(' · '),samples:[]};
          g.samples.push({x:(s.px-peers.reduce((a,p)=>a+p.px,0)/peers.length)*u.face/2,y:(s.py-peers.reduce((a,p)=>a+p.py,0)/peers.length)*u.face/2});groups.set(key,g);
        }
      }
    }
    return [...groups.values()].map(g=>{
      const n=g.samples.length,mx=g.samples.reduce((a,p)=>a+p.x,0)/n,my=g.samples.reduce((a,p)=>a+p.y,0)/n;
      const axis=(k,m)=>{const se=n>1?Math.sqrt(g.samples.reduce((a,p)=>a+(p[k]-m)**2,0)/(n-1)/n):Infinity;
        const consistent=g.samples.filter(p=>Math.sign(p[k])===Math.sign(m)).length/n;
        return n>=3&&Math.abs(m)>=1&&Math.abs(m)>2*se&&consistent>=.75;};
      return {...g,n,mx,my,leftRight:axis('x',mx),upDown:axis('y',my)};
    });
  }
  function validateBackup(j){
    const fail=()=>{throw Error('Ungültige Sicherung: Es wurden keine Daten importiert.');};
    if(!j||![1,2,3].includes(j.v)||!Array.isArray(j.units)||!Array.isArray(j.clicks))fail();
    for(const u of j.units){
      if(!u||!((typeof u.id==='number'&&Number.isFinite(u.id))||(typeof u.id==='string'&&u.id.length))||!/^\d{4}-\d{2}-\d{2}$/.test(u.date)||![1,2,3,4].includes(u.mode)||![u.R,u.P,u.A].every(v=>Number.isInteger(v)&&v>0&&v<=100)||!Number.isFinite(u.face)||u.face<=0||!Array.isArray(u.p))fail();
      if(!Number.isFinite(Date.parse(u.date+'T12:00:00Z'))||new Date(u.date+'T12:00:00Z').toISOString().slice(0,10)!==u.date)fail();
      if(u.p.length>u.R*u.P)fail();
      for(const p of u.p){if(p==null)continue;if(!Array.isArray(p)||p.length>u.A)fail();for(const s of p){if(!s||!Number.isInteger(s.v)||s.v<0||s.v>10||![0,1].includes(s.x)||s.x&&s.v!==10)fail();if((s.px!=null||s.py!=null)&&(!Number.isFinite(s.px)||!Number.isFinite(s.py)))fail();}}
      if(u.sums!=null&&(!Array.isArray(u.sums)||u.sums.some(v=>v!==''&&v!=null&&(!Number.isFinite(+v)||+v<0||+v>u.A*10*(u.mode===4?u.P:1)))))fail();
    }
    for(const c of j.clicks)if(!c||typeof c.id!=='string'||!Number.isInteger(c.n)||c.n<0||!Array.isArray(c.h)||c.h.length!==24||!c.h.every(n=>Number.isInteger(n)&&n>=0)||!Array.isArray(c.l)||!c.l.every(h=>Number.isInteger(h)&&h>=0&&h<24))fail();
    if(j.material&&(!Array.isArray(j.material.equipment)||!Array.isArray(j.material.sights)||[...j.material.equipment,...j.material.sights].some(e=>!e||typeof e.id!=='string')))fail();
    return j;
  }
  return {score,group,trends,photoPlan,period,arrowOffsets,validateBackup};
})();
if(typeof module!=='undefined')module.exports=AppCore;
