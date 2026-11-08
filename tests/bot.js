// Balance script, not a test. Runs a greedy player headless through tests/harness.js.
// Usage:
//   node tests/bot.js early              months 6 and 12 of a greedy social-ads start
//   node tests/bot.js [months=600] [policy=full] [step=50]
// Policies: full buys the cheapest affordable roadmap node; growth prefers Acquisition and Referral nodes, retention Activation, Retention
// and churn nodes, enterprise Revenue and Expansion nodes, each taking fork options in its own areas first and otherwise the cheapest.
// idle plays full until $10M peak, then stops buying and keeps payroll; the board should oust it, and it must never file. nomargin buys
// ads before any hiring, with no margin check and up to 3 campaign renewals per channel per decision (Rule of 40 check). harsh is full,
// but weighs fork options that treat users worse (al[0] < 0) at 55% of their cash price, to drive users exposure down (case check).
// Every policy takes the emergency bridge when offered and stops at an ending.
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
const POLICIES=['full','growth','retention','enterprise','idle','nomargin','harsh'];
if(!POLICIES.includes(variant)){console.error('unknown policy '+variant+' (one of '+POLICIES.join(', ')+', early)');process.exit(1)}
const t=load();
// The harness stubs setTimeout, which would drop referred friends. Run them at once instead.
t.g('setTimeout=f=>{f();return 0}');
// Drawing and most of the DOM HUD only cost time headless. Keep what hud() does to game state: peak and milestones.
t.g('draw=()=>{};hud=()=>{peak=Math.max(peak,MRR()*12*revMult());checkMilestone()}');
// Count events by kind; the dialog never opens headless.
t.g(`var botEv={good:0,bad:0},botBad={},botCases=[];{const se=showEv;showEv=(k,kind,name,txt,...r)=>{if(kind==='Good news'||kind==='Bad news'){botEv[k==='bad'?'bad':'good']++;if(k==='bad')botBad[name]=(botBad[name]||0)+1}if(name==='Investigation opened'||name==='Security audit ordered')botCases.push({m:month,axis:name[0]==='I'?'investigation':'audit',out:null});se(k,kind,name,txt,...r)}}`);
// Cases: each opening (investigation or audit) with its month, and the band it was ruled in (on exposure at ruling time).
t.g(`{const rc=ruleCase;ruleCase=()=>{const c=botCases.at(-1);if(c&&c.out==null)c.out=caseBand(companyAl()[lawCase.axis]);return rc()}}`);
t.g(`var botBought={},botAds=0,botNodes=0,botBudget=0;
// From $1M peak, roadmap items come out of a budget of BOT_RD of revenue, kept for up to BOT_KEEP (24) months; before that, the cash rules below alone.
const BOT_RD=.15,BOT_KEEP=24;
// Build policies: the funnel areas a policy prefers (keystones count when either side is preferred). retention also prefers any node that cuts churn.
const BOT_AREAS={growth:[0,3],retention:[1,2],enterprise:[4,5]};
const botMine=(v,n)=>{const a=BOT_AREAS[v];if(!a)return false;return (Array.isArray(n.area)?n.area.some(x=>a.includes(x)):a.includes(n.area))||(v==='retention'&&(n.fx.churn||0)<0)};
// A policy weighs a node's cash price by its preference: fork options in its areas at 55%, its other nodes at 75%, the rest in full.
// harsh weighs only fork options with users exposure below 0, at 55%.
const botW=(v,n)=>v==='harsh'?(n.fork&&n.al[0]<0?.55:1):botMine(v,n)?(n.fork?.55:.75):1;
// The node to work toward, among those the points cap (and from $1M, BOT_KEEP months of roadmap budget) allows, by weighted price; ties at random so fork sides vary between runs. full takes the
// cheapest it has the points for. A policy waits for points for its pick unless they are at the cap (more would be wasted); then it takes
// the best it can buy now. The target may not be buyable yet (p > rp).
function botTarget(v){const late=peak>=1e6,c=NODES.filter(n=>nodeState(n.id)==='available'&&nodePts(n)<=rpCap()+1e-9&&(!late||nodeCash(n)<=BOT_KEEP*BOT_RD*MRR())).map(n=>({n,p:nodePts(n),k:nodeCash(n),s:nodeCash(n)*botW(v,n),z:Math.random()}));
  const now=c.filter(x=>x.p<=rp).sort((a,b)=>a.s-b.s||a.z-b.z);if(v==='full'||v==='harsh'||!c.length)return now[0]||null;
  const t=c.sort((a,b)=>a.s-b.s||a.z-b.z)[0];return t.p<=rp||rp<rpCap()-.5?t:now[0]||t}
// Points are short: below 3/4 of the cap, or some available node needs more points than the cap holds.
const botShort=()=>rp<.75*rpCap()||NODES.some(n=>nodeState(n.id)==='available'&&nodePts(n)>rpCap()+1e-9);
function botStep(v){
  if(over||ipoFiled)return;
  if(bridgeOffer())takeBridge();
  const buy=(what,n=1)=>botBought[what]=(botBought[what]||0)+n;
  const net=()=>MRR()*(1-cts())-teamCost()-loanPay();
  const reserve=()=>teamCost()+loanPay()+MRR()*cts(); // keep a month of outgoings
  let next=Infinity,nodeK=0; // cheapest purchase still to make; cash of the next node
  if(ipoHold>=IPO.hold){fileIPO();return}
  if(performance.now()>=postReady)post();
  if(v==='idle'&&peak>=1e7)return;
  const late=peak>=1e6;if(late)botBudget=Math.min(BOT_KEEP*BOT_RD*MRR(),botBudget+BOT_RD*MRR()/10); // botStep runs 10 times a game month
  // Cheapest affordable upgrade: the policy's next roadmap node (once it has the points), SEO tiers and channel unlocks.
  for(;;){const o=[],tg=botTarget(v);
    if(tg){nodeK=tg.k;if(tg.p<=rp&&(!late||botBudget>=tg.k))o.push([tg.k,()=>{if(buyNode(tg.n.id)){botNodes++;if(late)botBudget-=tg.k}},tg.n.name])}
    if(seoLvl<3)o.push([SEO[seoLvl][1],buySeo,SEO[seoLvl][0]]);
    for(const c of CHANNELS)if(!c.open)o.push([c.unlock,()=>unlockCh(c.id),c.name]);
    o.sort((a,b)=>a[0]-b[0]);next=o.length?o[0][0]:Infinity;if(!o.length||cash-reserve()<o[0][0])break;o[0][1]();buy(o[0][2])}
  // Save for that purchase if 6 months of gross profit would cover it; hires and ads only spend cash above the savings.
  // From $1M the unspent roadmap budget is kept back instead.
  const save=late?Math.min(botBudget,Math.max(0,cash-reserve())):next<=6*MRR()*(1-cts())?next:0,spare=()=>cash-reserve()-save;
  if(seoLvl&&seoFresh<.5&&spare()>seoCost())publish();
  // Ads on every open channel down to half reach, then a new campaign: one per decision while 3-month margin is above 10%,
  // or in nomargin with no margin check and up to 3 renewals per channel per decision, while spare cash lasts.
  const runAds=()=>{const m=margin3(),camps=v==='nomargin'?3:1;if(v!=='nomargin'&&m!=null&&m<=.1)return;
    for(const c of CHANNELS){if(!c.open)continue;let camp=0;
      for(;;){if(c.reach>=c.base/2){if(spare()<adCost(c))break;buyAd(c.id);botAds++}
        else if(camp<camps&&spare()>=campCost(c)){newCampaign(c.id);camp++}else break}}};
  if(v==='nomargin')runAds(); // ads before any hiring
  // Engineers while points are short (botShort) and net cash flow after the hire still covers the next node's cash within 6 months.
  if(peak>=ENG.at&&botShort()){const ok=n=>net()-n*ENG.salary>nodeK/6&&spare()>=n*ENG.salary;
    while(ok(10))buy('eng',hireN('eng',10));while(ok(1)){hire('eng');buy('eng')}}
  // Roles (incl. account manager) at 3 once unlocked.
  for(const r of ROLES)while(peak>=r.at&&heads(r.id)<ROLE_MAX&&spare()>=r.salary){hire(r.id);buy(r.id)}
  // CSMs to cover customers: Cover all if affordable, else +10s, else single hires.
  if(peak>=CSM.at){const g=csmGap();
    if(g&&spare()>=g*CSM.salary)buy('csm',hireN('csm',g));
    else{while(csmGap()>=10&&spare()>=10*CSM.salary)buy('csm',hireN('csm',10));while(csmGap()&&spare()>=CSM.salary){hire('csm');buy('csm')}}}
  while(heads('csm')&&(heads('csm')-1)*csmCovers()>=paying)fire('csm');
  // Marketing managers while net cash flow stays positive after the hire, +10 at a time where it can.
  if(peak>=MM.at){while(net()-10*MM.salary>0&&spare()>=10*MM.salary)buy('mm',hireN('mm',10));while(net()-MM.salary>0&&spare()>=MM.salary){hire('mm');buy('mm')}}
  if(v!=='nomargin')runAds();
}`);
const fm=v=>v==null?'–':(v*100).toFixed(0)+'%';
const money=v=>t.g(`fmt(${v})`);
const crossed={};let filed=null;const marks=[[1e6,'$1M'],[1e7,'$10M'],[1e8,'$100M'],[1e9,'$1B']];
const start=process.cpuUsage();let r40miss=0,r40seen=0,lastNode=null,gap=0,nodes0=0,ended=null,confMin=null,under40=0,bridge=null;
for(let m=1;m<=months;m++){
  for(let s=0;s<10;s++){t.g(`botStep('${variant}')`);t.frames(1000,step)}
  const peak=t.g('peak');for(const [v,n] of marks)if(peak>=v&&crossed[n]==null)crossed[n]=m;
  if(filed==null&&t.g('ipoFiled'))filed=m;
  if(ended==null&&t.g('!!over'))ended=t.g('({kind:over.kind,month:over.month})');
  if(bridge==null&&t.g('bridgeUsed'))bridge=m;
  // Board confidence after this month's rollover: the lowest seen, and months below BOARD_WARN.
  {const c=t.g('board?board.conf:null');if(c!=null){confMin=confMin==null?c:Math.min(confMin,c);if(c<t.g('BOARD_WARN'))under40++}}
  // Longest run of months without a node purchase after $1M (to filing or the end).
  {const nn=t.g('botNodes');if(crossed['$1M']!=null){if(lastNode==null)lastNode=m;if(nn>nodes0)lastNode=m;gap=Math.max(gap,m-lastNode)}nodes0=nn}
  if(t.g('MRR()*12')>=1e8){const r=t.g('rule40()');if(r!=null){r40seen++;if(r<40)r40miss++}}
  if(m%12===0||filed===m){
    const s=t.g(`({mrr:MRR(),val:MRR()*12*revMult(),cash,m:margin3(),nrr:NRR12(),y:yoy(),r40:rule40(),team:staff.length,csm:heads('csm'),mm:heads('mm'),eng:heads('eng'),paying,rp,inc:rpIncome(),cap:rpCap(),nodes:Object.values(owned).reduce((a,b)=>a+b,0)-1,stale,ads:botAds,hold:ipoHold,bought:(()=>{const b=botBought;botBought={};return b})(),board:board?Math.round(board.conf)+(board.ult!=null?' ULT':''):'–',kase:lawCase?(lawCase.axis?'audit':'investigation')+' due m'+lawCase.due:''})`);
    const b=Object.entries(s.bought).map(([k,n])=>n>1?k+'×'+n:k).join(', ');
    console.log(`m${String(m).padStart(3)} MRR ${money(s.mrr).padStart(8)} val ${money(s.val).padStart(8)} cash ${money(s.cash).padStart(8)} margin ${fm(s.m).padStart(5)} NRR ${fm(s.nrr).padStart(4)} yoy ${fm(s.y).padStart(5)} R40 ${s.r40==null?'–':Math.round(s.r40)} paying ${s.paying} team ${s.team} (csm ${s.csm}, mm ${s.mm}, eng ${s.eng}) rp ${s.rp.toFixed(1)}/${s.cap.toFixed(0)} +${s.inc.toFixed(1)}/mo nodes ${s.nodes} stale ${s.stale} ads ${s.ads} hold ${s.hold} board ${s.board}${s.kase?' case '+s.kase:''}${b?' | bought: '+b:''}`);
  }
  if(filed!=null||ended!=null)break;
}
const cases=t.g('botCases'),caseTxt=`cases ${cases.length}${cases.length?' ('+cases.map(c=>`${c.axis} m${c.m} ${c.out??'open'}`).join(', ')+')':''}`;
// idle: how long after stopping (at $10M peak) the ending came.
const endTxt=ended?`ending ${ended.kind} at m${ended.month}${variant==='idle'&&crossed['$10M']!=null?` (${ended.month-crossed['$10M']} months after $10M)`:''}`:'no ending';
const ev=t.g('botEv'),bad=t.g('JSON.stringify(botBad)'),al=t.g('companyAl().map(v=>v.toFixed(2)).join(",")');
console.log(`policy ${variant}: `+marks.map(([,n])=>`${n} at ${crossed[n]??'–'}`).join(', ')+`, IPO filed at ${filed??'never'} (game months), ${endTxt}. Board min ${confMin==null?'–':Math.round(confMin)}, ${under40} months under 40, bridge ${bridge==null?'no':'m'+bridge}, ${caseTxt}. Longest gap between nodes after $1M: ${crossed['$1M']!=null?gap:'–'} months. Events ${ev.good} good, ${ev.bad} bad ${bad}, alignment ${al}. Rule of 40 below 40 in ${r40miss} of ${r40seen} months at $100M+ ARR. ${(process.cpuUsage(start).user/1e6).toFixed(0)}s CPU`);
