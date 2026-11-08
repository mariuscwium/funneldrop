const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const WORDS=/\b(good|evil|lawful|chaotic|alignment|ethic\w*)\b|dark pattern/i;
const EPS=1e-9;

const a=load();
const N=a.g('JSON.parse(JSON.stringify(NODES.map(({adj,...n})=>n)))');
const ADJ=Object.fromEntries(a.g('NODES.map(n=>[n.id,n.adj])'));
const IX=Object.fromEntries(N.map(n=>[n.id,n]));
const key=n=>Array.isArray(n.area);
const wedge=w=>N.filter(n=>n.area===w);
const forks=()=>{const f={};for(const n of N)if(n.fork)(f[n.fork]||=[]).push(n);return f};
const headroom=b=>a.g(`rateCap(${b})-RATES[${b}].base`);

test('size, unique ids, links resolve and are two-way', () => {
  assert.ok(N.length>=75&&N.length<=95,`${N.length} nodes`);
  assert.equal(new Set(N.map(n=>n.id)).size,N.length);
  for(const n of N)for(const l of n.links)assert.ok(IX[l],`${n.id} links to missing ${l}`);
  for(const id in ADJ)for(const m of ADJ[id])assert.ok(ADJ[m].includes(id),`${id}-${m} one-way`);
});

test('every node is reachable from start, ignoring forks', () => {
  const seen=new Set(['start']),q=['start'];
  while(q.length){for(const m of ADJ[q.shift()])if(!seen.has(m)){seen.add(m);q.push(m)}}
  assert.deepEqual(N.filter(n=>!seen.has(n.id)).map(n=>n.id),[]);
});

test('each wedge: fork-free ring 1 seed, at least 3 forks at ring 2+, 2-3 options each', () => {
  const F=forks();
  for(const o of Object.values(F)){assert.ok(o.length>=2&&o.length<=3,o[0].fork);for(const n of o)assert.ok(n.ring>=2,n.id)}
  for(let w=0;w<6;w++){
    const seeds=wedge(w).filter(n=>n.ring===1);assert.ok(seeds.length>=1);for(const s of seeds)assert.equal(s.fork,null,s.id);
    const fs=new Set(wedge(w).filter(n=>n.fork).map(n=>n.fork));assert.ok(fs.size>=3,`wedge ${w}: ${fs.size} forks`);
    for(const f of fs)assert.ok(F[f].every(n=>n.area===w),`fork ${f} spans wedges`);
  }
});

test('fork options differ in effect keys and in alignment by at least .5 on one axis', () => {
  for(const [f,o] of Object.entries(forks()))for(let i=0;i<o.length;i++)for(let j=i+1;j<o.length;j++){
    const ka=Object.keys(o[i].fx).sort().join(),kb=Object.keys(o[j].fx).sort().join();
    assert.notEqual(ka,kb,`${f}: ${o[i].id} and ${o[j].id} share keys`);
    const d=Math.max(Math.abs(o[i].al[0]-o[j].al[0]),Math.abs(o[i].al[1]-o[j].al[1]));
    assert.ok(d>=.5-EPS,`${f}: ${o[i].id} vs ${o[j].id} al differ by ${d}`);
  }
});

test('six keystones, one per neighbouring pair, ring 4+, linked into both wedges', () => {
  const ks=N.filter(key);assert.equal(ks.length,6);
  const pairs=ks.map(k=>[...k.area].sort().join()).sort();
  assert.deepEqual(pairs,['0,1','0,5','1,2','2,3','3,4','4,5']);
  for(const k of ks){assert.ok(k.ring>=4,k.id);assert.equal(k.pts,6,k.id);
    for(const w of k.area)assert.ok(ADJ[k.id].some(m=>IX[m].area===w),`${k.id} not linked into wedge ${w}`)}
});

