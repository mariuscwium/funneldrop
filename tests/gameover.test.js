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
  a.g('buyAd("social");hire("csm");buyNode("acq1");borrow("card")');
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
