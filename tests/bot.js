// Balance script, not a test. Runs a greedy player headless through tests/harness.js.
// Usage:
//   node tests/bot.js early              months 6 and 12 of a greedy social-ads start
//   node tests/bot.js [months=600] [variant] [step=50]
// Variants: (none) the full greedy policy; idle stops buying after $10M peak and keeps payroll;
// nomargin buys ads with no margin check and keeps renewing campaigns (Rule of 40 check).
// Frames are stepped at `step` ms (loop caps dt at 50 ms), so 50 runs about 3× faster than the game's 16 ms.
const {load}=require('./harness.js');
const mode=process.argv[2]||'600';

if(mode==='early'){
  const t=load();
  t.g('randomEvent=()=>{}');
  const report={};
  for(let m=1;m<=12;m++){
    for(let s=0;s<10;s++){ // ten decision points per game month
      t.g(`{const c=CHANNELS.find(x=>x.id==='social')||CHANNELS[0];if(cash>=c.cost)buyAd(c.id);if(performance.now()>=postReady)post()}`);
      t.frames(1000);
    }
    if(m===6||m===12)report[m]={mrr:Math.round(t.g('MRR()')),cash:Math.round(t.g('cash'))};
  }
  for(const m of [6,12])console.log(`month ${m}: MRR $${report[m].mrr}, cash $${report[m].cash}`);
  process.exit(0);
}

const months=+mode||600,variant=process.argv[3]||'full',step=+process.argv[4]||50;
if(!['full','idle','nomargin'].includes(variant)){console.error('unknown variant '+variant);process.exit(1)}
const t=load();
// The harness stubs setTimeout, which would drop referred friends. Run them at once instead.
t.g('setTimeout=f=>{f();return 0}');
// Drawing and most of the DOM HUD only cost time headless. Keep what hud() does to game state: peak and milestones.
t.g('draw=()=>{};hud=()=>{peak=Math.max(peak,MRR()*12*revMult());checkMilestone()}');
t.g(`var botBought=[];
function botStep(v){
  if(ipoFiled)return;
  const buy=(what)=>botBought.push(what);
  const net=()=>MRR()*(1-COST_TO_SERVE)-teamCost()-loanPay();
  const reserve=()=>teamCost()+loanPay()+MRR()*COST_TO_SERVE; // keep a month of outgoings
  let next=Infinity; // cheapest purchase still to make
  if(ipoHold>=IPO.hold){fileIPO();return}
  if(performance.now()>=postReady)post();
  if(v==='idle'&&peak>=1e7)return;
  // Cheapest affordable upgrade: board tracks, SEO tiers and channel unlocks.
  for(;;){const o=[];
    for(const t of TRACKS)if(lvl[t.id]<3&&!trackHidden(t))o.push([costOf(t),()=>buyUpg(t.id),t.tiers[lvl[t.id]][0]]);
    if(seoLvl<3)o.push([SEO[seoLvl][1],buySeo,SEO[seoLvl][0]]);
    for(const c of CHANNELS)if(!c.open)o.push([c.unlock,()=>unlockCh(c.id),c.name]);
    o.sort((a,b)=>a[0]-b[0]);next=o.length?o[0][0]:Infinity;if(!o.length||cash-reserve()<o[0][0])break;o[0][1]();buy(o[0][2])}
  // Save for that purchase if 6 months of gross profit would cover it; ads only spend cash above the savings.
  const save=next<=6*MRR()*(1-COST_TO_SERVE)?next:0,spare=()=>cash-reserve()-save;
  if(seoLvl&&seoFresh<.5&&spare()>seoCost())publish();
  // Roles (incl. account manager) at 3 once unlocked.
  for(const r of ROLES)while(peak>=r.at&&heads(r.id)<ROLE_MAX&&spare()>=r.salary){hire(r.id);buy(r.id)}
  // CSMs to cover customers.
  while(peak>=CSM.at&&heads('csm')*CSM.covers<paying&&spare()>=CSM.salary){hire('csm');buy('csm')}
  while(heads('csm')&&(heads('csm')-1)*CSM.covers>=paying)fire('csm');
  // Marketing managers while net cash flow stays positive after the hire.
  while(peak>=MM.at&&net()-MM.salary>0&&spare()>=MM.salary){hire('mm');buy('mm')}
  // Ads on every open channel while 3-month margin stays above 10% (no check in nomargin), from cash above the savings. Down to half reach, then one new campaign.
  const m=margin3();
  // nomargin keeps renewing campaigns while spare cash lasts (at most 50 per channel per decision, to bound the run time).
  const camps=v==='nomargin'?50:1;
  if(v==='nomargin'||m==null||m>.1)for(const c of CHANNELS){if(!c.open)continue;let camp=0;
    for(;;){if(c.reach>=c.base/2){if(spare()<c.cost)break;buyAd(c.id);botAds++}
      else if(camp<camps&&spare()>=c.camp){newCampaign(c.id);camp++}else break}}
}
var botAds=0;`);
const fm=v=>v==null?'–':(v*100).toFixed(0)+'%';
const money=v=>t.g(`fmt(${v})`);
const crossed={};let filed=null;const marks=[[1e6,'$1M'],[1e7,'$10M'],[1e8,'$100M'],[1e9,'$1B']];
const start=Date.now();let r40miss=0,r40seen=0;
for(let m=1;m<=months;m++){
  for(let s=0;s<10;s++){t.g(`botStep('${variant}')`);t.frames(1000,step)}
  const peak=t.g('peak');for(const [v,n] of marks)if(peak>=v&&crossed[n]==null)crossed[n]=m;
  if(filed==null&&t.g('ipoFiled'))filed=m;
  if(t.g('MRR()*12')>=1e8){const r=t.g('rule40()');if(r!=null){r40seen++;if(r<40)r40miss++}}
  if(m%12===0||filed===m){
    const s=t.g(`({mrr:MRR(),val:MRR()*12*revMult(),cash,m:margin3(),nrr:NRR12(),y:yoy(),r40:rule40(),team:staff.length,csm:heads('csm'),mm:heads('mm'),paying,lv:TRACKS.map(t=>lvl[t.id]).join(''),ads:botAds,hold:ipoHold,bought:botBought.splice(0).reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{})})`);
    const b=Object.entries(s.bought).map(([k,n])=>n>1?k+'×'+n:k).join(', ');
    console.log(`m${String(m).padStart(3)} MRR ${money(s.mrr).padStart(8)} val ${money(s.val).padStart(8)} cash ${money(s.cash).padStart(8)} margin ${fm(s.m).padStart(5)} NRR ${fm(s.nrr).padStart(4)} yoy ${fm(s.y).padStart(5)} R40 ${s.r40==null?'–':Math.round(s.r40)} paying ${s.paying} team ${s.team} (csm ${s.csm}, mm ${s.mm}) lvl ${s.lv} ads ${s.ads} hold ${s.hold}${b?' | bought: '+b:''}`);
  }
  if(filed!=null)break;
}
console.log(`variant ${variant}: `+marks.map(([,n])=>`${n} at ${crossed[n]??'–'}`).join(', ')+`, IPO filed at ${filed??'never'} (game months). Rule of 40 below 40 in ${r40miss} of ${r40seen} months at $100M+ ARR. ${((Date.now()-start)/1000).toFixed(0)}s`);