test('each wedge has exactly one repeatable, at its outermost ring', () => {
  for(let w=0;w<6;w++){const reps=N.filter(n=>n.rep);const mine=reps.filter(n=>n.area===w);
    assert.equal(mine.length,1,`wedge ${w}`);assert.equal(mine[0].ring,Math.max(...wedge(w).map(n=>n.ring)),mine[0].id);assert.equal(mine[0].pts,4)}
  assert.ok(N.filter(n=>n.rep).every(n=>!key(n)));
});

test('costs follow the ring: points [0..6], cash by ring, Expansion 25x', () => {
  const CASH=[0,2e3,5e3,12.5e3,3e4,7.5e4,1.8e5];
  for(const n of N){if(n.ring===0)continue;
    assert.equal(n.pts,key(n)?6:n.rep?4:n.ring,n.id);
    assert.equal(n.cash,CASH[n.ring]*(n.area===5?25:1),n.id)}
});

test('alignment cells each hold 4+ nodes; 10+ effect keys used', () => {
  const cell=v=>v<-.33?0:v>.33?2:1,c=Array(9).fill(0);
  for(const n of N)if(n.ring)c[cell(n.al[0])*3+cell(n.al[1])]++;
  assert.ok(c.every(x=>x>=4),JSON.stringify(c));
  const keys=new Set(N.flatMap(n=>Object.keys(n.fx)));assert.ok(keys.size>=10,[...keys].join());
  const FXK=a.g('FX_KEYS');for(const k of keys)assert.ok(FXK.includes(k),k);
});

test('a deep build can reach each rate cap; no node past the seeds adds over a quarter of the headroom', () => {
  for(let b=0;b<6;b++){const k='r'+b,h=headroom(b);let sum=0;
    for(const n of N)if(!n.fork)sum+=Math.max(0,n.fx[k]||0);
    for(const o of Object.values(forks()))sum+=Math.max(0,...o.map(n=>n.fx[k]||0));
    assert.ok(sum>=h-EPS,`board ${b}: ${sum.toFixed(3)} < ${h.toFixed(3)}`);
    for(const n of N)if(n.ring>1)assert.ok((n.fx[k]||0)<=h/4+EPS,`${n.id} adds ${n.fx[k]} to board ${b}, over ${(h/4).toFixed(3)}`);
  }
});

test('layout: no overlapping nodes, all inside the outer ring', () => {
  const P=N.map(n=>({n,p:a.g(`nodePos(nodeOf(${JSON.stringify(n.id)}))`),r:a.g(`nodeR(nodeOf(${JSON.stringify(n.id)}))`)})),R=a.g('RING_R'),max=Math.max(...N.map(n=>n.ring));
  for(let i=0;i<P.length;i++){assert.ok(Math.hypot(P[i].p.x,P[i].p.y)<=R*(max+1),P[i].n.id);
    for(let j=i+1;j<P.length;j++){const d=Math.hypot(P[i].p.x-P[j].p.x,P[i].p.y-P[j].p.y);
      assert.ok(d>=2*Math.max(P[i].r,P[j].r),`${P[i].n.id} and ${P[j].n.id} are ${d.toFixed(1)} apart`)}}
});

test('names and descriptions: no alignment words; each desc states every effect with its number', () => {
  for(const n of N){assert.ok(!WORDS.test(n.name+' '+n.desc),n.id);if(!n.ring)continue;
    assert.ok(n.name.length<=26,`${n.id} name too long for a label`);
    for(const [k,v] of Object.entries(n.fx)){const x=String(Math.round(Math.abs(v)*1000)/10),unit=/^r\d$|evGood/.test(k)?' point':'%';
      assert.ok(n.desc.includes(x+unit),`${n.id}: desc lacks ${x}${unit} for ${k}`)}}
});

