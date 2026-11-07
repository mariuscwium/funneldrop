const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{}');
// hud raises peak from valuation each frame; peak=0 plus small MRR keeps Expansion closed (see expansion.test.js).
const setup=(n,churn,peak,exp=false,seed)=>{const a=load({seed});quiet(a.g);if(!exp)a.g('expCheck=()=>{}');a.g(`peak=${peak};churn=${churn};subs={"49:0":${n}};paying=${n};cash=1e7;flow.start=MRR();balls=[]`);return a};

test('no churn, no expansion = 100%', () => {
  const a=setup(1000,0,0);a.months(12);
  const r=a.g('NRR12()');assert.ok(Math.abs(r-1)<.001,String(r));
});
test('churn only', () => {
  const a=setup(1000,.06,0,false,1);a.months(12);
  const r=a.g('NRR12()');assert.ok(Math.abs(r-Math.pow(.94,12))<.05,String(r));
});
test('upgrades lift it', () => {
  const a=setup(1000,0,1e6,true);
  for(let m=0;m<12;m++){a.g('for(let i=0;i<50;i++)land({b:5,x:180,sub:"49:0",vx:0,vy:0})');a.months(1)}
  assert.ok(a.g('ledger.some(e=>e.nrr>1)'));
  assert.ok(a.g('NRR12()')>1,String(a.g('NRR12()')));
});
test('downgrades add to contraction', () => {
  const {g}=load();g('subs={"49:1":3};paying=3;flow.start=MRR();land({b:5,x:16,sub:"49:1",vx:0,vy:0})');
  assert.equal(g('flow.con'),g('49*(PLANS[1].mult-PLANS[0].mult)'));assert.equal(g('flow.exp'),0);
});
test('null before 12 months', () => {
  const a=setup(1000,0,0);a.months(6);assert.equal(a.g('NRR12()'),null);
});
test('null with no customers', () => {
  const a=load();quiet(a.g);a.months(14);assert.equal(a.g('NRR12()'),null);
});
test('new sign-ups don\'t count', () => {
  const a=setup(1000,0,0);a.months(.5);
  a.g('addSub(49,0,500);paying+=500');a.months(.6);
  const r=a.g('ledger[ledger.length-1].nrr');assert.ok(Math.abs(r-1)<1e-9,String(r));
});
test('lost customers count as lost MRR', () => {
  const {g}=load();g('subs={"49:2":100};paying=100;flow.start=MRR();loseCustomers(.5,.5)');
  assert.equal(g('flow.lost'),(100-g('paying'))*g('49*PLANS[2].mult'));assert.ok(g('flow.lost')>0);
});
test('old saves load: flow defaults, missing nrr is null', () => {
  const a=load();quiet(a.g);a.g('subs={"49:0":10};paying=10;save()');
  const s=JSON.parse(a.store.get('funnel-drop-save-v1'));delete s.flow;s.ledger=[{rev:1,out:0,mrr:490}];
  const b=load({save:s});assert.equal(b.g('flow.start'),490);assert.equal(b.g('NRR12()'),null);
});
test('new customers\' churn is scaled out (small start)', () => {
  const a=setup(1,.06,0);a.g('subs={"49:0":1};paying=1;flow.start=MRR()');
  a.months(.5);a.g('addSub(49,0,30);paying+=30;flow.new+=49*30');a.months(.55);
  const r=a.g('ledger[ledger.length-1].nrr');assert.ok(r>=0&&r<=1.01,String(r));
});
test('steady state with mid-month sign-ups is about 94%', () => {
  const a=setup(1000,.06,0);a.months(.5);
  a.g('addSub(49,0,1000);paying+=1000;flow.new+=49000');a.months(.55);
  const r=a.g('ledger[ledger.length-1].nrr');assert.ok(Math.abs(r-.94)<.03,String(r));
});
test('fresh game: null through month 12, month-1 ratio null', () => {
  const a=load();quiet(a.g);a.g('expCheck=()=>{};churn=0;addSub(49,0,10);paying=10;peak=0');
  a.months(1.1);assert.equal(a.g('ledger[0].nrr'),null);
  a.months(11);assert.equal(a.g('NRR12()'),null);
});
