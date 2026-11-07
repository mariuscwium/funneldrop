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
  g('randomEvent=()=>{};churn=0.06;csm=0;subs={49:100000};paying=100000');
  months(1);
  const p=g('paying');
  assert.ok(Math.abs(p-94000)<=600,'paying '+p);
});
