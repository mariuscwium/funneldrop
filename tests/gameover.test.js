const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');

test('endGame pauses the game and blocks buying', () => {
  const a=load({dialogs:true});quiet(a.g);a.frames(32);
  a.g("endGame('runway','x','y')");
  assert.equal(a.el('over').open,true);
  const m=a.g('month'),c=a.g('cash');a.months(1.05);
  assert.equal(a.g('month'),m);assert.equal(a.g('cash'),c);
  const n=a.g('staff.length');
  a.g('setBudget("social",100);hire("csm");buyNode("acq1");borrow("card")');
  assert.equal(a.g('cash'),c);assert.equal(a.g('staff.length'),n);
});
test('endGame keeps the cause\'s last three warnings and adds the ending', () => {
  const a=load({dialogs:true});quiet(a.g);
  a.g("warn('runway','a','1');warn('runway','b','2');warn('runway','c','3');warn('board','d','4');warn('runway','e','5');endGame('runway','t','end')");
  const s=a.g('over.story');
  assert.equal(s.length,4);assert.ok(s.every(x=>x.cause==='runway'));
  assert.equal(s.at(-1).text,'end');assert.equal(s[0].text,'2');
});
test('no ending after filing', () => {
  const a=load({dialogs:true});a.g("ipoFiled=true;endGame('board','x','y')");
  assert.equal(a.g('over'),null);assert.equal(a.g('atRisk()'),false);
});
test('over round-trips and reopens', () => {
  const a=load({dialogs:true});quiet(a.g);a.g("endGame('runway','x','y')");a.g('save()');
  const save=JSON.parse(a.store.get('funnel-drop-save-v1'));
  const b=load({save,dialogs:true});
  assert.equal(b.g('over.kind'),'runway');assert.equal(b.el('over').open,true);
});
test('a warning raised while #ev is open waits for it', () => {
  const a=load({dialogs:true});
  a.g("showEv('bad','Bad news','A','a')");a.g("warn('runway','W','w')");
  assert.equal(a.el('ev-title').textContent,'A');
  a.el('ev').close();
  assert.equal(a.el('ev-title').textContent,'W');
});
test('reloading into the ending banks no milestone', () => {
  const a=load({dialogs:true});quiet(a.g);a.g("endGame('runway','x','y')");a.g('save()');
  const save=JSON.parse(a.store.get('funnel-drop-save-v1'));save.peak=2e6;save.rp=3;
  const b=load({save,dialogs:true});b.frames(64);
  assert.equal(b.g('rp'),3);assert.equal(b.el('ev').open,false);assert.equal(b.el('price').disabled,true);
});

