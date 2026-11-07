// Expansion board (board 5): uniform entry, a centre Upgrade slot and two Downgrade slots at the walls.
// Usage: [N=20000] [G=4] node sim/expansion.js <downW> <upW>...   G is the Downgrade slots' gap from each wall.
// Run 2026-11-07, N=10000-15000 per width, G=12, downW=9: up 43 11.8/12.2%, 55 15.8/15.7%, 68 20.5/20.2%, 80 23.6/24.3%;
// down 9 between 3.4% and 4.1% (about 3.8%). Wall-flush (G=4): downW 3-4 lands 0%, 5 6.2%, 6 7.5%, 10 ~10%, so 4% needs a gap.
// Chosen: EXP_W0 43 (12%), tiers 56 (16%), 67 (20%), 80 (24%); DOWN_W 9 at G=12 (3.8%).
const src=require('fs').readFileSync(__dirname+'/sim.js','utf8').split('\n').slice(0,9).join('\n');eval(src);
const down=+process.argv[2],N=+(process.env.N||20000);
const g=+(process.env.G||4),dz=[[g,g+down],[360-g-down,360-g]];
for(const w of process.argv.slice(3).map(Number)){const up=[[180-w/2,180+w/2]];let u=0,d=0;
  for(let n=0;n<N;n++){const r=drop(12+Math.random()*336,[...up,...dz]);if(!r.hit)continue;if(r.x>=up[0][0]&&r.x<up[0][1])u++;else d++}
  console.log(`up ${w}: ${(u/N*100).toFixed(1)}% | down ${down}: ${(d/N*100).toFixed(1)}%`)}
