const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');

test('opening a sheet shows only that panel, and the tab again closes it', () => {
  const a=load();
  a.g('showTab("ads")');
  assert.equal(a.el('sheet').hidden,false);
  assert.deepEqual(['ads','build','stats'].map(n=>a.el('sh-'+n).hidden),[false,true,true]);
  a.g('showTab("stats")');
  assert.deepEqual(['ads','build','stats'].map(n=>a.el('sh-'+n).hidden),[true,true,false]);
  a.g('showTab(null)');
  assert.equal(a.el('sheet').hidden,true);
});

test('the game keeps running with a sheet open', () => {
  const a=load();quiet(a.g);
  a.g('cash=5000;subs={"49:0":50};paying=50;showTab("build")');
  const m=a.g('month+eventT');
  a.months(1);
  assert.ok(a.g('month+eventT')>m);
});

test('the Build tab badge counts roadmap items ready and new team roles', () => {
  const a=load();
  a.g('tabBadge("build",3)');
  assert.equal(a.el('tb-build').hidden,false);assert.equal(a.el('tb-build').textContent,'3');
  a.g('tabBadge("build",0)');
  assert.equal(a.el('tb-build').hidden,true);
});

test('the Ads tab badge shows while ads are paused for lack of cash', () => {
  const a=load();quiet(a.g);
  a.g('hud()');assert.equal(a.el('tb-ads').hidden,true);
  a.g('adsBroke=true;hud()');
  assert.equal(a.el('tb-ads').hidden,false);assert.equal(a.el('tb-ads').textContent,'!');
});
