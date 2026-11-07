const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

function base(){
  const t=load();
  t.g('randomEvent=()=>{};churn=0;subs={};paying=0;addSub(49,0,100);paying=100;cash=0');
  return t;
}

test('cost to serve per month', () => {
  const {g,months}=base();
  months(1);
  const want=4900*0.78,c=g('cash');
  assert.ok(Math.abs(c-want)/want<0.01,`cash ${c} vs ${want}`);
});

test('ledger records a month', () => {
  const {g,months}=base();
  months(1);
  assert.equal(g('ledger.length'),1);
  const o=g('ledger[0].out');
  assert.ok(Math.abs(o-1078)<30,`out ${o}`);
  assert.ok(Math.abs(g('ledger[0].rev')-4900)<100);
  assert.equal(g('ledger[0].mrr'),4900);
});

test('upgrade counts as spending', () => {
  const {g,months}=base();
  g('cash=5000;buyUpg("acq")');
  months(1);
  assert.ok(g('ledger[0].out')>=2000);
});

test('margin3 null with no revenue', () => {
  const {g}=load();
  assert.equal(g('margin3()'),null);
});

test('margin3 over last 3 entries', () => {
  const {g}=load();
  g('ledger=[{rev:1000,out:5000,mrr:0},{rev:100,out:50,mrr:0},{rev:100,out:50,mrr:0},{rev:200,out:100,mrr:0}]');
  assert.ok(Math.abs(g('margin3()')-0.5)<1e-9);
});

test('overdraft kept', () => {
  const t=base();
  t.g('cash=-500');
  let jumped=false,prev=t.g('cash');
  for(let i=0;i<625;i++){t.frames(16);const c=t.g('cash');if(prev<0&&c===0)jumped=true;prev=c}
  assert.equal(jumped,false);
  assert.ok(t.g('cash')<4900*0.78);
});

test('LTV uses gross margin', () => {
  const {g,frames,el}=load();
  g('randomEvent=()=>{}');
  frames(100);
  assert.equal(el('eLtv').textContent,g('fmt(49*0.78/0.06)'));
  assert.equal(el('eLtv').textContent,'$637');
});

test('health counts cost to serve', () => {
  const {g}=load();
  g('growth=0;subs={};paying=0;addSub(49,0,20);paying=20;cash=0');
  assert.equal(g('MRR()'),980);
  // net positive either way; push it so only margin tips the sign
  g('staff=[];LOANS.forEach(l=>l.bal=0)');
  const pos=g('health()');
  g('subs={};paying=0;addSub(49,0,1000);paying=1000;');
  // MRR 49000, margin 0.78: use a loan payment between MRR*0.78 and MRR
  g('LOANS[0].bal=1;LOANS[0].pay=MRR()*0.9');
  assert.equal(g('health()'),-0.5);
  assert.ok(pos>0);
});

test('COST_TO_SERVE value and spendCash', () => {
  const {g}=load();
  assert.equal(g('COST_TO_SERVE'),0.22);
  g('cash=100;monthOut=0;spendCash(30)');
  assert.equal(g('cash'),70);
  assert.equal(g('monthOut'),30);
});

test('ledger saved and loaded; old saves default', () => {
  const a=load();
  a.g('ledger=[{rev:1,out:2,mrr:3}];monthOut=5;monthRev=6;save()');
  const s=JSON.parse(a.store.get('funnel-drop-save-v1'));
  const b=load({save:s});
  assert.equal(b.g('JSON.stringify(ledger)'),'[{"rev":1,"out":2,"mrr":3}]');
  assert.equal(b.g('monthOut'),5);
  assert.equal(b.g('monthRev'),6);
  delete s.ledger;delete s.monthOut;delete s.monthRev;
  const c=load({save:s});
  assert.equal(c.g('ledger.length'),0);
  assert.equal(c.g('monthOut'),0);
});

test('ledger keeps last 13', () => {
  const {g,months}=base();
  g('churn=0');
  months(15);
  assert.equal(g('ledger.length'),13);
});
