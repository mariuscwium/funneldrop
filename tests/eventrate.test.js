const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

const count=(from,months,always)=>{const a=load({seed:7});
  a.g(`${always?'Math.random=()=>0;':''}__n=0;randomEvent=()=>__n++;annualReview=()=>{};expCheck=()=>{};juniorIncidents=()=>{};rollRisk=()=>{};ads=1;month=${from}`);
  for(let i=0;i<months;i++){a.g('eventT=MONTH-.001');a.frames(16)}return a.g('__n')};

test('no random events in the first year', () => {
  assert.equal(count(0,11,true),0);
  assert.ok(count(12,2,true)>0,'and they start in month 12');
});

test('after the first year, events come about 30% less often than the old 15% a month', () => {
  const {g}=load();assert.equal(g('EVENT_START'),12);assert.ok(Math.abs(g('EVENT_CHANCE')-.105)<1e-9);
  const n=count(12,1000),rate=n/1000;
  assert.ok(rate>.08&&rate<.13,String(rate));
});
