'use strict';
/* Bright compact nocks seed a directional shaft search. No score is accepted
   automatically: a nock is not an impact, and crossings can hide a shaft end. */
function detectNocks(data,w,h,cx,cy,r){
  const mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),seeds=[];
  const light=i=>.299*data[4*i]+.587*data[4*i+1]+.114*data[4*i+2];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    if(Math.hypot(x-cx,y-cy)>r*1.06)continue;
    const i=y*w+x,R=data[i*4],G=data[i*4+1],B=data[i*4+2],hi=Math.max(R,G,B),lo=Math.min(R,G,B);
    // Neon green and blue nocks. Ring-sized components are removed below.
    mask[i]=hi>180&&hi-lo>100&&((G>R*1.12&&G>B*1.2)||(B>R*1.5&&B>G*1.1))?1:0;
  }
  for(let i=0;i<mask.length;i++)if(mask[i]&&!seen[i]){
    const stack=[i],p=[];seen[i]=1;
    while(stack.length){const q=stack.pop();p.push(q);const x=q%w,y=Math.floor(q/w);for(const [a,b] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(a>=0&&b>=0&&a<w&&b<h){const z=b*w+a;if(mask[z]&&!seen[z]){seen[z]=1;stack.push(z)}}}
    if(p.length<8||p.length>Math.max(160,r*r*.003))continue;
    const xs=p.map(q=>q%w),ys=p.map(q=>Math.floor(q/w));const bw=Math.max(...xs)-Math.min(...xs)+1,bh=Math.max(...ys)-Math.min(...ys)+1;
    if(Math.max(bw,bh)>r*.09||Math.max(bw,bh)/Math.min(bw,bh)>3)continue;
    seeds.push({x:xs.reduce((a,b)=>a+b,0)/p.length,y:ys.reduce((a,b)=>a+b,0)/p.length,size:Math.max(bw,bh)});
  }
  const L=(x,y)=>{x=Math.round(x);y=Math.round(y);return x>=0&&y>=0&&x<w&&y<h?light(y*w+x):255};
  const hits=[];
  for(const seed of seeds){
    let best=null;
    for(let angle=0;angle<360;angle+=2){
      const a=angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a);let last=0,run=0,gap=0,support=0;
      for(let t=Math.max(3,seed.size*.4);t<r*.85;t+=1.5){
        const x=seed.x+t*dx,y=seed.y+t*dy;
        const center=Math.min(L(x,y),L(x-dy,y+dx),L(x+dy,y-dx));
        const side=(L(x-dy*6,y+dx*6)+L(x+dy*6,y-dx*6))/2;
        const ok=center<140&&side-center>20;
        if(ok){support++;run++;gap=0;last=t;}else {gap++;if(gap>8&&support>5)break;if(t>seed.size+24&&support<3)break;}
      }
      if(support<10||last<Math.max(18,r*.045))continue;
      const merit=support-(last/1.5-support)*.5;
      if(!best||merit>best.merit)best={x:seed.x+dx*last,y:seed.y+dy*last,merit,last};
    }
    const p=best||seed;
    if(Math.hypot(p.x-cx,p.y-cy)>r*1.03)continue;
    if(hits.some(q=>Math.hypot(q.px-(p.x-cx)/r,q.py-(p.y-cy)/r)<.015))continue;
    hits.push({px:(p.x-cx)/r,py:(p.y-cy)/r,k:'small',pts:null,s:best?.last||0});
  }
  return {hits,warn:'Vorschläge anhand farbiger Nocken. Jeden Punkt zum tatsächlichen Einstich verschieben; verdeckte oder andersfarbige Pfeile ergänzen.'};
}
