const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {load}=require('./harness.js');
const WORDS=/\b(good|evil|lawful|chaotic|alignment|ethic\w*)\b|dark pattern/i;
// Gives the company a fake owned node, ALIGN_SCALE times, so companyAl() equals the given alignment.
const setAl=(a,al)=>a.g(`NODE_IX.t_al={id:'t_al',al:${JSON.stringify(al)}};owned={start:1,t_al:ALIGN_SCALE};paying=100;ads=1;cash=1e6`);
const tally=(a,good)=>{const c={};for(let i=0;i<2000;i++){const n=a.g(`pickEvent(${good}).name`);c[n]=(c[n]||0)+1}return c};

test('companyAl is summed exposure over ALIGN_SCALE, clamped, ignoring start', () => {
  const a=load();
  assert.equal(a.g('JSON.stringify(companyAl())'),'[0,0]');
  const K=a.g('ALIGN_SCALE');
  a.g("NODE_IX.p={id:'p',al:[1,0]};NODE_IX.q={id:'q',al:[0,-1]};owned={start:1,p:2,q:1}");
  const [g,l]=a.g('companyAl()');
  assert.ok(Math.abs(g-2/K)<1e-9&&Math.abs(l+1/K)<1e-9,`${g} ${l}`);
  a.g("owned={start:1,p:99,q:99}");
  assert.equal(a.g('JSON.stringify(companyAl())'),'[1,-1]');
  a.g("NODE_IX.z={id:'z',al:[0,0]};owned={start:1,p:2,q:1,z:50}");
  assert.ok(Math.abs(a.g('companyAl()[0]')-2/K)<1e-9,'neutral nodes do not dilute');
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
  a.g("NODE_IX.p={id:'p',al:[.333333,-.5]};owned={start:1,p:ALIGN_SCALE}");
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
  const html=fs.readFileSync(path.join(__dirname,'..','Funnel Drop.html'),'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,'').replace('Lenny calls good for SMB','Lenny calls healthy for SMB');
  assert.ok(!WORDS.test(html),html.match(WORDS)?.[0]);
});

test('no alignment words in warnings, endings, rulings or the end screen', () => {
  const a=load({dialogs:true});
  a.g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
  a.g("__t=[];{const w=warn,e=endGame,s=showEv;warn=(c,t,x,act)=>{__t.push(t,x,act&&act.label);w(c,t,x,act)};endGame=(k,t,x)=>{__t.push(t,x);e(k,t,x)};showEv=(k,kind,n,t,act,again)=>{__t.push(n,t);s(k,kind,n,t,act,again)}}");
  const clear=()=>{a.g('over=null;ipoFiled=false;warnLog=[];evQueue.length=0;if($("ev").open)$("ev").close();if($("over").open)$("over").close()');};
  // insolvency, with both bridge offers, and the end
  for(const al of [[0,0],[.5,0]]){setAl(a,al);a.g('peak=RISK_AT;msLvl=1;subs={"49:0":10};paying=10;out[4]=10;cash=-1e6;insolvent=0;bridgeUsed=false');
    for(let i=0;i<a.g('INSOLVENT_MONTHS');i++){a.g('rollRisk()');clear()}}
  clear();
  // soft-lock
  a.g('cash=0;ads=3;paying=0;subs={};balls.length=0;queue.length=0;seoLvl=0;softMonths=0;insolvent=0;__cp=canPost;canPost=()=>false');
  for(let i=1;i<a.g('SOFTLOCK_MONTHS');i++){a.g('rollRisk()');clear()}a.g('rollRisk()');
  assert.equal(a.g('over.kind'),'runway');
  for(const s of [a.el('over-title').textContent,a.el('over-story').innerHTML,a.el('over-stats').innerHTML,a.el('over').textContent])assert.ok(s&&!WORDS.test(s),s);
  clear();a.g('canPost=__cp');
  // board warning and ultimatum, in each stance
  for(const al of [[0,0],[0,.5],[0,-.5]]){setAl(a,al);a.g('peak=2e6;board=freshBoard();board.conf=19;warnLog=[]');a.g('boardMonth=()=>{}');a.g('rollRisk()');clear();a.g('board.ult=month;rollRisk()');clear()}
  // case rulings in every band and axis
  for(const axis of [0,1])for(const x of [-.2,-.5,-.9]){setAl(a,axis?[0,x]:[x,0]);a.g(`subs={"49:2":100,"49:0":100};paying=200;out[4]=200;lawCase={axis:${axis},due:0}`);a.g('ruleCase()');clear()}
  // the case events
  a.g("evSeen={'Regulator fine':1,'Data breach':1}");
  for(const [al,n] of [[[-.9,0],'Investigation opened'],[[0,-.9],'Security audit ordered']]){setAl(a,al);a.g(`lawCase=null;pickEvent=()=>EVENTS.find(e=>e.name==='${n}');randomEvent=${'()=>{const e=pickEvent(),t=e.run();warn("shut",e.name,t)}'};randomEvent()`);clear()}
  const texts=a.g('__t').filter(Boolean);
  assert.ok(texts.length>25,String(texts.length));
  for(const s of texts)assert.ok(!WORDS.test(s),s);
  for(const s of a.g('Object.values(ENDINGS)'))assert.ok(!WORDS.test(s),s);
});
