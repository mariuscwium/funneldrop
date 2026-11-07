const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

test('ads cost the same below $100k', () => {
  const {g}=load();
  g('peak=99999');
  assert.equal(g('CHANNELS.map(adCost).join()'),'100,200,300,1500');
  assert.equal(g('CHANNELS.map(campCost).join()'),'500,1000,1500,5000');
  assert.equal(g('perAd(CHANNELS[0])'),100);
  g('cash=1000;buyAd("social")');assert.equal(g('cash'),900);assert.equal(g('queue.length'),100);
});

test('cost per visitor rises with scale', () => {
  const {g}=load();
  const per=()=>g('adCost(CHANNELS[0])/perAd(CHANNELS[0])');
  g('peak=1e5');const a=per();
  g('peak=1e7');const b=per();
  g('peak=1e9');const c=per();
  assert.ok(a<b&&b<c,`${a} ${b} ${c}`);
  g('peak=1e7;cash=1e6;CHANNELS[0].reach=CHANNELS[0].base;queue=[]');
  const k=g('adCost(CHANNELS[0])'),v=g('perAd(CHANNELS[0])');
  g('buyAd("social")');assert.equal(g('cash'),1e6-k);assert.equal(g('queue.length'),v);
  g('CHANNELS[0].reach=10;newCampaign("social")');assert.equal(g('cash'),1e6-k-g('campCost(CHANNELS[0])'));
});