test('multipliers stay positive in the most extreme fork-consistent builds', () => {
  const b=load();
  const MULT=['churn','cts','csm','adCost','adReach','refSize','custRef','seo','rp'];
  for(const k of [...MULT,'priceTol'])for(const sign of [-1,1]){
    // Every non-fork node, plus the fork option that pushes k furthest in this direction; repeatables 100 times.
    const pick=[];for(const n of N)if(n.ring&&!n.fork)pick.push(n.id);
    for(const o of Object.values(forks()))pick.push(o.reduce((x,y)=>sign*(y.fx[k]||0)>sign*(x.fx[k]||0)?y:x).id);
    const own={start:1};for(const id of pick)own[id]=IX[id].rep?100:1;
    b.g(`owned=${JSON.stringify(own)};peak=1e9;refx()`);
    for(const m of MULT)assert.ok(1+b.g(`FX.${m}`)>0,`${m} after pushing ${k} ${sign}`);
    assert.ok(b.g('FX.priceTol')>=0&&b.g('FX.priceTol')<=.8,'priceTol in range');
    assert.ok(b.g('churn')>0&&b.g('cts()')>0&&b.g('csmCovers()')>0&&b.g('custRefer()')>0&&b.g('reachK()')>0&&b.g('adCost(CHANNELS[0])')>0&&b.g('rpIncome()')>0);
  }
});

test('esc escapes double quotes for attributes', () => {
  assert.equal(a.g(`esc('a "b" <c>')`),'a &quot;b&quot; &lt;c&gt;');
});

test('a repeatable ships again with a natural message', () => {
  const b=load();b.g('randomEvent=()=>{};annualReview=()=>{};__m=[];say=t=>__m.push(t)');
  const rep=N.find(n=>n.rep&&n.area===1).id;
  // Walk inward links to the repeatable and own everything on the way.
  const own={start:1};const seen=new Set();const walk=id=>{if(seen.has(id))return;seen.add(id);own[id]=1;for(const l of IX[id].links)walk(l)};for(const l of IX[rep].links)walk(l);
  b.g(`owned=${JSON.stringify(own)};refx();rp=99;cash=1e12`);
  assert.equal(b.g(`buyNode(${JSON.stringify(rep)})`),true);assert.equal(b.g(`buyNode(${JSON.stringify(rep)})`),true);assert.equal(b.g(`buyNode(${JSON.stringify(rep)})`),true);
  const m=b.g('__m.join("|")');
  assert.match(m,/shipped:/);assert.match(m,/shipped for the 2nd time:/);assert.match(m,/shipped for the 3rd time:/);
});

// Owns every node, taking at each fork the option that pushes axis ax furthest in direction sign (or, with plainOnly, no fork options at all).
function build(b,ax,sign,plainOnly){const own={start:1};for(const n of N)if(n.ring&&!n.fork)own[n.id]=1;
  if(!plainOnly)for(const o of Object.values(forks()))own[o.reduce((x,y)=>sign*y.al[ax]>sign*x.al[ax]?y:x).id]=1;
  b.g(`peak=2e6;owned=${JSON.stringify(own)};refx()`);return b.g('companyAl()')}

test('fork choices set the company’s character in a full build', () => {
  const b=load();
  for(const ax of [0,1]){
    assert.ok(build(b,ax,-1)[ax]<=-.15,`axis ${ax} lowest: ${build(b,ax,-1)[ax]}`);
    assert.ok(build(b,ax,1)[ax]>=.15,`axis ${ax} highest: ${build(b,ax,1)[ax]}`);
  }
  const p=build(b,0,1,true);assert.ok(Math.abs(p[0])<.15&&Math.abs(p[1])<.15,`plain nodes only: ${p}`);
  for(const n of N)if(n.ring&&!n.fork)assert.ok(Math.abs(n.al[0])<=.2&&Math.abs(n.al[1])<=.2,`${n.id} plain node al ${n.al}`);
});

test('a shallow growth-hacker path crosses the bad-event gate', () => {
  const b=load();
  b.g(`owned={start:1,acq1:1,acq_lp:1,acq_reviews:1,ref1:1,ref_contacts:1,act1:1,act_nag:1};refx()`);
  assert.ok(b.g('companyAl()[0]')<=-.15,String(b.g('companyAl()[0]')));
  b.g('paying=100');assert.ok(b.g('EVENTS.some(e=>e.name==="Regulator fine"&&e.when())'));
});
