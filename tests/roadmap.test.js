const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
const fresh=o=>{const a=load(o);a.g('randomEvent=()=>{};annualReview=()=>{}');return a};

test('founders alone earn RP_FOUNDER a month', () => {
  const {g,months}=fresh();
  g('rp=0;cash=0');months(4);
  near(g('rp'),4*g('RP_FOUNDER'),.05);
});

test('engineers add RP_ENG*engEff, with diminishing returns', () => {
  const {g}=fresh();
  g('staff=[];restaff();rp=0');
  const base=g('rpIncome()');near(base,g('RP_FOUNDER'));
  g('for(let i=0;i<1;i++)hire("eng");staff.forEach(e=>e.hired=-99);restaff()');
  const one=g('rpIncome()')-base;near(one,g('RP_ENG*engEff()'));const k=g('RP_ENG');assert.ok(one>.9*k&&one<=k);
  g('staff=[];for(let i=0;i<10;i++)hire("eng");staff.forEach(e=>e.hired=-99);restaff()');
  const ten=g('rpIncome()')-base;assert.ok(ten>one&&ten<10*one,`${ten}`);
});

test('rp stops at the cap and an overshoot is kept', () => {
  const {g,months}=fresh();
  g('rp=0');months(14);near(g('rp'),g('rpCap()'),1e-6);near(g('rp'),6,1e-6);
  g('rp=rpCap()+5');const v=g('rp');months(1);assert.equal(g('rp'),v);
});

test('the first $100k milestone adds RP_MILE[0] above the cap', () => {
  const {g,frames}=fresh();
  g('rp=rpCap()+1;peak=1e5');const before=g('rp');
  g('checkMilestone()');
  near(g('rp'),before+g('RP_MILE[0]'));
});

test('stale rises only while something is affordable, and buyNode resets it', () => {
  const {g,months}=fresh();
  g('rp=0;cash=0;stale=0');months(3);assert.equal(g('stale'),0,'no points, nothing affordable');
  g('rp=100;cash=1e12;stale=0;monthOut=0');
  // keep funds up and pay no churn: only count rollovers
  const n=g('STALE_GRACE')+5;for(let i=0;i<n;i++){g('rp=100;cash=1e12');months(1)}
  assert.equal(g('stale'),n);
  near(g('paidChurn()'),g('CHURN0*priceChurn(price)*(1+5*STALE_STEP)'),1e-12);
  assert.equal(g('buyNode("acq1")'),true);assert.equal(g('stale'),0);
  near(g('paidChurn()'),g('CHURN0*priceChurn(price)'),1e-12);
  g('stale=999');near(g('staleMult()'),1+g('STALE_MAX'));
});

test('no points accrue while a dialog is open', () => {
  const {g,frames,el}=fresh();
  g('rp=0');el('ev').open=true;frames(5000);assert.equal(g('rp'),0);
  el('ev').open=false;frames(5000);assert.ok(g('rp')>0);
});

test('engineers and stale survive save and load', () => {
  const a=fresh();a.g('hire("eng");stale=9;save()');
  const b=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(b.g('heads("eng")'),1);assert.equal(b.g('stale'),9);
});
