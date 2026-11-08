const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');

test('pausing stops the clock, money and ad spend', () => {
  const a=load();quiet(a.g);
  a.g('subs={"49:0":50};paying=50;cash=5000;setBudget("social",50);togglePause()');
  assert.equal(a.g('paused'),true);
  const m=a.g('month+eventT'),c=a.g('cash'),s=a.g('spend');
  a.months(2);
  assert.equal(a.g('month+eventT'),m);assert.equal(a.g('cash'),c);assert.equal(a.g('spend'),s);
  a.g('togglePause()');assert.equal(a.g('paused'),false);
  a.months(1);assert.ok(a.g('month+eventT')>m);
});

test('the screen keeps up while paused', () => {
  const a=load();quiet(a.g);
  a.g('togglePause();cash=4321');a.frames(32);
  assert.equal(a.el('vCash').textContent,'$4,321');
  assert.equal(a.el('pause').textContent,'Resume');
  a.g('togglePause()');a.frames(32);assert.equal(a.el('pause').textContent,'Pause');
});

test('resuming shifts cooldowns and queued visitors by the pause', () => {
  const a=load();quiet(a.g);
  a.g('postReady=performance.now()+5000;queue=[{t:performance.now()+1000}];togglePause()');
  const pr=a.g('postReady'),qt=a.g('queue[0].t');
  a.frames(3000);a.g('togglePause()');
  assert.ok(a.g('postReady')-pr>=2900,String(a.g('postReady')-pr));
  assert.ok(a.g('queue[0].t')-qt>=2900);
});

test('no pausing once the run has ended', () => {
  const a=load();a.g('over={kind:"runway",month:0,story:[],snap:[]};togglePause()');assert.equal(a.g('paused'),false);
});
