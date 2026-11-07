const fs=require('fs'),vm=require('vm'),path=require('path');
const FILE=path.join(__dirname,'..','Funnel Drop.html');
function stub(){const v={},f=function(){return stub()};return new Proxy(f,{get(t,k){if(k===Symbol.toPrimitive)return()=>0;if(k==='then'||k===Symbol.iterator)return undefined;if(!(k in v))v[k]=stub();return v[k]},set(t,k,x){v[k]=x;return true},apply(){return stub()},construct(){return stub()}})}
function load(opts={}){
  const html=fs.readFileSync(FILE,'utf8'),scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const store=new Map(),els=new Map(),el=id=>{if(!els.has(id))els.set(id,stub());return els.get(id)};
  el('ev').open=false;el('sum').open=false;
  if(opts.save)store.set('funnel-drop-save-v1',JSON.stringify(opts.save));
  let now=0;
  const ctx={console,Math,JSON,Date,Object,Array,Number,String,Map,Set,
    setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,performance:{now:()=>now},requestAnimationFrame:()=>0,
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
    matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},confirm:()=>false,devicePixelRatio:1,
    AudioContext:function(){return stub()},getComputedStyle:()=>({getPropertyValue:()=>'#000000'})};
  ctx.document={documentElement:{dataset:{}},getElementById:el,querySelector:()=>stub(),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){}};
  ctx.window=ctx;vm.createContext(ctx);
  for(const s of scripts)vm.runInContext(s,ctx,{filename:FILE});
  const g=e=>vm.runInContext(e,ctx);
  const frames=(ms,step=16)=>{for(let t=0;t<ms;t+=step){now+=step;g('loop(performance.now())')}};
  return {g,frames,months:n=>frames(n*10000),store,el};
}
module.exports={load};
