const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{}');

test('no checks before $1M', () => {
  // 100 customers keep valuation (and so peak) well under $1M; with 12,000 hud would lift peak past it.
  const a=load();quiet(a.g);
  a.g('peak=0;subs={"49:0":100};paying=100;cash=1e6');
  a.months(1.1);
  assert.ok(a.g('peak')<1e6);
  assert.equal(a.g('into[5]'),0);
});

test('about a twelfth checked', () => {
  const a=load();quiet(a.g);
  a.g('peak=1e6;churn=0;subs={"49:0":12000};paying=12000;cash=1e7');
  a.months(1.1);
  const n=a.g('into[5]');
  assert.ok(n>=900&&n<=1100,'checked '+n);
});

test('checks run every month, not only at month 12', () => {
  const a=load();quiet(a.g);
  a.g('peak=1e6;subs={"49:0":12000};paying=12000;cash=1e7;month=11;eventT=0');
  a.months(1.1);
  assert.ok(a.g('into[5]')>=900);
});

test('checked balls carry their group and enter board 5', () => {
  const a=load();quiet(a.g);
  a.g('peak=1e6;subs={"79:1":1200};paying=1200;cash=1e7;balls=[]');
  a.months(1.05);
  const b=JSON.parse(a.g('JSON.stringify(balls.filter(o=>o.b===5).map(o=>o.sub))'));
  assert.ok(b.length>0);
  assert.ok(b.every(k=>k==='79:1'),b.join());
});

test('upgrade moves plan', () => {
  const {g}=load();
  g('subs={"49:0":5};paying=5;land({b:5,x:180,sub:"49:0",vx:0,vy:0})');
  assert.equal(g('subs["49:1"]'),1);assert.equal(g('subs["49:0"]'),4);
  assert.equal(g('out[5]'),1);assert.equal(g('paying'),5);
});

test('Enterprise can\'t upgrade', () => {
  const {g}=load();
  g('subs={"49:2":3};paying=3;land({b:5,x:180,sub:"49:2",vx:0,vy:0})');
  assert.deepEqual(JSON.parse(g('JSON.stringify(subs)')),{'49:2':3});
  assert.equal(g('out[5]'),0);
});

test('Base can\'t downgrade', () => {
  const {g}=load();
  g('subs={"49:0":3};paying=3;land({b:5,x:16,sub:"49:0",vx:0,vy:0});land({b:5,x:344,sub:"49:0",vx:0,vy:0})');
  assert.deepEqual(JSON.parse(g('JSON.stringify(subs)')),{'49:0':3});
});

test('downgrade moves plan', () => {
  const {g}=load();
  g('subs={"49:2":2};paying=2;land({b:5,x:16,sub:"49:2",vx:0,vy:0})');
  assert.deepEqual(JSON.parse(g('JSON.stringify(subs)')),{'49:2':1,'49:1':1});
  assert.equal(g('out[5]'),0);
});

test('same plan between the slots', () => {
  const {g}=load();
  g('subs={"49:1":2};paying=2;land({b:5,x:100,sub:"49:1",vx:0,vy:0})');
  assert.deepEqual(JSON.parse(g('JSON.stringify(subs)')),{'49:1':2});
});

test('emptied group counts as same plan', () => {
  const {g}=load();
  g('subs={};paying=0;land({b:5,x:180,sub:"49:0",vx:0,vy:0})');
  assert.deepEqual(JSON.parse(g('JSON.stringify(subs)')),{});
  assert.equal(g('out[5]'),0);
});

test('odds path uses track and downgrade rates', () => {
  const {g}=load();
  g('peak=1e6;balls=Array(MAX_BALLS).fill({b:9});var _n=20000,_run=()=>{subs={"49:1":100000};paying=100000;out[5]=0;for(let i=0;i<_n;i++){const o=enter(5,0);o.sub="49:1";spawn(o)}};_run()');
  const u=g('subs["49:2"]||0'),d=g('subs["49:0"]||0');
  assert.ok(Math.abs(u-2400)<200,'upgrades '+u);
  assert.ok(Math.abs(d-760)<120,'downgrades '+d);
  assert.equal(g('out[5]'),u);
  g('lvl.exp=3;zone(5);_run()');
  const u3=g('subs["49:2"]||0');
  assert.ok(Math.abs(u3-4800)<250,'tier 3 upgrades '+u3);
});

test('track costs are its own', () => {
  const {g}=load();
  g('peak=1e6;cash=60000;buyUpg("exp")');
  assert.equal(g('cash'),10000);assert.equal(g('lvl.exp'),1);
  g('cash=200000;buyUpg("exp")');
  assert.equal(g('lvl.exp'),1,'tier 2 costs $250k');
  assert.equal(g('JSON.stringify(TRACKS.find(t=>t.id==="exp").costs)'),'[50000,250000,1000000]');
});

test('cost display and disabled state use the track costs', () => {
  const {g}=load();
  g('peak=1e6;cash=20000;renderUpg();hud()');
  assert.equal(g('$("u-exp").disabled'),true);
  assert.equal(g('$("u-acq").disabled'),false);
  g('renderUpg()');
  const s=g('$("upglist").innerHTML');
  assert.match(s,/id="u-exp"[^>]*--exp/);
  assert.match(s,/\$50\.0k/);
});

test('exp card hidden before $1M', () => {
  const {g}=load();
  g('peak=0;hud()');assert.equal(g('$("u-exp").hidden'),true);
  g('peak=1e6;hud()');assert.equal(g('$("u-exp").hidden'),false);
});

test('zone(5) widens with tier and am', () => {
  const {g}=load();
  const w=()=>g('BOARDS[5].zones[0][1]-BOARDS[5].zones[0][0]');
  near(w(),43);
  g('lvl.exp=1;zone(5)');near(w(),56);
  g('month=0;eventT=0;hire("am");month=10;zone(5)');
  near(w(),56*(1+0.15*g('strength("am")')));
  near(g('rateOf(trackOf(5))'),.16*(1+0.15*g('strength("am")')));
});

test('am role', () => {
  const {g}=load();
  const r=JSON.parse(g('JSON.stringify(ROLES.find(r=>r.id==="am"))'));
  assert.equal(r.board,5);assert.equal(r.salary,9000);assert.equal(r.at,1e7);assert.equal(r.name,'Account manager');
});

test('churn track still at TRACKS index 5', () => {
  const {g}=load();
  const before=g('JSON.stringify(BOARDS[4].zones)');
  assert.equal(g('TRACKS[5].id'),'churn');
  assert.equal(g('trackOf(4).id'),'rev');
  assert.equal(g('trackOf(5).id'),'exp');
  g('zone(4)');assert.equal(g('JSON.stringify(BOARDS[4].zones)'),before);
});

test('upgrading ball turns exp colour', () => {
  const {g}=load();
  g('C.exp="gold";C.rev="green";balls=[];var _o={b:5,x:180,y:5*BH+WALLTOP+4,vx:0,vy:0,age:0,sub:"49:0"};balls.push(_o)');
  assert.equal(g('ballCol(_o)'),'green');
  g('physics(0.001)');
  assert.equal(g('ballCol(_o)'),'gold');
});

test('exp level saves and loads', () => {
  const a=load();a.g('lvl.exp=2;save()');
  const {g}=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(g('lvl.exp'),2);
  near(g('BOARDS[5].zones[0][1]-BOARDS[5].zones[0][0]'),67);
});
