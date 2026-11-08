const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
const ramped=g=>g('staff.forEach(e=>e.hired=-99);restaff()');

test('juniors cost about half their seniors', () => {
  const {g}=load();
  assert.equal(g('baseSalary("intern")'),1500);assert.equal(g('baseSalary("jeng")'),3500);
  assert.equal(g('roleName("intern")'),'social media intern');assert.equal(g('roleName("jeng")'),'junior engineer');
});

test('an intern posts every time the cooldown is up', () => {
  const a=load();quiet(a.g);
  a.g('cash=1e6;peak=1e5;hireJunior("intern");postReady=0');
  const f=a.g('followers');a.frames(32);
  assert.ok(a.g('postReady')>a.g('performance.now()'),'posted');assert.ok(a.g('followers')>f);
  a.g('postReady=0');a.frames(32);assert.ok(a.g('postReady')>a.g('performance.now()'),'posted again');
});

test('only one intern', () => {
  const {g}=load();g('cash=1e6;peak=1e5;hireJunior("intern");hireJunior("intern")');
  assert.equal(g('heads("intern")'),1);
});

test('a junior engineer earns about 40% of an engineer’s points', () => {
  const {g}=load();g('cash=1e6;staff=[];restaff()');
  const base=g('rpIncome()');
  g('hire("eng")');ramped(g);const e=g('rpIncome()')-base;
  g('staff=[];hire("jeng")');ramped(g);const j=g('rpIncome()')-base;
  assert.ok(j/e>.35&&j/e<.45,String(j/e));
});

test('each manager supervises up to JUNIOR_SPAN juniors', () => {
  const {g}=load();g('cash=1e6;staff=[];for(let i=0;i<4;i++)hire("jeng");hire("eng");restaff()');
  assert.equal(g('JUNIOR_SPAN'),3);assert.equal(g('unsupervised("jeng")'),1);
  g('hire("eng");restaff()');assert.equal(g('unsupervised("jeng")'),0);
  g('hire("intern");restaff()');assert.equal(g('unsupervised("intern")'),1);
  g('hire("mm");restaff()');assert.equal(g('unsupervised("intern")'),0);
});

test('unsupervised juniors cause incidents, supervised ones and the first two years don’t', () => {
  const a=load();quiet(a.g);
  a.g('__k=[];showEv=(k,kind,name)=>__k.push(name);subs={"49:0":100};paying=100;cash=1e6;rp=5;staff=[];hire("jeng");hire("intern");restaff();Math.random=()=>0');
  a.g('month=SAFE_MONTHS-1;juniorIncidents()');assert.equal(a.g('__k.length'),0,'safe first two years');
  a.g('month=SAFE_MONTHS;juniorIncidents()');
  const names=a.g('__k');assert.equal(names.length,2,JSON.stringify(names));
  for(const n of names)assert.ok(a.g(`JUNIOR_INCIDENTS.some(x=>x.name===${JSON.stringify(n)})`),n);
  a.g('__k=[];hire("eng");hire("mm");restaff();juniorIncidents()');assert.equal(a.g('__k.length'),0,'supervised');
});

test('incidents land when their dialog closes and say what they cost', () => {
  const a=load({dialogs:true});quiet(a.g);
  a.g('subs={"49:0":100};paying=100;cash=10000;month=30;staff=[];hire("jeng");restaff();cash=10000');
  a.g('withFx(()=>JUNIOR_INCIDENTS.find(x=>x.name==="Billing bug").fire())');
  assert.equal(a.g('cash'),10000);assert.match(a.el('ev-text').textContent,/refunds/i);
  a.el('ev').close();assert.ok(a.g('cash')<10000);
});

test('juniors survive save and load', () => {
  const a=load();a.g('cash=1e6;peak=1e5;hireJunior("intern");hireJunior("jeng");save()');
  const b=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(b.g('heads("intern")'),1);assert.equal(b.g('heads("jeng")'),1);
});
