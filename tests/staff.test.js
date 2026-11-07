const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);

test('new hire ramps', () => {
  const {g}=load();
  g('month=0;eventT=0;hire("pd")');
  near(g('strength("pd")'),0.25);
  // Strength is cached and steps once a game month, at refitRamping.
  g('month=3;refitRamping()');near(g('strength("pd")'),0.625);
  g('month=6;refitRamping()');near(g('strength("pd")'),1);
  g('month=20;refitRamping()');near(g('strength("pd")'),1);
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
  g('month=10;refitRamping()');near(g('csmMult()'),0.75);
});

test('mm visitors scale with strength', () => {
  const {g}=load();
  g('seoLvl=0;month=0;eventT=0;hire("mm")');
  near(g('mmEff()'),g('MM_K*((1+0.25/MM_K)**MM_P-1)/MM_P'));assert.ok(g('mmEff()')<0.25);
  near(g('organicRate()'),400*g('mmEff()'));
});

test('mm returns diminish', () => {
  const {g}=load();
  g('month=0;eventT=0;for(let i=0;i<100;i++)hire("mm");month=10;refitRamping()');
  near(g('strength("mm")'),100);
  const e=g('mmEff()');assert.ok(e>20&&e<35,'mmEff '+e); // 100 full hires act like about 27
});

test('cache follows hire, fire, review and load', () => {
  const a=load();
  a.g('month=0;eventT=0;hire("csm");hire("csm");hire("mm");month=8;refitRamping()');
  assert.equal(a.g('heads("csm")'),2);near(a.g('strength("csm")'),2);assert.equal(a.g('teamCost()'),18000);assert.equal(a.g('rampingUp("csm")'),0);
  a.g('fire("csm")');assert.equal(a.g('heads("csm")'),1);assert.equal(a.g('teamCost()'),12000);
  a.g('hire("pd")');assert.equal(a.g('rampingUp("pd")'),1);near(a.g('strength("pd")'),.25);
  a.g('save()');const {g}=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(g('heads("csm")'),1);assert.equal(g('heads("pd")'),1);assert.equal(g('teamCost()'),18000);
});

test('bulk hiring', () => {
  const {g}=load();
  g('cash=59000;hireN("csm",10)');assert.equal(g('heads("csm")'),0);
  g('cash=60000;hireN("mm",10)');assert.equal(g('heads("mm")'),10);
  g('subs={"49:0":1000};paying=1000;cash=1e6;hireN("csm",csmGap())');assert.equal(g('heads("csm")'),7);assert.equal(g('csmGap()'),0);
  g('ipoFiled=true;hireN("csm",10)');assert.equal(g('heads("csm")'),7);
});

