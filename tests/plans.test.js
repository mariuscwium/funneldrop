const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

test('old keys load as Base', () => {
  const a=load();a.g('save()');
  const s=JSON.parse(a.store.get('funnel-drop-save-v1'));
  s.subs={"49":5,"24":2};s.paying=7;
  const {g}=load({save:s});
  assert.equal(g('Object.keys(subs).sort().join()'),'24:0,49:0');
  assert.equal(g('MRR()'),293);
});

test('MRR uses plan multiple', () => {
  const {g}=load();
  g('subs={};paying=1;addSub(49,1,1)');
  assert.equal(g('MRR()'),98);
});

test('moveSub', () => {
  const {g}=load();
  g('subs={};paying=1;addSub(49,0,1)');
  assert.equal(g('moveSub("49:0",2)'),true);
  assert.equal(g('subs["49:2"]'),1);
  assert.equal(g('"49:0" in subs'),false);
  assert.equal(g('paying'),1);
});

test('moveSub on empty is false', () => {
  const {g}=load();
  g('subs={};paying=0');
  assert.equal(g('moveSub("49:0",1)'),false);
  assert.equal(g('moveSub("49:1",1)'),false);
  assert.equal(g('Object.keys(subs).length'),0);
});

test('key and unkey', () => {
  const {g}=load();
  assert.equal(g('key(49)'),'49:0');
  assert.equal(g('unkey("49").join()'),'49,0');
  assert.equal(g('unkey("29:2").join()'),'29,2');
});

test("price slider doesn't re-bill", () => {
  const {g}=load();
  g('subs={};paying=0;addSub(49,0,10);price=99;applyPrice()');
  assert.equal(g('MRR()'),490);
});

test('Pro churns less', () => {
  const {g,months}=load();
  g('randomEvent=()=>{};churn=0.06;csm=0;subs={"49:1":100000};paying=100000');
  months(1);
  const lost=100000-g('paying');
  assert.ok(Math.abs(lost-4200)<=400,'lost '+lost);
  assert.equal(g('Object.values(subs).reduce((a,b)=>a+b,0)'),g('paying'));
});

test('loseCustomers keeps paying equal to subs', () => {
  const {g}=load();
  g('subs={};paying=100;addSub(49,0,50);addSub(49,2,50);loseCustomers(.2,.2)');
  assert.equal(g('Object.values(subs).reduce((a,b)=>a+b,0)'),g('paying'));
});
