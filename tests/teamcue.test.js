const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

test('juniors can be hired from the first day', () => {
  const a=load();a.frames(2);
  assert.equal(a.g('JUNIORS.intern.at'),0);assert.equal(a.g('JUNIORS.jeng.at'),0);
  assert.ok(a.g('teamNew.includes("intern")&&teamNew.includes("jeng")'));
  a.g('cash=1500;hireJunior("intern")');assert.equal(a.g('heads("intern")'),1);
});

test('a new game cues the team card until the team screen opens', () => {
  const a=load({dialogs:true});a.frames(2);
  assert.ok(a.g('teamNew.length')>=2);
  assert.equal(a.el('team-badge').hidden,false);assert.match(a.el('team-badge').textContent,/^\d+ new$/);
  a.g('openTeam()');a.el('teamd').close();a.frames(2);
  assert.equal(a.g('teamNew.length'),0);assert.equal(a.el('team-badge').hidden,true);
});

test('a role unlocking later cues the card again, and seen roles survive a reload', () => {
  const a=load({dialogs:true});a.frames(2);a.g('openTeam()');a.el('teamd').close();
  a.g('peak=Math.max(peak,ENG.at)');a.frames(2);
  assert.equal(a.g('JSON.stringify(teamNew)'),'["eng"]');assert.equal(a.el('team-badge').textContent,'1 new');
  a.g('save()');const b=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});b.frames(2);
  assert.equal(b.g('JSON.stringify(teamNew)'),'["eng"]');
});

test('an old save only cues the juniors', () => {
  const a=load();a.g('peak=Math.max(peak,CSM.at,MM.at,ENG.at);save()');
  const s=JSON.parse(a.store.get('funnel-drop-save-v1'));delete s.teamSeen;
  const b=load({save:s});b.frames(2);
  assert.equal(b.g('JSON.stringify(teamNew.slice().sort())'),'["intern","jeng"]');
});

test('people leaving at the annual review light the team card red', () => {
  const a=load({dialogs:true});a.g('randomEvent=()=>{};expCheck=()=>{};cash=1e6;staff=[];for(let i=0;i<5;i++)hire("mm");staff.forEach(e=>e.hired=-30);restaff();Math.random=()=>0');
  a.g('__d=[];cueDelta=(el,t,tone)=>__d.push([t,tone]);annualReview()');a.el('ev').close();
  assert.ok(a.g('__d').some(([t,tone])=>t==='−5 people'&&tone==='cue-bad'),JSON.stringify(a.g('__d')));
});

test('a payroll bounce lights the team card red', () => {
  const a=load();a.g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{};staff=[];cash=1e6;hire("mm");hire("mm");restaff();cash=0;nextCut=0');
  a.g('__d=[];cueDelta=(el,t,tone)=>__d.push([t,tone])');a.frames(64);
  assert.ok(a.g('__d').some(([t,tone])=>t==='−1 person'&&tone==='cue-bad'),JSON.stringify(a.g('__d')));
});
