const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
const setAl=(a,al)=>a.g(`NODE_IX.t_al={id:'t_al',al:${JSON.stringify(al)}};owned={start:1,t_al:ALIGN_SCALE};paying=100;ads=1;cash=1e6`);
const run=(a,n)=>{for(let i=0;i<n;i++){if(a.el('ev').open)a.el('ev').close();a.months(1.05);if(a.el('ev').open)a.el('ev').close()}};
const when=(a,name)=>a.g(`EVENTS.find(e=>e.name==='${name}').when()`);
const INV='Investigation opened',AUD='Security audit ordered';

test('neutral companies never open a case', () => {
  const a=load();setAl(a,[0,0]);a.g("evSeen={'Regulator fine':3,'Data breach':3}");
  assert.ok(!when(a,INV));assert.ok(!when(a,AUD));
});
test('needs a prior fine or lawsuit', () => {
  const a=load();setAl(a,[-.6,0]);a.g('evSeen={}');
  assert.ok(!when(a,INV));
  a.g("evSeen={'Class action':1}");assert.ok(when(a,INV));
  a.g("lawCase={axis:0,due:99}");assert.ok(!when(a,INV));
});
test('audit needs a breach and process exposure', () => {
  const a=load();setAl(a,[0,-.6]);a.g('evSeen={}');assert.ok(!when(a,AUD));
  a.g("evSeen={'Data breach':1}");assert.ok(when(a,AUD));
});
test('bands', () => {
  const a=load();
  assert.equal(a.g('caseBand(-.3)'),'closed');assert.equal(a.g('caseBand(-.5)'),'order');assert.equal(a.g('caseBand(-.7)'),'shut');
  assert.equal(a.g('caseBand(-.4)'),'order');assert.equal(a.g('caseBand(-.71)'),'shut');
});
test('events are counted once, also when queued', () => {
  const a=load({dialogs:true});quiet(a.g);a.g("evSeen={}");
  a.g("showEv('bad','Bad news','X','a')");a.g("showEv('bad','Bad news','Y','b')");a.g("showEv('good','Good news','Z','c')");a.g("showEv('bad','Warning','W','w')");a.g("showEv('bad','Milestone','M','m')");
  a.el('ev').close();a.el('ev').close();a.el('ev').close();
  assert.equal(a.g('JSON.stringify(evSeen)'),'{"X":1,"Y":1,"Z":1}');
});
test('ruling reads exposure at ruling time', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[-.8,0]);a.g('subs={"49:0":100};paying=100;out[4]=100');
  a.g("lawCase={axis:0,due:month+12}");
  setAl(a,[-.5,0]);a.g('subs={"49:0":100};paying=100;out[4]=100');
  a.g('__sp=[];const o=spendCash;spendCash=n=>{__sp.push([n,MRR()]);o(n)}');run(a,13);
  assert.equal(a.g('over'),null);assert.equal(a.g('lawCase'),null);
  const CF=a.g('CASE_FINE');assert.ok(a.g('__sp').some(([n,m])=>Math.abs(n-CF*m)<m*.01),'paid CASE_FINE months of MRR (consent order, not shut or closed)');
});
test('consent order costs CASE_FINE months of MRR and customers', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[-.5,0]);a.g('subs={"49:0":100};paying=100;out[4]=100;lawCase={axis:0,due:0}');
  const c=a.g('cash'),m=a.g('MRR()'),p=a.g('paying');a.g('ruleCase()');
  assert.ok(Math.abs(c-a.g('CASE_FINE')*m-a.g('cash'))<1);assert.ok(a.g('paying')<p);assert.equal(a.g('lawCase'),null);
});
test('closed case is good news', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[-.2,0]);a.g('lawCase={axis:0,due:0}');
  const c=a.g('cash');a.g('ruleCase()');assert.equal(a.g('cash'),c);assert.equal(a.el('ev-kind').textContent,'Good news');assert.equal(a.g('lawCase'),null);
});
test('shut ends the run with a warning first', () => {
  const a=load({dialogs:true});a.g('__re=randomEvent');quiet(a.g);setAl(a,[-.9,0]);a.g("evSeen={'Regulator fine':1}");
  a.g("lawStrikes=[1,0];pickEvent=()=>EVENTS.find(e=>e.name==='Investigation opened');__re()");
  assert.equal(a.g("warnLog.filter(w=>w.cause==='shut').length"),1);
  assert.equal(a.el('ev-kind').textContent,'Warning');assert.equal(a.g('lawCase'),null,'the case opens as the warning closes');
  a.el('ev').close();assert.equal(a.g('lawCase.axis'),0);
  run(a,12);
  assert.equal(a.g('over.kind'),'shut');assert.ok(a.g('over.story.length')>=2);
  assert.equal(a.g('over.story.at(-1).text'),'A regulator ordered you to stop trading.');
});
test('audit shut text, and the audit warning', () => {
  const a=load({dialogs:true});a.g('__re=randomEvent');quiet(a.g);setAl(a,[0,-.9]);a.g("evSeen={'Data breach':1}");
  a.g("lawStrikes=[0,1];pickEvent=()=>EVENTS.find(e=>e.name==='Security audit ordered');__re()");
  run(a,12);
  assert.equal(a.g('over.story.at(-1).text'),'Your licence to process customer data was revoked.');
});
test('audit failure drops enterprise customers', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[0,-.5]);a.g('subs={"49:2":100,"49:0":100};paying=200;out[4]=200;lawCase={axis:1,due:0}');
  const l=a.g('flow.lost'),ch=a.g('churned');a.g('ruleCase()');
  assert.ok(a.g('subs["49:2"]')<100);assert.equal(a.g('subs["49:0"]'),100);
  assert.ok(a.g('flow.lost')>l);assert.ok(a.g('churned')>ch);assert.equal(a.g('paying'),a.g('subs["49:2"]')+100);
  assert.equal(a.el('ev-kind').textContent,'Bad news');
});
test('respec before the ruling changes the band', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[-.9,0]);a.g('lawCase={axis:0,due:0}');
  setAl(a,[-.1,0]);a.g('ruleCase()');assert.equal(a.g('over'),null);
});
test('case round-trips', () => {
  const a=load({dialogs:true});quiet(a.g);a.g("lawCase={axis:1,due:20};evSeen={'Data breach':2};lawStrikes=[0,1]");a.g('save()');
  const save=JSON.parse(a.store.get('funnel-drop-save-v1'));
  const b=load({save,dialogs:true});
  assert.equal(b.g('JSON.stringify(lawCase)'),'{"axis":1,"due":20}');assert.equal(b.g("evSeen['Data breach']"),2);assert.equal(b.g('JSON.stringify(lawStrikes)'),'[0,1]');
  const c=load();assert.equal(c.g('lawCase'),null);assert.equal(c.g('JSON.stringify(evSeen)'),'{}');assert.equal(c.g('JSON.stringify(lawStrikes)'),'[0,0]');
});
test('no ruling after filing', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[-.9,0]);a.g('lawCase={axis:0,due:0};ipoFiled=true');
  a.g('rollRisk()');assert.equal(a.g('over'),null);
});
test('company panel shows the countdown', () => {
  const a=load({dialogs:true});quiet(a.g);a.g("lawCase={axis:0,due:month+5}");a.g('hud()');
  assert.equal(a.el('cCase').hidden,false);assert.match(a.el('cCase').textContent,/ruling in 5 months/);
  a.g('lawCase=null;hud()');assert.equal(a.el('cCase').hidden,true);
});
test('consent order with no customers stays finite', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[-.5,0]);a.g('subs={};paying=0;lawCase={axis:0,due:0}');
  const t=a.g('ruleCase()');
  assert.equal(a.g("'undefined' in subs"),false);assert.equal(a.g('paying'),0);assert.ok(Number.isFinite(a.g('flow.lost')));
  assert.ok(!/NaN|undefined|0 of 0/.test(t),t);
});
test('audit text pluralises and drops an empty clause', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[0,-.5]);a.g('subs={"49:2":1};paying=1;lawCase={axis:1,due:0};binom=()=>1');
  assert.match(a.g('ruleCase()'),/, and 1 Enterprise customer left\.$/);
  a.g('subs={"49:0":5};paying=5;lawCase={axis:1,due:0}');
  assert.match(a.g('ruleCase()'),/cost \$[\d,.k]+\.$/);
});
test('a first shut-band ruling is an order, a second on the same axis shuts', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[-.9,-.9]);a.g('subs={"49:2":50,"49:0":100};paying=150;out[4]=150');
  assert.equal(a.g('JSON.stringify(lawStrikes)'),'[0,0]');
  a.g('lawCase={axis:0,due:0}');a.g('ruleCase()');
  assert.equal(a.g('over'),null);assert.equal(a.el('ev-title').textContent,'Consent order');assert.equal(a.g('JSON.stringify(lawStrikes)'),'[1,0]');
  a.el('ev').close();a.g('lawCase={axis:1,due:0}');a.g('ruleCase()');
  assert.equal(a.g('over'),null,'the other axis has no strike yet');assert.equal(a.el('ev-title').textContent,'Audit failed');
  a.el('ev').close();a.g('warnLog.push({cause:"shut",month,text:"w"});lawCase={axis:0,due:0}');a.g('ruleCase()');
  assert.equal(a.g('over.kind'),'shut');
});
