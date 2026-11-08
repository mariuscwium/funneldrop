const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} vs ${b}`);
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
// Count visitors that ad spend sends in, instead of simulating them.
const counted=a=>{a.g('__n=0;spawn=o=>{__n++}');return a};

test('one ad’s worth of budget matches one bought ad', () => {
  const a=counted(load());
  a.g('peak=0;cash=1e6;CHANNELS[0].reach=CHANNELS[0].base');
  const k=a.g('adCost(CHANNELS[0])'),v=a.g('perAd(CHANNELS[0])'),r=a.g('CHANNELS[0].reach');
  a.g(`adSpend(CHANNELS[0],${k})`);
  assert.equal(a.g('__n'),v);
  near(a.g('CHANNELS[0].reach'),r*a.g('DECAY'));
  assert.equal(a.g('cash'),1e6-k);assert.equal(a.g('spend'),k);near(a.g('ads'),1);near(a.g('CHANNELS[0].ads'),1);
});

test('fractions add up: two half ads send one ad of visitors', () => {
  const a=counted(load());
  a.g('peak=0;cash=1e6;CHANNELS[0].reach=CHANNELS[0].base');
  const k=a.g('adCost(CHANNELS[0])'),r=a.g('CHANNELS[0].reach');
  a.g(`adSpend(CHANNELS[0],${k/2});adSpend(CHANNELS[0],${k/2})`);
  // Reach falls a little during the first half, so the second half brings slightly fewer: 96 to 100.
  assert.ok(a.g('__n')>=96&&a.g('__n')<=100,String(a.g('__n')));
  near(a.g('CHANNELS[0].reach'),r*a.g('DECAY'));
});

test('a daily budget spends per game day', () => {
  const a=counted(load());quiet(a.g);
  a.g('cash=1e6;setBudget("social",30)');
  a.months(1);
  near(a.g('spend'),900,30);near(a.g('1e6-cash'),900,30);
  assert.ok(a.g('__n')>0);
});

test('ads never overdraw, and say so once', () => {
  const a=counted(load());quiet(a.g);
  a.g('__m=[];say=t=>__m.push(t);cash=50;setBudget("social",1000)');
  a.months(.5);
  assert.ok(a.g('cash')>=0&&a.g('cash')<50,String(a.g('cash')));assert.ok(a.g('spend')>0);
  assert.equal(a.g('__m.filter(t=>/paused/i.test(t)).length'),1);
});

test('no spending after filing or an ending, and no new budgets', () => {
  const a=counted(load());quiet(a.g);
  a.g('cash=1e6;setBudget("social",100);ipoFiled=true');
  a.months(1);assert.equal(a.g('cash'),1e6);
  a.g('setBudget("social",500)');assert.equal(a.g('CHANNELS[0].budget'),100);
  const b=counted(load());quiet(b.g);
  b.g('cash=1e6;setBudget("social",100);over={kind:"runway",month:0,story:[],snap:[]}');
  b.months(1);assert.equal(b.g('cash'),1e6);
});

test('closed channels take no budget', () => {
  const a=load();
  a.g('setBudget("search",100)');assert.equal(a.g('CHANNELS[1].budget'),0);
});

test('slider maps 0 to nothing and the top to BUDGET_MAX_ADS ads a day, and back', () => {
  const {g}=load();
  const k=g('adCost(CHANNELS[0])');
  assert.equal(g('budgetAt(CHANNELS[0],0)'),0);
  near(g('budgetAt(CHANNELS[0],1)'),k*.01);
  near(g(`budgetAt(CHANNELS[0],${g('BUDGET_STEPS')})`),k*g('BUDGET_MAX_ADS'));
  let prev=-1;for(let p=0;p<=1000;p+=37){const b=g(`budgetAt(CHANNELS[0],${p})`);assert.ok(b>prev);prev=b}
  for(const p of [0,1,250,600,1000])assert.equal(g(`budgetPos(CHANNELS[0],budgetAt(CHANNELS[0],${p}))`),p);
  assert.equal(g(`budgetPos(CHANNELS[0],${k*1000})`),1000);
});

test('budgets survive save and load', () => {
  const a=load();
  a.g('setBudget("social",42);save()');
  const b=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(b.g('CHANNELS[0].budget'),42);
});

test('broke means paused: income trickling in doesn’t restart ads until a day’s budget is covered', () => {
  const a=load();a.g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
  a.g('__n=0;spawn=o=>{if(o&&o.src)__n++};subs={"49:0":20};paying=20;cash=0;setBudget("social",500)');
  // 20 customers bring about $33 a game day: never a whole day of a $500 budget within the first few days.
  a.frames(3000);
  assert.equal(a.g('__n'),0,'no ad visitors while broke');
  assert.ok(a.g('adsBroke'));
  a.g('cash=600');a.frames(300);
  assert.ok(a.g('__n')>0,'ads resume once a day is covered');
});
