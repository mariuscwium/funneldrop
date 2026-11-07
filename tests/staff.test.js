const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);

test('new hire ramps', () => {
  const {g}=load();
  g('month=0;eventT=0;hire("pd")');
  near(g('strength("pd")'),0.25);
  g('month=3');near(g('strength("pd")'),0.625);
  g('month=6');near(g('strength("pd")'),1);
  g('month=20');near(g('strength("pd")'),1);
  assert.equal(g('heads("pd")'),1);
});

test('review raises per person', () => {
  const {g}=load();
  g('var _r0=Math.random;Math.random=()=>0.99');
  try{
    g('staff=[{role:"pd",hired:0,pay:6000,skill:1},{role:"pd",hired:11,pay:6000,skill:1}];month=12;eventT=0;annualReview()');
  }finally{g("Math.random="+"_r0")}
  const a=g('JSON.stringify(staff)'),s=JSON.parse(a);
  assert.equal(s.length,2);
  near(s[0].pay,6300);near(s[0].skill,1.03);
  assert.equal(s[1].pay,6000);assert.equal(s[1].skill,1);
});

test('headhunt chance per person', () => {
  const {g}=load();
  g('var _r=Math.random;Math.random=()=>0.12');
  try{
    g('staff=[{role:"pd",hired:0,pay:6000,skill:1},{role:"cm",hired:12,pay:5000,skill:1}];month=24;eventT=0;annualReview()');
  }finally{g('Math.random=_r')}
  assert.equal(g('staff.length'),1);
  assert.equal(g('staff[0].role'),'cm');
});

test('fire removes newest', () => {
  const {g}=load();
  g('month=0;hire("mm");staff[0].skill=1.2;month=5;hire("mm");month=7;fire("mm")');
  assert.equal(g('heads("mm")'),1);
  near(g('staff[0].skill'),1.2);
  near(g('staff[0].hired'),0);
});

test('payroll bounce drops newest staff', () => {
  const {g,frames}=load();
  g('randomEvent=()=>{};subs={};paying=0;month=0;hire("pd");month=1;hire("csm");month=2;hire("mm");month=3;hire("cm");month=4;cash=0');
  frames(32);
  assert.equal(g('staff.map(e=>e.role).join()'),'pd,csm,mm');
  assert.ok(g('cash')<=0);
});

test('old save converts', () => {
  const a=load();a.g('save()');
  const s=JSON.parse(a.store.get('funnel-drop-save-v1'));
  delete s.staff;
  Object.assign(s,{month:40,eventT:0,roles:[2,0,0,0],tenure:{csm:0,mm:0,pd:3,pe:0,cm:0,ae:0},csm:1,mm:0});
  const {g}=load({save:s});
  assert.equal(g('heads("pd")'),2);
  assert.equal(g('heads("csm")'),1);
  assert.equal(g('heads("mm")'),0);
  near(g('strength("pd")'),2*1.09,1e-9);
  const pd=JSON.parse(g('JSON.stringify(staff.filter(e=>e.role==="pd"))'));
  for(const e of pd){near(e.pay,6000*1.05**3,1e-6);near(e.skill,1.09);near(e.hired,40-36-6)}
  near(g('strength("csm")'),1);
});

test('new saves keep staff', () => {
  const a=load();
  a.g('month=2;hire("ae");staff[0].pay=7350;save()');
  const s=JSON.parse(a.store.get('funnel-drop-save-v1'));
  assert.equal(s.roles,undefined);assert.equal(s.tenure,undefined);
  const {g}=load({save:s});
  assert.equal(g('heads("ae")'),1);
  assert.equal(g('staff[0].pay'),7350);
  assert.equal(g('teamCost()'),7350);
});

test('effect follows strength', () => {
  const {g}=load();
  g('month=0;eventT=0;hire("pd")');
  const w=g('BOARDS[1].zones[0][1]-BOARDS[1].zones[0][0]');
  near(w,g('BASEW[1]')*(1+0.15*0.25),1e-9);
});

test('csm cut scales with strength, coverage per head', () => {
  const {g}=load();
  g('month=0;eventT=0;hire("csm")');
  near(g('csmMult()'),1-0.25*0.25);
  g('month=10');near(g('csmMult()'),0.75);
});

test('mm visitors scale with strength', () => {
  const {g}=load();
  g('seoLvl=0;month=0;eventT=0;hire("mm")');
  near(g('organicRate()'),400*0.25);
});
