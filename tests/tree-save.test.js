const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
const saved=a=>JSON.parse(a.store.get('funnel-drop-save-v1'));
// A save in the shape from before the tech tree: lvl per track, no owned.
function oldSave(lvl){const a=load();a.g('save()');const s=saved(a);delete s.owned;delete s.rp;delete s.stale;delete s.paid;delete s.respecUsed;delete s.alHist;s.lvl=lvl;return s}
const ALL3={acq:3,act:3,ret:3,ref:3,rev:3,churn:3,exp:3};
const SEEDS=['acq1','act1','ret1','ref1','rev1','churn1','exp1'];

test('round trip', () => {
  const a=load();a.g('rp=9;cash=1e6;buyNode("acq1");buyNode("churn1");stale=4;respecUsed=true;save()');
  const s=saved(a);assert.equal(JSON.stringify(s.alHist),"[]");
  const b=load({save:s});
  assert.equal(b.g('owned.acq1'),1);assert.equal(b.g('owned.churn1'),1);
  assert.equal(b.g('rp'),a.g('rp'));assert.equal(b.g('stale'),4);assert.equal(b.g('respecUsed'),true);
  assert.equal(b.g("JSON.stringify(paid)"),a.g("JSON.stringify(paid)"));
  near(b.g('rateOf(trackOf(0))'),a.g('rateOf(trackOf(0))'));
});

test('old save with every tier 3 converts', () => {
  const a=load({save:oldSave(ALL3)});
  for(const id of SEEDS)assert.equal(a.g(`owned.${id}`),1,id);
  assert.equal(a.g('rp'),a.g('RP_START')+7*5);
  const b=load();b.g('rp=99;cash=1e9;peak=1e6');for(const id of SEEDS)b.g(`buyNode("${id}")`);
  for(let i=0;i<6;i++)near(a.g(`rateOf(RATES[${i}])`),b.g(`rateOf(RATES[${i}])`));
  near(a.g('churn'),b.g('churn'));
});

test('old save with a missing exp and low tiers', () => {
  const a=load({save:oldSave({acq:1,act:2,ret:0,ref:0,rev:0,churn:0})});
  assert.equal(a.g('owned.acq1'),1);assert.equal(a.g('owned.act1'),1);assert.equal(a.g('owned.ret1'),undefined);
  assert.equal(a.g('rp'),a.g('RP_START')+2);
});

test('old save converts once', () => {
  const a=load({save:oldSave(ALL3)});const rp=a.g('rp');
  a.g('save()');
  const b=load({save:saved(a)});
  assert.equal(b.g('rp'),rp);for(const id of SEEDS)assert.equal(b.g(`owned.${id}`),1);
  assert.equal(Object.keys(b.g('owned')).length,8);
});

test('respec', () => {
  const a=load();a.g('NODES.push({id:"fa",name:"a",desc:"",area:0,ring:2,slot:-.5,links:["acq1"],fork:"f1",pts:2,cash:0,al:[0,0],fx:{r0:.01},rep:false},{id:"fb",name:"b",desc:"",area:0,ring:2,slot:.5,links:["acq1"],fork:"f1",pts:2,cash:0,al:[0,0],fx:{r0:.02},rep:false});linkNodes()');
  a.g('rp=9;cash=1e6;buyNode("acq1");buyNode("fa")');
  assert.equal(a.g('nodeState("fb")'),'locked');
  assert.equal(a.g('paid.acq1'),1);assert.equal(a.g('paid.fa'),2);
  const rp=a.g('rp'),cash=a.g('cash'),cost=a.g('respecCost()');
  assert.equal(a.g('respec()'),true);
  assert.equal(a.g('rp'),rp+3);assert.equal(a.g('cash'),cash-cost);
  assert.equal(a.g('nodeState("fb")'),'unreachable');
  assert.equal(a.g("JSON.stringify(owned)"),"{\"start\":1}");assert.equal(a.g('stale'),0);
  near(a.g('bonus[0]'),0);
  const r2=a.g('rp'),c2=a.g('cash');
  assert.equal(a.g('respec()'),false);assert.equal(a.g('rp'),r2);assert.equal(a.g('cash'),c2);
});

test('respec needs cash and is blocked after filing', () => {
  const a=load();a.g('rp=9;cash=1e6;buyNode("acq1")');
  a.g('cash=10');assert.equal(a.g('respec()'),false);
  a.g('cash=1e6;ipoFiled=true');assert.equal(a.g('respec()'),false);assert.equal(a.g('owned.acq1'),1);
});
