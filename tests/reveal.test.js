const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const WORDS=/\b(good|evil|lawful|chaotic|alignment|ethic\w*)\b|dark pattern/i;
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
const pts=html=>(html.match(/<polyline[^>]*points="([^"]*)"/)||[,''])[1].trim().split(/\s+/).filter(Boolean);

test('archetype bands at the .15 threshold', () => {
  const {g}=load();
  const n=(a,b)=>g(`revealArch(${a},${b}).name`);
  assert.equal(n(.5,.5),'The trusted name');
  assert.equal(n(.15,0),'The friendly one');
  assert.equal(n(.3,-.3),'The scrappy favourite');
  assert.equal(n(0,.2),'The steady operator');
  assert.equal(n(.14,-.14),'Middle of the road');
  assert.equal(n(0,-.5),'The hustler');
  assert.equal(n(-.4,.4),'The cold machine');
  assert.equal(n(-.15,0),'The squeezer');
  assert.equal(n(-1,-1),'The wrecking ball');
  for(const a of [-1,0,1])for(const b of [-1,0,1])assert.ok(g(`revealArch(${a},${b}).line`).length>10);
});

test('path starts at the centre and has one point per month', () => {
  const {g}=load();
  g('alHist=[[0,0],[.2,.1],[.4,-.2]]');
  const p=pts(g('revealHtml()'));
  assert.equal(p.length,4);
  assert.equal(p[0],'100,100');
  // users up, process right: [.4,-.2] → x left of centre, y above it
  const [x,y]=p[3].split(',').map(Number);
  assert.ok(x<100&&y<100,p[3]);
});

test('empty history still plots the current position', () => {
  const {g}=load();
  g("alHist=[];NODE_IX.t={id:'t',al:[1,0]};owned={start:1,t:ALIGN_SCALE}");
  const p=pts(g('revealHtml()'));
  assert.equal(p.length,2);
  assert.notEqual(p[1],'100,100');
  assert.match(g('revealHtml()'),/The friendly one/);
});

test('year marks every 12 months', () => {
  const {g}=load();
  g('alHist=Array.from({length:30},(_,i)=>[i/100,0])');
  assert.equal((g('revealHtml()').match(/class="yr"/g)||[]).length,2);
});

test('choices rank owned nodes by how far they moved the company', () => {
  const {g}=load();
  g("NODE_IX.a={id:'a',name:'Alpha',al:[-.5,0]};NODE_IX.b={id:'b',name:'Beta',al:[0,.2]};NODE_IX.c={id:'c',name:'Gamma',al:[.1,.1]};NODE_IX.d={id:'d',name:'Delta',al:[.3,-.6]};NODE_IX.z={id:'z',name:'Zero',al:[0,0]};owned={start:1,a:1,b:3,c:1,d:1,z:5}");
  const m=g('revealMoments()');
  assert.equal(m.map(x=>x.name).join(),'Delta,Beta,Alpha');
  assert.match(m[0].how,/kinder to users/);
  assert.match(m[0].how,/faster and looser/);
  assert.match(m[2].how,/harder on users/);
  assert.match(m[1].how,/more careful/);
  g('owned={start:1,z:2}');
  assert.equal(g('revealMoments().length'),0);
});

test('what it led to lists only the events met', () => {
  const {g}=load();
  g("evSeen={'Regulator fine':2,'Customers rave':1,'Press mention':4}");
  assert.deepEqual(g('JSON.stringify(revealLed())'),JSON.stringify([['Regulator fine',2],['Customers rave',1]]));
  assert.match(g('revealHtml()'),/What it led to/);
  g('evSeen={}');
  assert.doesNotMatch(g('revealHtml()'),/What it led to/);
});

test('both end screens show the reveal', () => {
  const a=load();quiet(a.g);
  a.g('alHist=[[.1,.2]];endGame("runway","Ran out of runway","x")');
  assert.match(String(a.el('over-reveal').innerHTML),/<svg/);
  const b=load();quiet(b.g);
  b.g('alHist=[[.1,.2]];ipoHold=IPO.hold;fileIPO()');
  assert.match(String(b.el('sum-reveal').innerHTML),/<svg/);
});

test('reveal text never names what it measures', () => {
  const {g}=load();
  for(const [u,p] of [[1,1],[1,0],[1,-1],[0,1],[0,0],[0,-1],[-1,1],[-1,0],[-1,-1]]){
    g(`NODE_IX.t={id:'t',name:'Node',al:[${u},${p}]};owned={start:1,t:ALIGN_SCALE};alHist=[[${u},${p}]];evSeen=Object.fromEntries(EVENTS.map(e=>[e.name,1]))`);
    const t=g('revealHtml()').replace(/<[^>]*>/g,' ');
    assert.ok(!WORDS.test(t),t.match(WORDS)?.[0]);
  }
});
