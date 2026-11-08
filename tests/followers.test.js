const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const quiet=g=>g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
// One post's clicks: the visitors it queues.
const clicks=g=>{g('queue=[];postReady=0;post()');return g('queue.length')};

test('a new company has FOLLOW0 (400) followers', () => {
  const {g}=load();
  assert.equal(g('FOLLOW0'),400);assert.equal(g('followers'),400);
});

test('clicks scale with followers', () => {
  const a=load({seed:5});a.g('POST_VIRAL=0');
  let lo=0,hi=0;
  for(let i=0;i<200;i++){a.g('followers=400');lo+=clicks(a.g);a.g('followers=4000');hi+=clicks(a.g)}
  const r=hi/lo;assert.ok(r>8&&r<12,String(r));
  assert.ok(lo/200>4&&lo/200<9,String(lo/200));
});

test('a post adds a small share of followers, more when it takes off', () => {
  const a=load({seed:9});
  a.g('POST_VIRAL=0;followers=400');clicks(a.g);
  assert.ok(Math.abs(a.g('followers')-400*(1+a.g('FOLLOW_GROW')))<1e-9,String(a.g('followers')));
  assert.ok(a.g('FOLLOW_GROW')<=.01);
  a.g('POST_VIRAL=1;followers=400');clicks(a.g);
  assert.ok(Math.abs(a.g('followers')-400*(1+a.g('FOLLOW_GROW*FOLLOW_VIRAL')))<1e-9,String(a.g('followers')));
});

test('followers drift away without posts', () => {
  const a=load();quiet(a.g);
  a.months(12);
  const want=400*(1-a.g('FOLLOW_DECAY'))**12;
  assert.ok(Math.abs(a.g('followers')-want)<2,`${a.g('followers')} vs ${want}`);
});

test('posting often settles higher than posting rarely', () => {
  const run=every=>{const a=load({seed:2});quiet(a.g);a.g('POST_VIRAL=0');
    for(let m=0;m<80;m++){if(m%every===0)a.g('postReady=0;post()');a.frames(10000,50)}return a.g('followers')};
  const often=run(2),rarely=run(8);
  assert.ok(often>rarely,`${often} ${rarely}`);
  assert.ok(often>400&&rarely<390,`${often} ${rarely}`);
});

test('followers show on the post card and survive save and load', () => {
  const a=load();quiet(a.g);
  a.g('followers=1234.4');a.frames(32);
  assert.match(String(a.el('op-meta').textContent),/1,234 followers/);
  a.g('save()');
  const b=load({save:JSON.parse(a.store.get('funnel-drop-save-v1'))});
  assert.ok(Math.abs(b.g('followers')-1234.4)<1,String(b.g('followers')));
});
