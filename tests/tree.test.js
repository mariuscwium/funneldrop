const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);

// A small fixture tree on top of the seeds: a fork off acq1, a node past an unowned seed, a repeatable and some effect nodes.
const node=o=>({name:'Test '+o.id,desc:'',area:0,ring:2,slot:0,links:['start'],fork:null,pts:1,cash:0,al:[0,0],fx:{},rep:false,...o});
const FIXTURE=[
  node({id:'fa',links:['acq1'],fork:'f1',slot:-.5,fx:{r0:.01}}),
  node({id:'fb',links:['acq1'],fork:'f1',slot:.5,fx:{r0:.02}}),
  node({id:'deep',area:1,links:['act1']}),
  node({id:'rep4',pts:4,rep:true}),
  node({id:'ch',area:2,rep:true,fx:{churn:-.1}}),
  node({id:'serve',area:4,fx:{cts:-.1}})
];
function tree(opts){const a=load(opts);a.g('randomEvent=()=>{};annualReview=()=>{}');a.g(`NODES.push(...${JSON.stringify(FIXTURE)});linkNodes()`);return a}

test('seed nodes reproduce tier 1', () => {
  const {g}=tree();
  g('rp=2;cash=5000;monthOut=0');
  assert.equal(g('buyNode("acq1")'),true);
  near(g('rateOf(trackOf(0))'),.105);
  near(g('BOARDS[0].zones[0][1]-BOARDS[0].zones[0][0]'),38,.01);
  assert.equal(g('cash'),3000);assert.equal(g('rp'),1);assert.equal(g('owned.acq1'),1);
  assert.equal(g('monthOut'),2000,'cash goes through spendCash');
  assert.equal(g('nodeState("acq1")'),'owned');
  g('rp=1;cash=5000;buyNode("churn1")');
  near(g('churn'),.047,1e-4);
});

test('fork: taking one side locks the other', () => {
  const {g}=tree();
  g('rp=9;cash=1e6;buyNode("acq1")');
  assert.equal(g('nodeState("fa")'),'available');assert.equal(g('nodeState("fb")'),'available');
  assert.equal(g('buyNode("fa")'),true);
  assert.equal(g('nodeState("fa")'),'owned');assert.equal(g('nodeState("fb")'),'locked');
  const rp=g('rp'),cash=g('cash');
  assert.equal(g('buyNode("fb")'),false);
  assert.equal(g('rp'),rp);assert.equal(g('cash'),cash);assert.equal(g('owned.fb'),undefined);
  near(g('bonus[0]'),.042);
});

test('needs both points and cash', () => {
  const {g}=tree();
  const state=()=>g('JSON.stringify({owned,rp,cash,bonus,monthOut})');
  g('rp=0;cash=1e9');let s=state();
  assert.equal(g('buyNode("acq1")'),false);assert.equal(state(),s);
  g('rp=9;cash=0');s=state();
  assert.equal(g('buyNode("acq1")'),false);assert.equal(state(),s);
  g('rp=9;cash=1999');s=state();
  assert.equal(g('buyNode("acq1")'),false);assert.equal(state(),s);
  assert.equal(g('nodeState("acq1")'),'available');
});

test('unreachable and closed nodes cannot be bought', () => {
  const {g}=tree();
  g('rp=99;cash=1e9');
  assert.equal(g('nodeState("deep")'),'unreachable');
  assert.equal(g('buyNode("deep")'),false);assert.equal(g('owned.deep'),undefined);
  g('buyNode("act1")');assert.equal(g('nodeState("deep")'),'available');
  g('peak=5e5');
  assert.equal(g('nodeState("exp1")'),'closed');
  assert.equal(g('buyNode("exp1")'),false);assert.equal(g('owned.exp1'),undefined);
  g('peak=1e6');assert.equal(g('nodeState("exp1")'),'available');
  assert.equal(g('buyNode("exp1")'),true);
  near(g('rateOf(trackOf(5))'),.16);
  near(g('BOARDS[5].zones[0][1]-BOARDS[5].zones[0][0]'),56,.01);
});

test('repeatable cost rises by a point each time', () => {
  const {g}=tree();
  g('rp=9;cash=1e6');
  assert.equal(g('nodePts(nodeOf("rep4"))'),4);
  assert.equal(g('buyNode("rep4")'),true);assert.equal(g('rp'),5);
  assert.equal(g('nodePts(nodeOf("rep4"))'),5);
  assert.equal(g('nodeState("rep4")'),'available','a repeatable stays buyable');
  assert.equal(g('buyNode("rep4")'),true);assert.equal(g('rp'),0);assert.equal(g('owned.rep4'),2);
  assert.equal(g('nodePts(nodeOf("acq1"))'),1,'non-repeatables keep their price');
});

