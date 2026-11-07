// Minimal greedy bot. Usage: node tests/bot.js early
const {load}=require('./harness.js');
const mode=process.argv[2]||'early';
if(mode!=='early'){console.error('unknown mode '+mode);process.exit(1)}
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
