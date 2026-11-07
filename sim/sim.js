const W=360,BR=3.5,PR=3,G=820,WALLTOP=160,FLOOR=196;
const pegs=[];for(let r=0;r<5;r++){const odd=r%2,n=odd?11:12,x0=15+(odd?15:0);for(let i=0;i<n;i++)pegs.push({x:x0+i*30,y:36+r*26})}
function drop(x,zones){const walls=zones.flat();const b={x,y:12,vx:(Math.random()-.5)*30,vy:0};
  for(let t=0;t<4000;t++){const dt=1/180;b.vy+=G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.x<BR){b.x=BR;b.vx=Math.abs(b.vx)*.5}if(b.x>W-BR){b.x=W-BR;b.vx=-Math.abs(b.vx)*.5}
    for(const p of pegs){const dx=b.x-p.x,dy=b.y-p.y,rr=BR+PR,d2=dx*dx+dy*dy;if(d2<rr*rr){const d=Math.sqrt(d2)||.01,nx=dx/d,ny=dy/d;b.x=p.x+nx*rr;b.y=p.y+ny*rr;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.5*vn*nx;b.vy-=1.5*vn*ny}b.vx+=(Math.random()-.5)*24}}
    for(const w of walls)if(b.y>WALLTOP-BR&&Math.abs(b.x-w)<BR+1){b.x=b.x<w?w-BR-1:w+BR+1;b.vx*=-.4}
    if(b.y>FLOOR)return{x:b.x,hit:zones.some(([a,c])=>b.x>=a&&b.x<c)}}
  return{x:b.x,hit:false}}
const Z=JSON.parse(process.argv[2]),N=+(process.argv[3]||10000);
let xs=null;const names=['Acq','Act','Ret','Ref','Rev'],res=[];
for(let b=0;b<5;b++){const hits=[],all=[];let h=0;
  for(let n=0;n<N;n++){const x0=xs?xs[Math.random()*xs.length|0]:12+Math.random()*(W-24);const r=drop(x0,Z[b]);all.push(r.x);if(r.hit){h++;hits.push(r.x)}}
  res.push(names[b]+' '+(h/N*100).toFixed(1)+'%');xs=b<3?hits:all}
console.log(res.join(' | '));
