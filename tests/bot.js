// Balance script, not a test. Runs a greedy player headless through tests/harness.js.
// Usage:
//   node tests/bot.js early              months 6 and 12 of a greedy social-ads start
//   node tests/bot.js [months=600] [variant] [step=50]
// Variants: (none) the full greedy policy; idle stops buying after $10M peak and keeps payroll;
// nomargin buys ads before any hiring, with no margin check and up to 3 campaign renewals per channel per decision (Rule of 40 check).
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
t.g(`var botBought={},botAds=0;
function botStep(v){
  if(ipoFiled)return;
  const buy=(what,n=1)=>botBought[what]=(botBought[what]||0)+n;
  const net=()=>MRR()*(1-COST_TO_SERVE)-teamCost()-loanPay();
  const reserve=()=>teamCost()+loanPay()+MRR()*cts(); // keep a month of outgoings
  let next=Infinity; // cheapest purchase still to make
  if(ipoHold>=IPO.hold){fileIPO();return}
  if(performance.now()>=postReady)post();
  if(v==='idle'&&peak>=1e7)return;
  // Cheapest affordable upgrade: roadmap nodes it has the points for, SEO tiers and channel unlocks.
  for(;;){const o=[];
    for(const n of NODES)if(nodeState(n.id)==='available'&&rp>=nodePts(n))o.push([nodeCash(n),()=>buyNode(n.id),n.name]);
    if(seoLvl<3)o.push([SEO[seoLvl][1],buySeo,SEO[seoLvl][0]]);
    for(const c of CHANNELS)if(!c.open)o.push([c.unlock,()=>unlockCh(c.id),c.name]);
    o.sort((a,b)=>a[0]-b[0]);next=o.length?o[0][0]:Infinity;if(!o.length||cash-reserve()<o[0][0])break;o[0][1]();buy(o[0][2])}
  // Save for that purchase if 6 months of gross profit would cover it; hires and ads only spend cash above the savings.
  const save=next<=6*MRR()*(1-COST_TO_SERVE)?next:0,spare=()=>cash-reserve()-save;
  if(seoLvl&&seoFresh<.5&&spare()>seoCost())publish();
  // Ads on every open channel down to half reach, then a new campaign: one per decision while 3-month margin is above 10%,
  // or in nomargin with no margin check and up to 3 renewals per channel per decision, while spare cash lasts.
  const runAds=()=>{const m=margin3(),camps=v==='nomargin'?3:1;if(v!=='nomargin'&&m!=null&&m<=.1)return;
    for(const c of CHANNELS){if(!c.open)continue;let camp=0;
      for(;;){if(c.reach>=c.base/2){if(spare()<adCost(c))break;buyAd(c.id);botAds++}
        else if(camp<camps&&spare()>=campCost(c)){newCampaign(c.id);camp++}else break}}};
  if(v==='nomargin')runAds(); // ads before any hiring
  // Roles (incl. account manager) at 3 once unlocked.
  for(const r of ROLES)while(peak>=r.at&&heads(r.id)<ROLE_MAX&&spare()>=r.salary){hire(r.id);buy(r.id)}
  // CSMs to cover customers: Cover all if affordable, else +10s, else single hires.
  if(peak>=CSM.at){const g=csmGap();
    if(g&&spare()>=g*CSM.salary)buy('csm',hireN('csm',g));
    else{while(csmGap()>=10&&spare()>=10*CSM.salary)buy('csm',hireN('csm',10));while(csmGap()&&spare()>=CSM.salary){hire('csm');buy('csm')}}}
  while(heads('csm')&&(heads('csm')-1)*CSM.covers>=paying)fire('csm');
  // Marketing managers while net cash flow stays positive after the hire, +10 at a time where it can.
  if(peak>=MM.at){while(net()-10*MM.salary>0&&spare()>=10*MM.salary)buy('mm',hireN('mm',10));while(net()-MM.salary>0&&spare()>=MM.salary){hire('mm');buy('mm')}}
  if(v!=='nomargin')runAds();
}`);
const fm=v=>v==null?'–':(v*100).toFixed(0)+'%';
const money=v=>t.g(`fmt(${v})`);
const crossed={};let filed=null;const marks=[[1e6,'$1M'],[1e7,'$10M'],[1e8,'$100M'],[1e9,'$1B']];
const start=process.cpuUsage();let r40miss=0,r40seen=0;
for(let m=1;m<=months;m++){
  for(let s=0;s<10;s++){t.g(`botStep('${variant}')`);t.frames(1000,step)}
  const peak=t.g('peak');for(const [v,n] of marks)if(peak>=v&&crossed[n]==null)crossed[n]=m;
  if(filed==null&&t.g('ipoFiled'))filed=m;
  if(t.g('MRR()*12')>=1e8){const r=t.g('rule40()');if(r!=null){r40seen++;if(r<40)r40miss++}}
  if(m%12===0||filed===m){
    const s=t.g(`({mrr:MRR(),val:MRR()*12*revMult(),cash,m:margin3(),nrr:NRR12(),y:yoy(),r40:rule40(),team:staff.length,csm:heads('csm'),mm:heads('mm'),paying,lv:Object.keys(owned).length-1,ads:botAds,hold:ipoHold,bought:(()=>{const b=botBought;botBought={};return b})()})`);
    const b=Object.entries(s.bought).map(([k,n])=>n>1?k+'×'+n:k).join(', ');
    console.log(`m${String(m).padStart(3)} MRR ${money(s.mrr).padStart(8)} val ${money(s.val).padStart(8)} cash ${money(s.cash).padStart(8)} margin ${fm(s.m).padStart(5)} NRR ${fm(s.nrr).padStart(4)} yoy ${fm(s.y).padStart(5)} R40 ${s.r40==null?'–':Math.round(s.r40)} paying ${s.paying} team ${s.team} (csm ${s.csm}, mm ${s.mm}) nodes ${s.lv} ads ${s.ads} hold ${s.hold}${b?' | bought: '+b:''}`);
  }
  if(filed!=null)break;
}
console.log(`variant ${variant}: `+marks.map(([,n])=>`${n} at ${crossed[n]??'–'}`).join(', ')+`, IPO filed at ${filed??'never'} (game months). Rule of 40 below 40 in ${r40miss} of ${r40seen} months at $100M+ ARR. ${(process.cpuUsage(start).user/1e6).toFixed(0)}s CPU`);