test('cash price scales with company size', () => {
  const {g}=tree();
  g('peak=1e5');assert.equal(g('nodeCash(nodeOf("acq1"))'),2000);
  g('peak=0');assert.equal(g('nodeCash(nodeOf("acq1"))'),2000);
  g('peak=1e7');near(g('nodeCash(nodeOf("acq1"))'),2000*100**.6,1e-6);
  near(g('nodeCash(nodeOf("exp1"))'),5e3*100**.6,1e-6);
  g('rp=9;cash=2000*100**.6-1');assert.equal(g('buyNode("acq1")'),false);
  g('cash+=1');assert.equal(g('buyNode("acq1")'),true);near(g('cash'),0,1e-6);
});

test('nothing can be bought after filing', () => {
  const {g}=tree();
  g('rp=99;cash=1e9;ipoFiled=true');
  assert.equal(g('buyNode("acq1")'),false);
  assert.equal(g('rp'),99);assert.equal(g('cash'),1e9);assert.equal(g('owned.acq1'),undefined);
});

test('effects sum and reach the game', () => {
  const {g,months}=tree();
  g('rp=99;cash=1e9');
  for(const id of ['ch','ch','serve'])assert.equal(g(`buyNode("${id}")`),true,id);
  // Relative effects multiply: two 10% cuts leave .9 × .9.
  near(g('FX.churn'),-.19);near(g('FX.cts'),-.1);
  near(g('churn'),.06*.81);
  near(g('paidChurn(PRICE0)'),.0486);
  // Cost to serve through FX: a month of 100 customers at $49 keeps 1 − 0.22 × 0.9 of revenue.
  g('churn=0;subs={};paying=0;addSub(49,0,100);paying=100;cash=0');
  months(1);
  const want=4900*(1-.22*.9),c=g('cash');
  assert.ok(Math.abs(c-want)/want<.01,`cash ${c} vs ${want}`);
});

test('the start node is owned and free; refx is idempotent', () => {
  const {g}=tree();
  assert.equal(g('nodeState("start")'),'owned');assert.equal(g('rp'),g('RP_START'));assert.equal(g('RP_START'),0);
  g('rp=9;cash=1e6;buyNode("rev1");buyNode("ret1")');
  const fx=g('JSON.stringify(FX)'),z=g('JSON.stringify(BOARDS.map(B=>B.zones))');
  g('refx();refx()');
  assert.equal(g('JSON.stringify(FX)'),fx);assert.equal(g('JSON.stringify(BOARDS.map(B=>B.zones))'),z);
  near(g('rateOf(trackOf(4))'),.40);near(g('rateOf(trackOf(2))'),.525);
});

test('seed nodes match tier 1 of every old track', () => {
  const {g}=load();
  const want={acq1:[0,.105],act1:[1,.455],ret1:[2,.525],ref1:[3,.20],rev1:[4,.40],exp1:[5,.16]};
  g('peak=1e6;rp=99;cash=1e9');
  for(const [id,[b,r]] of Object.entries(want)){
    const n=JSON.parse(g(`JSON.stringify(nodeOf("${id}"))`));
    assert.equal(n.ring,1);assert.equal(n.fork,null);assert.equal(n.pts,1);assert.equal(n.cash,id==='exp1'?5e3:2000);assert.equal(n.area,b);
    assert.equal(g(`buyNode("${id}")`),true);near(g(`rateOf(trackOf(${b}))`),r,1e-9)}
  assert.equal(g('nodeOf("churn1").area'),2,'churn seed sits in the Retention wedge');
});

test('effect keys reach their code', () => {
  const {g}=load();
  const fx=o=>g(`for(const k in FX)FX[k]=0;Object.assign(FX,${JSON.stringify(o)})`);
  g('peak=1e5');
  const ad=g('adCost(CHANNELS[0])'),camp=g('campCost(CHANNELS[0])'),per=g('perAd(CHANNELS[0])');
  fx({adCost:-.5,adReach:.5});
  near(g('adCost(CHANNELS[0])'),Math.round(ad/2/10)*10,10);near(g('campCost(CHANNELS[0])'),Math.round(camp/2/10)*10,10);
  assert.equal(g('perAd(CHANNELS[0])'),Math.round(per*1.5));
  fx({csm:.2});assert.equal(g('csmCovers()'),180);
  fx({custRef:1});near(g('custRefer()'),.02);
  g('price=150');fx({});const pc=g('priceConv()'),ch=g('priceChurn(150)');
  fx({priceTol:.5});near(g('priceConv()'),1+(pc-1)/2);near(g('priceChurn(150)'),1+(ch-1)/2);
  fx({priceTol:5});near(g('priceConv()'),1+(pc-1)*.2,1e-12);
  g('price=PRICE0;seoLvl=1;seoFresh=1');fx({});const s=g('seoBase()');fx({seo:.3});near(g('seoBase()'),s*1.3);
  fx({refSize:1});g('var _r=[];for(let i=0;i<500;i++)_r.push(referred())');
  assert.ok(g('_r.every(n=>n>=2&&n<=50)'));
  fx({evGood:1});g('var _k=[];showEv=k=>_k.push(k);for(let i=0;i<40;i++)randomEvent()');
  assert.ok(g('_k.length===40&&_k.every(k=>k==="good")'));
});
