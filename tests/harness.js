const fs=require('fs'),vm=require('vm'),path=require('path');
const FILE=path.join(__dirname,'..','Funnel Drop.html');
function stub(){const v={},f=function(){return stub()};return new Proxy(f,{get(t,k){if(k===Symbol.toPrimitive)return()=>0;if(k==='then'||k===Symbol.iterator)return undefined;if(!(k in v))v[k]=stub();return v[k]},set(t,k,x){v[k]=x;return true},apply(){return stub()},construct(){return stub()}})}
function load(opts={}){
  const html=fs.readFileSync(FILE,'utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const store=new Map(),els=new Map(),el=id=>{if(!els.has(id))els.set(id,stub());return els.get(id)};
  // opts.dialogs: showModal/close toggle .open, so an open dialog pauses loop. Off by default: milestones and events would pause other tests.
  for(const id of ['ev','sum','tree']){const d=el(id);d.open=false;if(opts.dialogs){d.showModal=()=>{d.open=true};d.close=()=>{d.open=false}}}
  if(opts.save)store.set('funnel-drop-save-v1',JSON.stringify(opts.save));
  let now=0;
  // opts.seed: a seeded PRNG (mulberry32) as the game's Math.random, inside the vm only. For statistical tests that would otherwise flake.
  let M=Math;if(opts.seed!=null){let a=opts.seed>>>0;M=Object.create(Math);M.random=()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const ctx={console,Math:M,JSON,Date,Object,Array,Number,String,Map,Set,
    setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,performance:{now:()=>now},requestAnimationFrame:()=>0,
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},confirm:()=>false,devicePixelRatio:1,
    AudioContext:function(){return stub()},Path2D:function(){return stub()},getComputedStyle:()=>({getPropertyValue:()=>'#000000'})};
  ctx.document={hasFocus:()=>true,documentElement:{dataset:{}},getElementById:el,querySelector:()=>stub(),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){}};
  ctx.window=ctx;vm.createContext(ctx);
  for(const s of scripts)vm.runInContext(s,ctx,{filename:FILE});
  const g=e=>vm.runInContext(e,ctx);
  const frames=(ms,step=16)=>{for(let t=0;t<ms;t+=step){now+=step;g('loop(performance.now())')}};
  return {g,frames,months:n=>frames(n*10000),store,el};
}
module.exports={load};
