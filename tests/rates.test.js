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
test('seed nodes set the width through bonus', () => {
  const {g}=load();
  g('cash=1e9;rp=9;buyNode("acq1")');assert.ok(Math.abs(g('BOARDS[0].zones[0][1]-BOARDS[0].zones[0][0]')-38)<.01);
  g('buyNode("churn1")');assert.ok(Math.abs(g('churn')-.047)<1e-4);
});
test('slots stay clear of walls, each other and the Downgrade slots at the table end with full staff and best price', () => {
  const {g}=load();
  g('peak=1e9;cash=1e12;price=PRICE0;for(const r of ROLES)for(let i=0;i<30;i++)hire(r.id);month=1e3;restaff()');
  for(let b=0;b<6;b++){
    for(const pr of [30,49,55,80,150]){g(`price=${pr};bonus[${b}]=5;zone(${b})`);
      const z=JSON.parse(g(`JSON.stringify(BOARDS[${b}].zones)`));
      for(const [a,c] of z)assert.ok(a>=0&&c<=360&&c>a,`board ${b} price ${pr}`);
      for(let i=1;i<z.length;i++)assert.ok(z[i][0]>z[i-1][1],`board ${b} overlap`);
      if(b===5){const d=JSON.parse(g('JSON.stringify(DOWN_ZONES)'));assert.ok(z[0][0]>d[0][1]&&z[0][1]<d[1][0],'down overlap')}}}
});
// The table rate at width x, extended along its last segment past the end (independent of the game's rateAt).
const tableAt=(w,x)=>{if(x<=w[0][0])return w[0][1]*x/w[0][0];for(let i=1;i<w.length;i++)if(x<=w[i][0])return w[i-1][1]+(w[i][1]-w[i-1][1])*(x-w[i-1][0])/(w[i][0]-w[i-1][0]);
  const a=w.at(-2),c=w.at(-1);return c[1]+(c[1]-a[1])*(x-c[0])/(c[0]-a[0])};
test('rateOf follows the clamped slot: max bonus, 3 full-strength hires per role, best price', () => {
  const {g}=load();
  g('peak=1e9;price=4;for(const r of ROLES)for(let i=0;i<3;i++)hire(r.id);staff.forEach(e=>e.hired=-99);restaff()');
  for(let b=0;b<6;b++){g(`bonus[${b}]=5;zone(${b})`);
    const z=g(`BOARDS[${b}].zones[0]`),wd=z[1]-z[0],w=JSON.parse(g(`JSON.stringify(RATES[${b}].w)`)),r=g(`rateOf(RATES[${b}])`);
    assert.ok(wd<=g(`maxW(${b})`)+1e-9,`board ${b} width ${wd}`);
    assert.ok(r<=tableAt(w,wd)+1e-9,`board ${b}: ${r} vs table ${tableAt(w,wd)} at ${wd}px`);
    assert.ok(r<1,`board ${b}: ${r}`)}
});
test('rateOf is unchanged at base team and inside the table it reads the table', () => {
  const {g}=load();
  g('price=PRICE0');
  for(let b=0;b<6;b++)assert.ok(Math.abs(g(`rateOf(RATES[${b}])`)-g(`RATES[${b}].base`))<1e-12,`board ${b}`);
  g('peak=1e9;hire("pe");staff.forEach(e=>e.hired=-99);restaff();zone(2)');
  const z=g('BOARDS[2].zones[0]'),w=JSON.parse(g('JSON.stringify(RATES[2].w)'));
  assert.ok(Math.abs(g('rateOf(RATES[2])')-tableAt(w,z[1]-z[0]))<1e-12);
});
