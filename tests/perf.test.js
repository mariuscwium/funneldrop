const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
// CPU time (user+system) of fn in ms, best of 5. Wall-clock flakes when test files run in parallel.
const cpuMs=(fn,n=5)=>{let best=Infinity;for(let i=0;i<n;i++){const c=process.cpuUsage();fn();const d=process.cpuUsage(c);best=Math.min(best,(d.user+d.system)/1000)}return best};

test('binom mean', () => {
  const {g}=load();
  const s=g('let t=0;for(let i=0;i<10000;i++)t+=binom(1000,0.06);t/10000');
  assert.ok(Math.abs(s-60)<=1,'mean '+s);
});

test('binom edges', () => {
  const {g}=load();
  assert.equal(g('binom(0,.5)'),0);
  assert.equal(g('binom(10,0)'),0);
  assert.equal(g('binom(10,1)'),10);
  assert.equal(g('binom(100000,1)'),100000);
  assert.equal(g('binom(100000,0)'),0);
});

test('170k customers frame', () => {
  const {g,frames}=load();
  g('subs={49:170000};paying=170000');
  frames(1600); // warm up the JIT and fill the ball cap
  const ms=cpuMs(()=>frames(160));
  assert.ok(ms<50,'took '+ms+' ms');
});

test('churn rate holds', () => {
  const {g,months}=load();
  g('randomEvent=()=>{};churn=0.06;staff=[];subs={49:100000};paying=100000');
  months(1);
  const p=g('paying');
  assert.ok(Math.abs(p-94000)<=600,'paying '+p);
});

for(const [n,p,exp,tol] of [[1000,1.7e-5,0.017,.15],[500,1e-4,0.05,.10],[2000,1e-4,0.2,.10]])
  test(`binom small n*p mean (${n}, ${p})`, () => {
    const {g}=load();
    const m=g(`let t=0;for(let i=0;i<200000;i++)t+=binom(${n},${p});t/200000`);
    assert.ok(Math.abs(m-exp)<=exp*tol,`mean ${m} vs ${exp}`);
  });

test('small customer base churns at 6%/month', () => {
  const {g,months}=load({seed:1});
  g('randomEvent=()=>{};churn=0.06;staff=[];subs={49:500};paying=500');
  months(6);
  const p=g('paying');
  assert.ok(Math.abs(p-500*Math.pow(0.94,6))<=25,'paying '+p);
});

test('customer referral rate', () => {
  const {g,months}=load();
  g('randomEvent=()=>{};churn=0;staff=[];subs={49:1000};paying=1000;var refCalls=0;{const o=refer;refer=function(...a){refCalls++;return o.apply(this,a)}}');
  months(3);
  const c=g('refCalls');
  assert.ok(Math.abs(c-30)<=15,'refer calls '+c);
});

test('2,000 staff and 170k customers frame', () => {
  // Two games with the same customers and the same 700 marketing managers (so the same visitors), one with 1,300 more staff.
  // Each frame reads strength() on every landing, so without the staff cache the bigger team's frames cost about 1.6× as much (measured); with it, 1.0-1.3×.
  // The ball cap is pinned at 640, where it sat when this test measured, because adaptCap grows a full cap while frames keep up.
  const mk=all=>{const a=load();
    a.g('randomEvent=()=>{};annualReview=()=>{};cash=1e12;peak=2e9;month=20;eventT=0;subs={"49:0":120000,"49:1":40000,"49:2":10000};paying=170000;seoLvl=3');
    a.g(`staff=[];for(let i=0;i<2000;i++)if(${all}||(i>=1200&&i<1900))staff.push({role:i<1200?"csm":i<1900?"mm":ROLES[i%5].id,hired:i%30,pay:6000,skill:1});restaff();BOARDS.forEach((_,b)=>zone(b))`);
    a.g('ballCap=640;adaptCap=()=>{}');a.frames(1600); // warm up the JIT and fill the ball cap
    assert.ok(a.g('balls.length')>=600,'ball cap filled: '+a.g('balls.length'));return a};
  const big=mk(true),small=mk(false);
  // Interleaved best of 9, so load from the other test files running in parallel hits both alike. Alone a sample takes about 25 ms;
  // under the parallel suite up to about 65 ms, so the absolute limit only catches gross regressions and the ratio does the real work.
  let b=Infinity,s=Infinity;for(let i=0;i<9;i++){b=Math.min(b,cpuMs(()=>big.frames(160),1));s=Math.min(s,cpuMs(()=>small.frames(160),1))}
  assert.equal(big.g('staff.length'),2000);
  assert.ok(b<1.4*s,`2,000 staff took ${b} ms against ${s} ms for 700`);
  assert.ok(b<100,'took '+b+' ms');
});

