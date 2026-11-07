const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
const allOk='ipoChecks=()=>[{name:"x",now:1,target:1,ok:true,txt:""}]',miss='ipoChecks=()=>[{name:"x",now:0,target:1,ok:false,txt:""}]';

test('panel hidden below $1M', () => {
  const a=load();quiet(a.g);a.frames(32);
  assert.equal(a.el('ipo').hidden,true);
  a.g('peak=1e6');a.frames(32);assert.equal(a.el('ipo').hidden,false);
});
test('checks with nulls are not ok', () => {
  const a=load();quiet(a.g);a.frames(32);
  const c=a.g('ipoChecks()');assert.equal(c.length,4);
  for(const x of c){assert.equal(x.ok,false,x.name);assert.ok(x.now===null||Number.isFinite(x.now),x.name+' '+x.now);assert.ok(!/NaN|Infinity/.test(x.txt),x.txt)}
  assert.equal(a.g('yoy()'),null);
});
test('yoy and Rule of 40 from the ledger', () => {
  const {g}=load();g('subs={"49:0":130};paying=130;ledger=Array.from({length:13},()=>({rev:100,out:80,mrr:4900,nrr:1}))');
  assert.ok(Math.abs(g('yoy()')-.3)<1e-9);
  const r=g('ipoChecks()').find(c=>/Rule of 40/.test(c.name));assert.ok(Math.abs(r.now-50)<1e-9,String(r.now));assert.equal(r.ok,true);
  g('ledger[0].mrr=0');assert.equal(g('yoy()'),null);
});
test('hold needs 3 in a row', () => {
  const a=load();quiet(a.g);a.g(allOk);a.months(2.05);assert.equal(a.g('ipoHold'),2);
  a.g(miss);a.months(1);assert.equal(a.g('ipoHold'),0);
  a.g(allOk);a.months(2);assert.equal(a.g('ipoHold'),2);
  a.g('fileIPO()');assert.equal(a.g('ipoFiled'),false);
});
test('files after 3', () => {
  const a=load();quiet(a.g);a.g(allOk);a.months(3.05);assert.equal(a.g('ipoHold'),3);
  a.g('fileIPO()');assert.equal(a.g('ipoFiled'),true);
  assert.match(String(a.el('sum-stats').innerHTML),/ARR/);
});
test('filed blocks buying', () => {
  const a=load();quiet(a.g);a.g('ipoFiled=true;cash=1e5');a.frames(32);
  const c=a.g('cash');a.g('buyAd("social");newCampaign("social");unlockCh("search");buySeo();buyUpg("acq");hire("csm")');
  assert.equal(a.g('cash'),c);assert.equal(a.g('ads'),0);assert.equal(a.g('staff.length'),0);
  assert.equal(a.el('ca-social').disabled,true);
});
test('filed survives reload', () => {
  const a=load();quiet(a.g);a.g(allOk);a.months(3.05);a.g('fileIPO()');
  const b=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(b.g('ipoFiled'),true);assert.match(String(b.el('sum-stats').innerHTML),/ARR/);
});
test('old saves load with IPO defaults', () => {
  const a=load();a.g('save()');const s=JSON.parse(a.store.get('funnel-drop-save-v1'));
  for(const k of ['ipoHold','ipoFiled','mileMonth','playMs','ipoSnap'])delete s[k];
  const b=load({save:s});assert.equal(b.g('ipoHold'),0);assert.equal(b.g('ipoFiled'),false);assert.equal(b.g('playMs'),0);
});
test('milestone months are recorded', () => {
  const a=load();quiet(a.g);a.months(2.05);a.g('peak=1e5');a.frames(32);
  assert.equal(a.g('mileMonth[0]'),2);assert.equal(a.g('mileMonth[1]'),undefined);
});
test('play time counts frames', () => {
  const a=load();quiet(a.g);a.frames(1600);assert.ok(Math.abs(a.g('playMs')-1600)<1,String(a.g('playMs')));
});
test('Unicorn text points at the IPO', () => {
  const {g}=load();assert.match(g('MILES[MILES.length-1][3]'),/IPO/);
});
