const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const fs=require('fs'),path=require('path');

test('a new game opens the welcome and the clock waits for Start', () => {
  const a=load({dialogs:true,welcome:true});
  assert.equal(a.el('welcome').open,true);
  assert.match(fs.readFileSync(path.join(__dirname,'..','Funnel Drop.html'),'utf8'),/<b id="welcome-title">Welcome to Funnel Drop<\/b>/);
  a.months(1);assert.equal(a.g('month+eventT'),0);
  a.el('welcome').close();a.months(1.05);assert.ok(a.g('month')>=1);
});

test('a saved game skips the welcome', () => {
  const a=load();a.g('save()');
  const b=load({dialogs:true,welcome:true,save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.equal(b.el('welcome').open,false);
});
