const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};checkMilestone=()=>{}');

test('nodePos: start at the centre, Acquisition straight up, wedges clockwise', () => {
  const {g}=load();
  const s=g('nodePos(nodeOf("start"))');near(s.x,0);near(s.y,0);
  const a=g('nodePos(nodeOf("acq1"))');near(a.x,0);assert.ok(a.y<0);near(Math.hypot(a.x,a.y),g('RING_R'));
  const r=g('nodePos(nodeOf("rev1"))'),ang=Math.atan2(r.y,r.x)*180/Math.PI;near(ang,-90+4*60);
  assert.equal(g('RING_R'),70);
});

test('nodePos: slot separates seeds in one wedge, keystones sit on the boundary', () => {
  const {g}=load();
  const a=g('nodePos(nodeOf("ret1"))'),b=g('nodePos(nodeOf("churn1"))');
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>20);
  const deg=p=>Math.atan2(p.y,p.x)*180/Math.PI;
  assert.ok(deg(a)<30&&deg(b)>30,`${deg(a)} ${deg(b)}`);
  const k=g('nodePos({area:[0,1],ring:3,slot:0})');near(deg(k),-60);near(Math.hypot(k.x,k.y),210);
  const w=g('nodePos({area:[5,0],ring:2,slot:0})');near(deg(w),-120);
});

test('open roadmap pauses the game', () => {
  const a=load({dialogs:true});quiet(a.g);a.frames(32);
  a.g('openTree()');assert.equal(a.el('tree').open,true);
  const m=a.g('month'),e=a.g('eventT'),rp=a.g('rp');a.months(1.5);
  assert.equal(a.g('month'),m);assert.equal(a.g('eventT'),e);assert.equal(a.g('rp'),rp);
  a.el('tree').close();a.months(1.05);assert.equal(a.g('month'),m+1);
});

test('closing the roadmap shifts the ad queue and post cooldown by the time it was open', () => {
  const a=load({dialogs:true});quiet(a.g);a.frames(32);
  a.g('queue=[];postReady=0;runAd(CHANNELS[0]);post()');
  const q=a.g('queue[0].t'),p=a.g('postReady');assert.ok(p>0);
  a.g('openTree()');a.frames(5000);a.el('tree').close();
  near(a.g('queue[0].t'),q+5000,20);near(a.g('postReady'),p+5000,20);
});

test('buys in the open roadmap celebrate on close', () => {
  const a=load({dialogs:true});quiet(a.g);a.frames(32);
  a.g('__c=[];celebrate=(b,t)=>__c.push(b);rp=5;cash=1e4;openTree()');
  assert.equal(a.g('buyNode("act1")'),true);assert.equal(a.g('__c.length'),0);
  a.el('tree').close();assert.equal(a.g('__c.join()'),'1');
  a.g('__c=[];rp=5;cash=1e4');assert.equal(a.g('buyNode("acq1")'),true);assert.equal(a.g('__c.join()'),'0');
});

test('entry card counts what you can ship now', () => {
  const {g,el}=load();
  g('rp=0;cash=0;hud()');assert.equal(g('readyNow()'),0);
  g('rp=1;cash=2000;hud()');assert.equal(g('readyNow()'),6);
  g('rp=3.7;hud()');assert.equal(el('rm-pts').textContent,'3 points');
});

test('labels: never overlap, the selected one always shows, all show at full zoom', () => {
  const {g}=load();g('peak=2e6');
  assert.equal(g('labelsAt(.4).size'),0);
  assert.equal(g('labelsAt(TREE_K[1]).size'),g('NODES.length'));
  for(const k of [.5,1,1.5]){const n=g(`labelsAt(${k}).size`);assert.ok(n>0&&n<g('NODES.length'),`${k}: ${n}`)}
  g('TREE.sel="rev_rep"');assert.equal(g('labelsAt(.5).has("rev_rep")'),true);
});
