const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const WORDS=/\b(good|evil|lawful|chaotic|alignment|ethic\w*)\b|dark pattern/i;

test('every info target has a card with a title and at least two paragraphs', () => {
  const {g}=load();
  const keys=g('[...Object.values(INFO_AT),...INFO_FNL,...INFO_IPO]');
  assert.ok(keys.length>=35,String(keys.length));
  for(const k of keys){
    assert.ok(g(`!!INFO[${JSON.stringify(k)}]`),`no card for ${k}`);
    assert.ok(g(`INFO[${JSON.stringify(k)}].length`)>=3,`${k} needs a title and two paragraphs`);
  }
});

test('opening a card shows it and pauses the game; closing resumes', () => {
  const a=load({dialogs:true});a.g('randomEvent=()=>{};annualReview=()=>{};expCheck=()=>{}');
  a.g('openInfo("r40")');
  assert.equal(a.el('info').open,true);
  assert.equal(a.el('info-title').textContent,'Rule of 40');
  assert.match(String(a.el('info-body').innerHTML),/growth/);
  const m=a.g('month+eventT');a.months(1);assert.equal(a.g('month+eventT'),m);
  a.el('info').close();a.months(1);assert.ok(a.g('month+eventT')>m);
});

test('cards quote the game’s own numbers and never name what the hidden events track', () => {
  const {g}=load();
  assert.match(g('INFO.serve.join(" ")'),new RegExp(`${Math.round(g('COST_TO_SERVE')*100)}%`));
  assert.match(g('INFO.insol.join(" ")'),new RegExp(`${g('INSOLVENT_MONTHS')} months`));
  for(const k of g('Object.keys(INFO)')){const t=g(`INFO[${JSON.stringify(k)}].join(" ")`);assert.ok(!WORDS.test(t),`${k}: ${t.match(WORDS)?.[0]}`)}
});