const run=(a,n)=>{for(let i=0;i<n;i++){a.months(1.05);if(a.el('ev').open)a.el('ev').close()}};
const broke='peak=RISK_AT;msLvl=1;subs={"49:0":10};paying=10;out[4]=10;cash=-1e6';
test('INSOLVENT_MONTHS insolvent rollovers in a row end the run', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(broke);
  for(let i=0;i<=a.g('INSOLVENT_MONTHS')&&!a.g('over');i++){a.months(1.05);if(a.el('ev').open)a.el('ev').close()}
  assert.equal(a.g('over.kind'),'runway');assert.ok(a.g('over.story[0].month')<a.g('over.month'));
});
test('a solvent month resets the count', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(broke);run(a,2);
  assert.equal(a.g('insolvent'),2);a.g('cash=1e6');a.months(1.05);
  assert.equal(a.g('insolvent'),0);assert.equal(a.g('over'),null);
});
test('no insolvency before the first customer or loan', () => {
  const a=load({dialogs:true});quiet(a.g);a.g('peak=RISK_AT;msLvl=1;cash=-100;out[4]=0');a.months(4.05);
  assert.equal(a.g('over'),null);assert.equal(a.g('insolvent'),0);
});
test('no insolvency or bridge below RISK_AT peak valuation', () => {
  const a=load({dialogs:true});quiet(a.g);a.g('subs={"49:0":10};paying=10;out[4]=10;cash=-1e4;LOANS[0].bal=1000;LOANS[0].pay=100;LOANS[0].late=1');
  assert.ok(a.g('peak')<a.g('RISK_AT'));
  for(let i=0;i<a.g('INSOLVENT_MONTHS')+2;i++){a.months(1.05);if(a.el('ev').open)a.el('ev').close();a.g('cash=-1e4')}
  assert.equal(a.g('over'),null);assert.equal(a.g('insolvent'),0);assert.equal(a.g('bridgeOffer()'),false);assert.ok(a.g('cash')<0,'stays overdrawn');
  a.g('peak=RISK_AT;msLvl=1');a.months(1.05);assert.equal(a.g('insolvent'),1);
});
test('a late loan counts as insolvent', () => {
  const a=load({dialogs:true});quiet(a.g);a.g('peak=RISK_AT;msLvl=1;LOANS[0].bal=1000;LOANS[0].pay=100;LOANS[0].late=1;cash=0;out[4]=1');a.months(1.05);
  assert.ok(a.g('insolvent')>=1);
});
const lock='cash=0;ads=3;paying=0;subs={};balls.length=0;queue.length=0';
test('soft-lock waits for organic traffic', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(lock+';seoLvl=1;seoFresh=1;seoRoll=1');
  for(let i=0;i<3;i++){a.months(1.05);if(a.el('ev').open)a.el('ev').close();a.g(lock+';seoLvl=1;seoFresh=1;seoRoll=1')}
  assert.equal(a.g('over'),null);
  const b=load({dialogs:true});quiet(b.g);b.g(lock+';seoLvl=0;canPost=()=>false');
  run(b,b.g('SOFTLOCK_MONTHS'));
  assert.equal(b.g('over.kind'),'runway');
});
test('insolvency round-trips', () => {
  const a=load({dialogs:true});quiet(a.g);a.g('insolvent=2;softMonths=1');a.g('save()');
  const save=JSON.parse(a.store.get('funnel-drop-save-v1'));
  const b=load({save,dialogs:true});assert.equal(b.g('insolvent'),2);assert.equal(b.g('softMonths'),1);
});
test('runway readout', () => {
  const a=load({dialogs:true});quiet(a.g);a.g('subs={"49:0":10};paying=10;cash=1000;payroll=2000');
  assert.ok(a.g('netFlow()')<0);assert.equal(a.g('runway()'),a.g('cash/-netFlow()'));
  a.g('payroll=0');assert.ok(a.g('netFlow()')>=0);assert.equal(a.g('runway()'),null);
});
test('a rollover that raises an event and a warning shows both', () => {
  const a=load({dialogs:true});quiet(a.g);a.g("{const r=rollRisk;rollRisk=()=>{r();showEv('bad','Bad news','Evt','x')}}");a.g(broke);
  a.months(1.05);
  const t1=a.el('ev-title').textContent;assert.ok(a.el('ev').open);a.el('ev').close();
  const t2=a.el('ev-title').textContent;
  assert.deepEqual([t1,t2].sort(),['Evt','You can’t pay your bills'].sort());
});
for(const [name,month] of [['annual review',11],['random event',3]]) test(`an ending skips the ${name} in its rollover`, () => {
  const a=load({dialogs:true});quiet(a.g);
  a.g(`ads=1;month=${month};globalThis.called=[];annualReview=()=>called.push('review');randomEvent=()=>called.push('event');Math.random=()=>0;rollRisk=()=>endGame('runway','x','y')`);
  a.months(1.05);
  assert.equal(a.g('over.kind'),'runway');assert.equal(a.g('called.length'),0);assert.equal(a.el('ev').open,false);
});
test('runway readout in the hud', () => {
  const a=load({dialogs:true});quiet(a.g);a.g('subs={"49:0":10};paying=10;cash=1000;payroll=2000');a.frames(32);
  assert.equal(a.el('cRunway').hidden,false);assert.match(a.el('cRunway').textContent,/^\d+\.\d months$/);
  a.g('cash=-500');a.frames(32);assert.equal(a.el('cRunway').textContent,'0.0 months');
  a.g('payroll=0');a.frames(32);assert.equal(a.el('cRunway').hidden,true);
});

