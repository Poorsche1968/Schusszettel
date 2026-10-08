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
      if(d.end==='skip')continue;
      if(d.end==null||d.end===''||!Number.isInteger(Number(d.end))||!p[Number(d.end)])throw Error('Jedem Treffer eine Passe zuordnen oder „Nicht übernehmen“ wählen.');
      const end=p[Number(d.end)];
      if(end.length>=u.A)throw Error('Passe '+(Number(d.end)+1)+' ist voll. Bitte Zuordnung korrigieren.');
      if(d.arrowId&&end.some(s=>s.arrowId===d.arrowId))throw Error('Pfeil '+d.arrowId+' ist in dieser Passe bereits vorhanden.');
      end.push({px:d.px,py:d.py,...score(d.px,d.py,u),arrowId:d.arrowId||'',source:'photo'});
    }
    return p;
  }
  return {score,group,trends,photoPlan,period};
})();
if(typeof module!=='undefined')module.exports=AppCore;
