const src=require('fs').readFileSync(__dirname+'/sim.js','utf8').split('\n').slice(0,9).join('\n');eval(src);
const stage=+process.argv[2];
const centers=[[180],[91,269],[82,278],[180],[180]];
const base=[16,72,80,48,116];
const mk=(s,w)=>centers[s].map(c=>[c-w/2,c+w/2]);
// incoming distribution for stage via base chain
let xs=null;const N0=6000;
for(let b=0;b<stage;b++){const hits=[],all=[];for(let n=0;n<N0;n++){const x0=xs?xs[Math.random()*xs.length|0]:12+Math.random()*336;const r=drop(x0,mk(b,base[b]));all.push(r.x);if(r.hit)hits.push(r.x)}xs=b<3?hits:all}
const widths=process.argv.slice(3).map(Number);
for(const w of widths){let h=0;const N=5000;for(let n=0;n<N;n++){const x0=xs?xs[Math.random()*xs.length|0]:12+Math.random()*336;if(drop(x0,mk(stage,w)).hit)h++}console.log(stage,w,(h/N*100).toFixed(1))}
