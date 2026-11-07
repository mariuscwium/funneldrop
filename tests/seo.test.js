const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

test('search traffic rolls a new multiplier each month, within ±SEO_VAR', () => {
  const {g,months}=load({seed:7});
  g('seoLvl=1;randomEvent=()=>{}');
  const rolls=new Set();
  for(let i=0;i<24;i++){months(1);const r=g('seoRoll');assert.ok(r>=1-g('SEO_VAR')&&r<=1+g('SEO_VAR'),`roll ${r}`);rolls.add(r)}
  assert.ok(rolls.size>20,'rolls vary');
});

test('organic rate applies the roll to search traffic only', () => {
  const {g}=load();
  g('seoLvl=2;seoFresh=1;seoRoll=1.3');
  assert.equal(g('organicRate()'),300*1.3);
  assert.equal(g('JSON.stringify(seoRange())'),'[180,420]');
  g('seoLvl=0');
  assert.equal(g('organicRate()'),0);
});

test('the roll is saved', () => {
  const a=load();
  a.g('seoRoll=.75;saving=true;save()');
  const b=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(b.g('seoRoll'),.75);
});
