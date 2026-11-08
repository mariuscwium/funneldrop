const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');

test('the team screen pauses the game but keeps the numbers live', () => {
  const a=load({dialogs:true});quiet(a.g);
  a.g('subs={"49:0":50};paying=50;cash=50000;peak=1e6;msLvl=milesHit();openTeam()');
  assert.equal(a.el('teamd').open,true);
  const m=a.g('month+eventT'),c=a.g('cash');
  a.months(1);
  assert.equal(a.g('month+eventT'),m);assert.equal(a.g('cash'),c);
  a.g('hire("csm")');a.frames(32);
  assert.equal(a.g('heads("csm")'),1);
  assert.equal(a.el('team-n').textContent,'1 person');
  assert.equal(a.el('tm-n').textContent,'1');
  assert.equal(a.el('tm-cash').textContent,a.el('vCash').textContent);
  assert.equal(a.el('tm-mrr').textContent,a.el('vMrr').textContent);
  a.el('teamd').close();a.months(1);
  assert.ok(a.g('month+eventT')>m);
});

test('closing the team screen shifts cooldowns by the time it was open', () => {
  const a=load({dialogs:true});quiet(a.g);
  a.g('postReady=performance.now()+5000;openTeam()');const pr=a.g('postReady');
  a.frames(3000);a.el('teamd').close();
  assert.ok(a.g('postReady')-pr>=2900,String(a.g('postReady')-pr));
});

test('the team card says who is on payroll', () => {
  const a=load();quiet(a.g);
  a.g('cash=1e6;peak=1e6');a.frames(32);
  assert.equal(a.el('team-n').textContent,'No one yet');
  a.g('hire("mm");hire("mm")');a.frames(32);
  assert.equal(a.el('team-n').textContent,'2 people');
  assert.match(a.el('team-meta').textContent,/^Payroll \$12\.0k a month/);
});
