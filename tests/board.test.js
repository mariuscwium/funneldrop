const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
const setAl=(a,al)=>a.g(`NODE_IX.t_al={id:'t_al',al:${JSON.stringify(al)}};owned={start:1,t_al:ALIGN_SCALE};paying=100;ads=1;cash=1e6`);
const fresh='board={conf:BOARD_START,last:0,why:[],pend:[],shipped:false,ult:null,lastUlt:null,warned:false}';
const run=(a,n)=>{for(let i=0;i<n;i++){a.months(1.05);while(a.el('ev').open)a.el('ev').close()}};

test('no board before $1M', () => {
  const a=load({dialogs:true});quiet(a.g);a.g('peak=5e5;checkMilestone()');
  assert.equal(a.g('board'),null);a.el('ev').close();
  a.g('peak=1e6;checkMilestone()');
  assert.equal(a.g('board.conf'),70);assert.match(a.g('$("ev-text").textContent'),/investors now sit on a board/);
});
test('stale months cost up to 5 a month', () => {
  const a=load();quiet(a.g);a.g(fresh);
  a.g('staleOn=true;stale=STALE_GRACE+9');
  assert.equal(a.g('JSON.stringify(boardReasons().find(r=>r[0]=="Nothing shipped"))'),'["Nothing shipped",-5]');
  a.g('stale=STALE_GRACE+2');
  assert.equal(a.g('boardReasons().find(r=>r[0]=="Nothing shipped")[1]'),-2);
});
test('shipping adds 2', () => {
  const a=load();quiet(a.g);a.g(fresh);a.g('board.shipped=true;boardMonth()');
  assert.equal(a.g('JSON.stringify(board.why)'),'[["Shipped",2]]');assert.equal(a.g('board.conf'),72);
  assert.equal(a.g('board.shipped'),false);
});
test('buying a node counts as shipping', () => {
  const a=load();quiet(a.g);a.g(fresh);a.g("nodeState=()=>'available';rp=99;cash=1e9;buyNode(Object.keys(NODE_IX).find(k=>k!=='start'))");
  assert.equal(a.g('board.shipped'),true);
});
test('drift toward 60 when nothing else', () => {
  const a=load();quiet(a.g);a.g(fresh);
  a.g('board.conf=50;staleOn=false;growth=0;ledger=Array(13).fill({rev:0,out:0,mrr:0});boardMonth()');
  assert.equal(a.g('board.conf'),51);assert.equal(a.g('JSON.stringify(board.why)'),'[["Steady",1]]');
  a.g('board.conf=60;boardMonth()');assert.equal(a.g('board.conf'),60);
});
test('scandal hits 1.5x for a chaotic company', () => {
  const a=load();quiet(a.g);a.g(fresh);setAl(a,[0,-.5]);a.g("boardHit('x',-6)");
  assert.equal(a.g('board.pend[0][1]'),-9);
  setAl(a,[0,0]);a.g("board.pend=[];boardHit('x',-6)");assert.equal(a.g('board.pend[0][1]'),-6);
});
test('the bridge queues -15', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(fresh);a.g('paying=1;subs={"49:0":1};out[4]=1;cash=-5e3;insolvent=1');
  assert.equal(a.g('takeBridge()'),true);assert.equal(a.g('board.pend[0][1]'),-15);
});
test('warning, ultimatum, ouster', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(fresh);a.g('boardMonth=()=>{}');a.g('board.conf=19');
  const m=a.g('month');run(a,1);
  assert.equal(a.g('board.ult'),m+1+6);
  assert.ok(a.g("warnLog.some(w=>w.cause==='board')"));
  assert.equal(a.g('over'),null);
  run(a,6);
  assert.equal(a.g('over.kind'),'board');
  assert.ok(a.g('over.story.length')>1);
});
test('recovery clears the ultimatum, and a repeat is shorter', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(fresh);a.g('boardMonth=()=>{}');a.g('board.conf=19');run(a,1);
  assert.notEqual(a.g('board.ult'),null);
  a.g('board.conf=45');run(a,1);
  assert.equal(a.g('board.ult'),null);assert.notEqual(a.g('board.lastUlt'),null);
  a.g('board.conf=19');run(a,1);
  assert.equal(a.g('board.ult-month'),4);
});
test('lawful companies get 9 months', () => {
  const a=load();quiet(a.g);a.g(fresh);setAl(a,[0,.5]);assert.equal(a.g('ultMonths()'),9);
  setAl(a,[0,-.5]);assert.equal(a.g('ultMonths()'),4);
  setAl(a,[0,0]);assert.equal(a.g('ultMonths()'),6);
});
test('old save past $1M gets a fresh board without a warning', () => {
  const a=load();quiet(a.g);a.g('peak=2e6;save()');
  const save=JSON.parse(a.store.get('funnel-drop-save-v1'));delete save.board;
  const b=load({save,dialogs:true});
  assert.equal(b.g('board.conf'),70);assert.equal(b.g('warnLog.length'),0);
});
test('board round-trips mid-ultimatum', () => {
  const a=load();quiet(a.g);a.g('peak=2e6');a.g(fresh);a.g('board.conf=17;board.ult=month+3;save()');
  const b=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(b.g('board.conf'),17);assert.equal(b.g('board.ult-month'),3);
});
test('filed company is never ousted', () => {
  const a=load({dialogs:true});quiet(a.g);a.g(fresh);a.g('ipoFiled=true;board.conf=0;board.ult=month');a.months(2);
  assert.equal(a.g('over'),null);
});
