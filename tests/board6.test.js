const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

test('old 5-board save pads into/out', () => {
  const a=load();a.g('into.splice(0,5,10,5,4,3,2);out.splice(0,5,5,4,3,2,1);save()');
  const s=JSON.parse(a.store.get('funnel-drop-save-v1'));
  s.into=s.into.slice(0,5);s.out=s.out.slice(0,5);
  const {g}=load({save:s});
  assert.equal(g('into.length'),6);assert.equal(g('out.length'),6);
  assert.equal(g('into[5]'),0);assert.equal(g('out[5]'),0);
  assert.equal(g('into[0]'),10);assert.equal(g('out[4]'),1);
});

test('board 6 locked below $1M', () => {
  const {g}=load();
  assert.equal(g('NB'),6);
  g('peak=999999');assert.equal(g('expOpen()'),false);
  g('peak=1e6');assert.equal(g('expOpen()'),true);
});

test('existing boards unchanged', () => {
  const {g}=load();
  assert.deepEqual(JSON.parse(g('JSON.stringify(BOARDS.slice(0,5).map(B=>B.zones))')),
    [[[168,192]],[[51,131],[229,309]],[[42,122],[238,318]],[[156,204]],[[122,238]]]);
  assert.deepEqual(JSON.parse(g('JSON.stringify(CENTERS)')),[[180],[91,269],[82,278],[180],[180],[180]]);
});

test('expansion board layout', () => {
  const {g}=load();
  const B=JSON.parse(g('JSON.stringify(BOARDS[5])'));
  assert.equal(B.name,'Expansion');assert.equal(B.bench,null);assert.equal(B.col,'exp');
  const w=g('EXP_W0');
  assert.deepEqual(B.zones,[[180-w/2,180+w/2]]);
  assert.deepEqual(JSON.parse(g('JSON.stringify(DOWN_ZONES)')),[[12,12+g('DOWN_W')],[348-g('DOWN_W'),348]]);
  assert.equal(g('EXP_AT'),1e6);
});

test('trackOf skips churn and board 5', () => {
  const {g}=load();
  assert.equal(g('trackOf(4).id'),'rev');assert.equal(g('trackOf(0).id'),'acq');
  assert.equal(g('trackOf(5)'),undefined);
  assert.equal(g('TRACKS[5].id'),'churn');
});

test('paying users finish at Revenue', () => {
  const {g}=load();
  g('balls=[];land({b:4,x:180,friend:0,vx:0,vy:0});land({b:4,x:5,friend:0,vx:0,vy:0})');
  assert.equal(g('into[5]'),0);
  assert.equal(g('balls.filter(o=>o.b===5).length'),0);
  assert.equal(g('paying'),1);
});

test('locked board header and label', () => {
  const {g}=load();
  g('var _t=[];ctx.fillText=s=>_t.push(String(s));peak=0;draw()');
  const t=JSON.parse(g('JSON.stringify(_t)'));
  assert.ok(t.includes('E · EXPANSION'));
  assert.ok(t.includes('Unlocks at $1M valuation'));
  assert.ok(t.includes('locked'));
  assert.ok(!t.some(s=>/NaN/.test(s)),t.join('|'));
  g('_t.length=0;peak=2e6;draw()');
  const u=JSON.parse(g('JSON.stringify(_t)'));
  assert.ok(!u.includes('Unlocks at $1M valuation'));
  assert.ok(!u.some(s=>/NaN|bench null/.test(s)),u.join('|'));
  assert.ok(u.some(s=>/^yours /.test(s)));
});

test('fits six boards at 750px tall', () => {
  const html=require('fs').readFileSync(require('path').join(__dirname,'..','Funnel Drop.html'),'utf8');
  const m=html.match(/canvas\{width:clamp\((\d+)px,calc\(\(100dvh - (\d+)px.*?\*360\/1224\)/);
  assert.ok(m,'fit clamp');
  const min=+m[1],chrome=+m[2];
  assert.ok(min*1224/360<=750-chrome,`min ${min}px is ${min*1224/360}px tall`);
  const {g}=load();
  g('cv.clientWidth=176;resize()');
  assert.ok(g('textK')>1.8,'textK '+g('textK'));
});

test('header text condenses rather than overflows', () => {
  const {g}=load();
  g('var _c=[];ctx.fillText=(...a)=>_c.push(a);peak=0;draw()');
  const c=JSON.parse(g('JSON.stringify(_c)'));
  for(const s of ['A · ACQUISITION','E · EXPANSION','locked','Unlocks at $1M valuation']){
    const a=c.find(x=>x[0]===s);assert.ok(a,s);assert.equal(typeof a[3],'number',s+' maxWidth')}
  const y=c.find(x=>/^yours /.test(x[0]));assert.equal(typeof y[3],'number');
});