const setAl=(a,al)=>a.g(`NODE_IX.t_al={id:'t_al',al:${JSON.stringify(al)}};owned={start:1,t_al:ALIGN_SCALE};paying=100;ads=1;cash=1e6`);
const brink='peak=RISK_AT;msLvl=1;subs={"49:0":10};paying=10;out[4]=10;cash=-1e5';
const bridge=a=>a.g("LOANS.find(l=>l.id==='bridge')");
test('bridge is offered once and repays like a loan', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(brink);
  assert.equal(a.g('bridgeOffer()'),false);
  a.months(1.05);
  assert.equal(a.g('insolvent'),1);assert.equal(a.g('bridgeOffer()'),true);
  assert.match(a.el('ev-text').textContent,/45%/);
  assert.equal(a.el('ev-act').hidden,false);assert.equal(a.el('ev-act').textContent,'Take it');
  const c=a.g('cash'),s=a.g('bridgeSize()');assert.ok(s>=a.g('BRIDGE_MIN')&&s%500===0);assert.ok(c+s>=0,'clears the overdraft');
  assert.equal(a.g('takeBridge()'),true);
  assert.equal(a.g('cash'),c+s);
  const b=bridge(a);assert.equal(b.apr,.45);assert.equal(b.name,'Emergency bridge');
  assert.equal(b.bal,s);assert.ok(Math.abs(b.pay-a.g(`pmt(${s},.45,12)`))<1e-6);
  assert.equal(a.g('takeBridge()'),false);assert.equal(a.g('bridgeOffer()'),false);
});
test('the warning button runs takeBridge and closes the dialog', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(brink);a.months(1.05);
  const c=a.g('cash');a.g('useEvAct()');
  assert.equal(a.g('bridgeUsed'),true);assert.ok(a.g('cash')>c);assert.equal(a.el('ev').open,false);
});
test('the action button hides again for later dialogs', () => {
  const a=load({dialogs:true});
  a.g("showEv('bad','Warning','A','a',{label:'Go',run(){}})");a.g("showEv('good','Good news','B','b')");
  assert.equal(a.el('ev-act').hidden,false);a.el('ev').close();
  assert.equal(a.el('ev-title').textContent,'B');assert.equal(a.el('ev-act').hidden,true);
});
test('prepay for a company that treats users well', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[.5,0]);a.g(brink);a.months(1.05);
  assert.match(a.el('ev-text').textContent,/customers offered to prepay a year/);
  assert.doesNotMatch(a.el('ev-text').textContent,/45%/);
  assert.equal(a.g('takeBridge()'),true);
  const b=bridge(a);assert.equal(b.apr,0);assert.equal(b.name,'Customer prepayments');
});
test('bridge never shows as a card and borrow refuses it', () => {
  const a=load({dialogs:true});quiet(a.g);a.g('cash=1000;borrow("bridge")');
  assert.equal(a.g('cash'),1000);assert.equal(bridge(a).bal,0);
  assert.equal(a.g('takeBridge()'),false);
});
test('bridgeUsed and an active prepay bridge round-trip', () => {
  const a=load({dialogs:true});quiet(a.g);setAl(a,[.5,0]);a.g(brink);a.months(1.05);a.g('takeBridge()');a.g('save()');
  const save=JSON.parse(a.store.get('funnel-drop-save-v1'));
  const b=load({save,dialogs:true});
  assert.equal(b.g('bridgeUsed'),true);
  const x=bridge(b);assert.equal(x.apr,0);assert.equal(x.name,'Customer prepayments');assert.ok(x.bal>0);
});
test('no soft-lock while a free post can bring visitors', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(lock+';seoLvl=0');
  assert.equal(a.g('canPost()'),true);assert.equal(a.g('softLocked()'),false);
  a.g('postReady=performance.now()+1e4');assert.equal(a.g('softLocked()'),false,'cooling down still counts');
  run(a,a.g('SOFTLOCK_MONTHS')+1);assert.equal(a.g('over'),null);assert.equal(a.g('softMonths'),0);
});
test('the bridge covers the overdraft plus burn', () => {
  const a=load();quiet(a.g);a.g('subs={"49:0":10};paying=10;out[4]=10;cash=-2e4;insolvent=1');
  const n=a.g('netFlow()'),s=a.g('bridgeSize()');
  assert.ok(s>=2e4+a.g('BRIDGE_MONTHS')*Math.max(0,-n)-1,String(s));assert.equal(s%500,0);
  a.g('cash=-100');assert.equal(a.g('bridgeSize()'),a.g('r500(BRIDGE_MIN*Math.pow(mkt(),AD_PRICE_P))'));
});
test('a lost game cannot file for the IPO, and the ending cannot be dismissed', () => {
  const a=load({dialogs:true});quiet(a.g);
  a.g("peak=EXP_AT;ipoHold=IPO.hold;endGame('runway','x','y')");a.g('ipoHud()');
  assert.equal(a.el('ipo-file').hidden,true);
  a.g('fileIPO()');assert.equal(a.g('ipoFiled'),false);
  let prevented=false;a.el('over').on.cancel({preventDefault(){prevented=true}});assert.equal(prevented,true);
});
test('the insolvency countdown shows in the Company panel', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(broke);a.g('cash=-100');
  a.frames(32);assert.equal(a.el('cInsol').hidden,true);
  a.months(1.05);if(a.el('ev').open)a.el('ev').close();a.frames(32);
  assert.equal(a.el('cInsol').hidden,false);assert.equal(a.el('cInsol').className,'warn');
  assert.equal(a.el('cInsol').textContent,`closes in ${a.g('INSOLVENT_MONTHS-1')} months`);
  a.g('insolvent=INSOLVENT_MONTHS-1');a.frames(32);assert.equal(a.el('cInsol').textContent,'closes in 1 month');
});
test('a second warning comes a month before the insolvency ending', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(broke);
  a.g('insolvent=INSOLVENT_MONTHS-2');a.months(1.05);
  assert.equal(a.g('insolvent'),a.g('INSOLVENT_MONTHS-1'));
  assert.match(a.el('ev-text').textContent,/one more month/i);
  a.el('ev').close();a.months(1.05);
  assert.equal(a.g('over.kind'),'runway');assert.ok(a.g("over.story.filter(w=>w.cause==='runway').length")>=2);
});
test('the first insolvency warning counts the remaining months and offers no loan pay-down', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(broke);a.months(1.05);
  const t=a.el('ev-text').textContent;
  assert.ok(t.includes(`${a.g('INSOLVENT_MONTHS-1')} more months`));assert.ok(!/pay down/i.test(t));
});
test('an ending on a rollover leaves the rest of the frame alone', () => {
  const a=load({dialogs:true});quiet(a.g);
  a.g("hire('csm');hire('csm');hire('csm');cash=1e4;nextCut=1e12;globalThis.s0=null;rollRisk=()=>endGame('runway','x','y');{const e=endGame;endGame=(...x)=>{e(...x);cash=0;nextCut=0;globalThis.s0=[cash,staff.length]}}");
  a.months(1.05);
  assert.equal(a.g('over.kind'),'runway');assert.deepEqual(a.g('[cash,staff.length]'),a.g('s0'));
});

test('the bridge offer reads Take it or Don’t take it; other dialogs Continue', () => {
  const a=load({dialogs:true});a.g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
  a.g('subs={"49:0":10};paying=10;out[4]=10;peak=2e5;cash=-5000;eventT=MONTH-.01');a.frames(32);
  assert.equal(a.el('ev-title').textContent,'You can’t pay your bills');
  assert.equal(a.el('ev-act').textContent,'Take it');assert.equal(a.el('ev-ok').textContent,'Don’t take it');
  a.el('ev').close();a.g("showEv('good','Good news','Fine','x')");
  assert.equal(a.el('ev-ok').textContent,'Continue');
});