test('month rollover with Expansion open at 170k customers', () => {
  const {g,frames}=load();
  g('randomEvent=()=>{};annualReview=()=>{};peak=2e9;month=20;eventT=0;subs={"49:0":120000,"49:1":40000,"49:2":10000};paying=170000');
  frames(1600); // warm up the JIT and fill the ball cap
  const ms=cpuMs(()=>{g('eventT=MONTH-.001');frames(16)});
  assert.ok(g('month')>=25,'rollovers ran');
  assert.ok(ms<50,'took '+ms+' ms');
});

test('expCheck at 170k customers settles in bulk', () => {
  // Before bulk settlement this took 23-40 ms of CPU; bulk is well under 1 ms.
  const {g,frames}=load();
  g('randomEvent=()=>{};annualReview=()=>{};peak=2e9;subs={"49:0":120000,"49:1":40000,"49:2":10000};paying=170000');
  frames(1600);
  const ms=cpuMs(()=>g('expCheck()'));
  assert.ok(ms<5,'took '+ms+' ms');
});

test('ball paths are unchanged (slot widths are tuned against them)', () => {
  // Seeded run; the numbers were recorded before physics only tested nearby peg rows. If physics changes on purpose, re-tune the slots and update this.
  const {g}=load({seed:42});
  const r=g(`peak=2e6;subs={'49:0':50,'49:1':20};paying=70;balls=[];for(let i=0;i<300;i++){const b=i%6,o=enter(b);if(b===5)o.sub=i%2?'49:0':'49:1';balls.push(o)}
let h=0;for(let f=0;f<2000;f++){for(let k=0;k<3;k++)physics(1/180);for(const o of balls)h=(h*31+Math.round(o.x*1e6)+Math.round(o.y*1e6))%1e15;if(f%10===0)for(let i=0;i<5;i++)balls.push(enter(i%5))}
JSON.stringify({h,out,into,n:balls.length})`);
  assert.equal(r,'{"h":583237158630220,"out":[16,115,161,48,210,6],"into":[250,266,365,411,645,50],"n":69}');
});

test('ball cap adapts to frame time', () => {
  const {g}=load();
  const win=(ms,full)=>g(`${full?'balls=Array(ballCap).fill({b:9});':'balls=[];'}for(let i=0;i<30;i++)adaptCap(${ms});ballCap`);
  assert.equal(g('ballCap'),400);
  assert.equal(win(16.7,false),400,'no growth while the cap is not full');
  assert.equal(win(16.7,true),440);
  for(let i=0;i<60;i++)win(16.7,true);
  assert.equal(g('ballCap'),g('BALL_MAX'),'grows to BALL_MAX');
  assert.equal(win(25,true),4800,'slow frames shrink it by a fifth');
  assert.ok(g('capCeil')<=5400);
  for(let i=0;i<10;i++)win(16.7,true);
  assert.ok(g('ballCap')<=g('capCeil'),'stays under the ceiling');
  for(let i=0;i<30;i++)win(40,true);
  assert.equal(g('ballCap'),g('BALL_MIN'),'never below BALL_MIN');
  assert.equal(win(500,true),400,'ignores pauses over 100 ms');
});
