const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

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
  const t=process.hrtime.bigint();
  frames(160);
  const ms=Number(process.hrtime.bigint()-t)/1e6;
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
  const {g,months}=load();
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
  const {g,frames}=load();
  g('randomEvent=()=>{};peak=2e9;month=20;eventT=0;subs={"49:0":120000,"49:1":40000,"49:2":10000};paying=170000;seoLvl=3');
  g('staff=[];for(let i=0;i<2000;i++)staff.push({role:i<1200?"csm":i<1900?"mm":ROLES[i%5].id,hired:i%30,pay:6000,skill:1});restaff();BOARDS.forEach((_,b)=>zone(b))');
  frames(1600); // warm up the JIT and fill the ball cap
  const t=process.hrtime.bigint();
  frames(160);
  const ms=Number(process.hrtime.bigint()-t)/1e6;
  assert.ok(ms<50,'took '+ms+' ms');
});
