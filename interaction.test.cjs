const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(__dirname+'/app.js','utf8'),extra=fs.readFileSync(__dirname+'/extras.js','utf8');
(async()=>{
 const localStorage={bk:123},S={units:[],k:{}},material={equipment:[],sights:[]};let renders=0,mode='cancel',saved;
 const context=vm.createContext({localStorage,S,material,Date,JSON,today:()=> '2026-10-09',render:()=>renders++,alert:()=>{},dl:async(n,t)=>{if(mode==='cancel')throw Object.assign(Error(),{name:'AbortError'});saved=JSON.parse(t)}});
 vm.runInContext(app.match(/const exp=async\(\)=>\{.*?\};/)[0]+';this.exportBackup=exp;',context);
 await context.exportBackup();assert.equal(localStorage.bk,123);assert.equal(renders,0);
 mode='ok';await context.exportBackup();assert.ok(localStorage.bk>123);assert.equal(saved.v,3);assert.deepEqual(saved.material,material);assert.equal(renders,1);
 const draws=[],ctx=new Proxy({drawImage:(...args)=>draws.push(args)}, {get:(o,k)=>o[k]||(()=>{})});
 const body={append:n=>n.isConnected=true};
 const el=(tag,p={})=>({tag,...p,style:{},append(){},getContext:()=>ctx,remove(){this.isConnected=false}});
 const c=vm.createContext({el,document:{body},innerWidth:390,keyOf:d=>d.v});
 vm.runInContext(extra.slice(extra.indexOf('function photoLoupe'),extra.indexOf('function backupPanel'))+';this.makeLoupe=photoLoupe;',c);
 const img={width:2000,height:2000},loupe=c.makeLoupe({img,cx:200,cy:200,r:150},400);
 loupe.show({px:.2,py:0,v:9},100,400);assert.equal(draws[0][1]+draws[0][3]/2,1150);assert.equal(draws[0][3],300);loupe.hide();
 console.log('Backup cancellation/success and 3x loupe source coordinates passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
