const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {load}=require('./harness.js');
const WORDS=/\b(good|evil|lawful|chaotic|alignment|ethic\w*)\b|dark pattern/i;
// Gives the company a fake owned node with the given alignment.
const setAl=(a,al)=>a.g(`NODE_IX.t_al={id:'t_al',al:${JSON.stringify(al)}};owned={start:1,t_al:1};paying=100;ads=1;cash=1e6`);
const tally=(a,good)=>{const c={};for(let i=0;i<2000;i++){const n=a.g(`pickEvent(${good}).name`);c[n]=(c[n]||0)+1}return c};

test('companyAl is the count-weighted mean, ignoring start', () => {
  const a=load();
  assert.equal(a.g('JSON.stringify(companyAl())'),'[0,0]');
  a.g("NODE_IX.p={id:'p',al:[1,0]};NODE_IX.q={id:'q',al:[0,-1]};owned={start:1,p:2,q:1}");
  const [g,l]=a.g('companyAl()');
  assert.ok(Math.abs(g-2/3)<1e-9&&Math.abs(l+1/3)<1e-9);
});

test('exposure makes Regulator fine more likely, and none means it never fires', () => {
  const a=load({seed:7});
  setAl(a,[0,0]);
  const none=tally(a,false)['Regulator fine']||0;
  assert.equal(none,0);
  setAl(a,[-1,0]);
  const hit=tally(a,false)['Regulator fine']||0;
  assert.ok(hit>=2*Math.max(none,1),`${hit}`);
});

test('Enterprise deal leads good events for a lawful-leaning company', () => {
  const a=load({seed:11});
  setAl(a,[-.3,1]);
  const c=tally(a,true);
  const top=Object.entries(c).sort((x,y)=>y[1]-x[1])[0][0];
  assert.equal(top,'Enterprise deal');
});

test('new bad events need exposure', () => {
  const a=load();
  setAl(a,[0,0]);
  assert.equal(a.g("EVENTS.filter(e=>e.al&&!e.good&&(!e.when||e.when())).length"),0);
});

test('alHist gains one entry a month and round-trips', () => {
  const a=load();
  a.g("NODE_IX.p={id:'p',al:[.333333,-.5]};owned={start:1,p:1}");
  a.months(3);
  assert.ok(a.g('alHist.length')>=3);
  assert.equal(a.g('JSON.stringify(alHist[0])'),'[0.33,-0.5]');
  const n=a.g('alHist.length');
  a.g('save()');
  const b=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(b.g('alHist.length'),n);
});

test('no alignment words in names, descriptions, event text or markup', () => {
  const a=load();
  setAl(a,[0,0]);
  const nodes=a.g('NODES.map(n=>n.name+" "+n.desc)');
  for(const s of nodes)assert.ok(!WORDS.test(s),s);
  const evs=a.g('EVENTS.map(e=>e.name)');
  for(const s of evs)assert.ok(!WORDS.test(s),s);
  a.g('EVENTS.forEach(e=>{e.__t=e.run()})');
  for(const s of a.g('EVENTS.map(e=>e.__t)'))assert.ok(!WORDS.test(s),s);
  const html=fs.readFileSync(path.join(__dirname,'..','Funnel Drop.html'),'utf8').replace(/<p class="src">[\s\S]*?<\/p>|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,'');
  assert.ok(!WORDS.test(html),html.match(WORDS)?.[0]);
});
