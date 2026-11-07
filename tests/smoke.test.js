const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

test('starts with $1,500 and $49', () => {
  const {g}=load();
  assert.equal(g('cash'),1500);
  assert.equal(g('price'),49);
  assert.equal(g('churn'),0.06);
});

test('MRR sums subs', () => {
  const {g}=load();
  g('subs={49:10};paying=10');
  assert.equal(g('MRR()'),490);
});

test('a month passes in 10 s', () => {
  const {g,months}=load();
  months(1);
  assert.equal(g('month'),1);
});

test('save round-trips', () => {
  const first=load();
  first.g('cash=777;paying=3;subs={49:3};rp=9;buyNode("acq1");rp=4.5;cash=777');
  first.g('save()');
  const saved=JSON.parse(first.store.get('funnel-drop-save-v1'));
  const second=load({save:saved});
  assert.equal(second.g('cash'),777);
  assert.equal(second.g('paying'),3);
  assert.equal(second.g('rp'),4.5);
  assert.equal(JSON.stringify(second.g('owned')),JSON.stringify(first.g('owned')));
  assert.equal(second.g('rateOf(trackOf(0))'),first.g('rateOf(trackOf(0))'));
});

test('charts add a point every 10 days and keep the last 24 months', () => {
  const {g,months,frames}=load();
  g('randomEvent=()=>{}');
  frames(3400);
  assert.equal(g('hist.length'),1);
  months(30);
  assert.equal(g('hist.length'),73);
  const a=load();a.g('saving=true;save()');
  const base=JSON.parse(a.store.get('funnel-drop-save-v1'));
  assert.equal(load({save:{...base,hist:Array(100).fill([1,1,1,1])}}).g('hist.length'),73);
  // Older saves hold monthly points, which don't fit the 10-day axis.
  const {histDays,...old}=base;
  assert.equal(load({save:{...old,hist:Array(40).fill([1,1,1,1])}}).g('hist.length'),0);
});
