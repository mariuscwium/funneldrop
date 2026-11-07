const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

test('widthFor reproduces the tuned tier widths', () => {
  const {g}=load();
  for(const [b,r,w] of [[0,.105,38],[0,.145,50],[1,.455,102],[2,.566,98],[3,.20,91],[4,.475,180],[5,.24,80]])
    assert.ok(Math.abs(g(`widthFor(${b},${r})`)-w)<0.01,`board ${b}`);
});
test('base rate gives base width; above the cap clamps', () => {
  const {g}=load();
  for(let b=0;b<6;b++){assert.equal(g(`widthFor(${b},RATES[${b}].base)`),g(`BASEW[${b}]`));
    assert.equal(g(`widthFor(${b},9)`),g(`RATES[${b}].w.at(-1)[0]`))}
});
test('stacked bonuses stay inside physics limits', () => {
  const {g}=load();
  g('price=PRICE0');
  for(let b=0;b<6;b++){g(`bonus[${b}]=5;zone(${b})`);const z=g(`BOARDS[${b}].zones[0]`);
    assert.ok(z[1]-z[0]<=340);assert.ok(z[1]-z[0]<=g(`RATES[${b}].w.at(-1)[0]`)*g(`teamMult(${b})`)+1e-9)}
});
test('tables ascend and reach beyond tier 3', () => {
  const {g}=load();
  for(let b=0;b<6;b++){const w=JSON.parse(g(`JSON.stringify(RATES[${b}].w)`));
    for(let i=1;i<w.length;i++){assert.ok(w[i][0]>w[i-1][0]&&w[i][1]>w[i-1][1],`board ${b} point ${i}`)}
    assert.ok(w.length>=8,`board ${b}`);assert.equal(g(`rateCap(${b})`),w.at(-1)[1])}
});
test('cur adds the bonus and caps at the table', () => {
  const {g}=load();
  g('bonus[0]=.05');assert.ok(Math.abs(g('cur(RATES[0])')-.123)<1e-9);
  g('bonus[0]=5');assert.equal(g('cur(RATES[0])'),g('rateCap(0)'));
});
test('bought tiers still set the width through bonus', () => {
  const {g}=load();
  g('cash=1e9;buyUpg("acq")');assert.ok(Math.abs(g('BOARDS[0].zones[0][1]-BOARDS[0].zones[0][0]')-38)<.01);
  g('buyUpg("churn")');assert.equal(g('churn'),.047);
});
