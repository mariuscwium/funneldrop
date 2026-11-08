const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
// Dialogs on, so an open #ev holds its effects until close().
const game=()=>{const a=load({dialogs:true});a.g('randomEvent=randomEvent;annualReview=annualReview;expCheck=()=>{};subs={"49:0":200};paying=200;ads=1;cash=10000;month=30');return a};
const fire=(a,name)=>a.g(`pickEvent=()=>EVENTS.find(e=>e.name===${JSON.stringify(name)});randomEvent()`);

test('a grant lands in cash only when its dialog closes', () => {
  const a=game();fire(a,'Startup grant');
  assert.equal(a.el('ev').open,true);assert.equal(a.g('cash'),10000);
  a.el('ev').close();assert.ok(a.g('cash')>10000);
});

test('customers leave when the dialog closes, as many as it said', () => {
  const a=game();fire(a,'Outage');
  assert.equal(a.g('paying'),200);
  const n=+/(\d+) of 200/.exec(a.el('ev-text').textContent)[1];
  a.el('ev').close();assert.equal(a.g('paying'),200-n);assert.equal(a.g('subs["49:0"]'),200-n);
});

test('a tax bill says overdrawn before it is paid', () => {
  const a=game();a.g('cash=100');fire(a,'Tax bill');
  assert.equal(a.g('cash'),100);assert.match(a.el('ev-text').textContent,/overdrawn/);
  a.el('ev').close();assert.ok(a.g('cash')<0);
});

test('visitors arrive after the dialog', () => {
  const a=game();a.g('queue=[]');fire(a,'Press mention');
  assert.equal(a.g('queue.length'),0);
  a.el('ev').close();assert.ok(a.g('queue.length')>0);
});

test('a queued event applies when its own dialog closes', () => {
  const a=game();fire(a,'Startup grant');fire(a,'Search update');a.g('seoLvl=1;seoFresh=1');
  a.el('ev').close();
  const c=a.g('cash');assert.ok(c>10000);assert.equal(a.el('ev').open,true);assert.equal(a.g('seoFresh'),1);
  a.el('ev').close();assert.ok(a.g('seoFresh')<1);
});

test('milestone points bank after the dialog', () => {
  const a=game();a.g('rp=0;msLvl=0;peak=1e5;checkMilestone()');
  assert.equal(a.el('ev').open,true);assert.equal(a.g('rp'),0);
  a.el('ev').close();assert.equal(a.g('rp'),a.g('RP_MILE[0]'));
});

test('a consent order is paid after its dialog', () => {
  const a=game();a.g('lawCase={axis:0,due:0};NODE_IX.t={id:"t",al:[-.5,0]};owned={start:1,t:ALIGN_SCALE};withFx(ruleCase)');
  assert.equal(a.el('ev-title').textContent,'Consent order');assert.equal(a.g('cash'),10000);assert.equal(a.g('lawStrikes[0]'),0);
  a.el('ev').close();assert.ok(a.g('cash')<10000);assert.equal(a.g('lawStrikes[0]'),1);
});

test('the annual review changes the team after its dialog', () => {
  const a=game();a.g('staff=[];for(let i=0;i<5;i++)hire("mm");staff.forEach(e=>e.hired=-30);restaff();Math.random=()=>0');
  const pay=a.g('teamCost()');a.g('annualReview()');
  assert.equal(a.g('staff.length'),5);assert.equal(a.g('teamCost()'),pay);
  a.el('ev').close();assert.equal(a.g('staff.length'),0);
});

test('closing the page applies pending effects before saving', () => {
  const a=game();fire(a,'Startup grant');
  a.g('flushEv();save()');
  assert.ok(JSON.parse(a.store.get('funnel-drop-save-v1')).cash>10000);
});
