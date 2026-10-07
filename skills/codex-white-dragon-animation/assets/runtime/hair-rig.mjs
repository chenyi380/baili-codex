// Throwaway 2D guide-ribbon experiment. Not 3D strand physics or image cutouts.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const hairGuides=[
  {name:'rear outer lengths',p:[[.68,.33],[.67,.61],[.48,.81],[.19,1.02]],radius:78},
  {name:'rear flying locks',p:[[.66,.37],[.57,.67],[.33,.80],[.10,1.02]],radius:61},
  {name:'ear-side lengths',p:[[.72,.27],[.64,.48],[.71,.66],[.49,1.00]],radius:54},
  {name:'front curl',p:[[.83,.12],[.75,.36],[.70,.56],[.82,.71]],radius:58},
  {name:'front loose fringe',p:[[.87,.11],[.80,.35],[.72,.45],[.79,.63]],radius:38},
  {name:'lower side hair',p:[[.75,.48],[.75,.65],[.76,.83],[.61,1.00]],radius:65},
];
export function strandPose(time,length,id){
  const s=clamp(length);if(s===0)return [0,0];
  const amplitude=[26,30,24,18,18,16][id%6]*s**1.55;
  const lag=1.2*s**1.35,phase=id*.43;
  // Integer harmonics preserve the accepted ~3 second sway while looping at 16 s.
  const fast=time*Math.PI*2*5/16,slow=time*Math.PI*2*3/16;
  return [amplitude*(Math.sin(fast-lag+phase)+.22*Math.sin(slow-lag*.65+phase*.8)),
    amplitude*.18*Math.cos(fast-lag*.85+phase+.4)];
}
function curve(p,s){const q=1-s;return [0,1].map(k=>q*q*q*p[0][k]+3*q*q*s*p[1][k]+3*q*s*s*p[2][k]+s*s*s*p[3][k]);}
function mobility(x,y){
  let free=smooth((y-.17)/.14);
  if(x<.35&&y<.68)return 0;
  for(const [cx,cy,rx,ry] of [[.98,.51,.18,.36],[.61,.455,.11,.046],[.90,1.10,.27,.38]]){
    const d=Math.hypot((x-cx)/rx,(y-cy)/ry);
    free*=smooth((d-.94)/.18);
  }
  return free;
}
export function createHairField(width=256,height=144,sourceWidth=1672,sourceHeight=940){
  const divisions=16,nodeCount=17,total=hairGuides.length*nodeCount;
  const nodes=hairGuides.map(g=>Array.from({length:nodeCount},(_,j)=>curve(g.p,j/divisions).map((v,k)=>v*(k?sourceHeight:sourceWidth))));
  function weights(x,y){
    const free=mobility(x,y);if(!free)return [];
    const px=x*sourceWidth,py=y*sourceHeight,values=[];let sum=0;
    for(let id=0;id<hairGuides.length;id++){
      let nearest=Infinity,at=0,along=0;
      for(let j=0;j<divisions;j++){
        const a=nodes[id][j],b=nodes[id][j+1],dx=b[0]-a[0],dy=b[1]-a[1];
        const u=clamp(((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy));
        const d=Math.hypot(px-a[0]-u*dx,py-a[1]-u*dy);
        if(d<nearest){nearest=d;at=j;along=u;}
      }
      const influence=smooth(1-nearest/hairGuides[id].radius);
      if(influence>.001){values.push([id*nodeCount+at,id*nodeCount+at+1,along,influence]);sum+=influence;}
    }
    const coverage=clamp(sum)*free;
    return values.map(([a,b,u,w])=>[a,b,u,w/sum*coverage]);
  }
  const lookup=Array.from({length:width*height},(_,i)=>weights((i%width+.5)/width,(Math.floor(i/width)+.5)/height));
  function poses(t){const out=new Float32Array(total*2);for(let id=0;id<6;id++)for(let j=0;j<nodeCount;j++){const p=strandPose(t,j/divisions,id),i=(id*nodeCount+j)*2;out[i]=p[0];out[i+1]=p[1];}return out;}
  function sum(list,pose){let x=0,y=0;for(const [a,b,u,w] of list){x+=(pose[a*2]*(1-u)+pose[b*2]*u)*w;y+=(pose[a*2+1]*(1-u)+pose[b*2+1]*u)*w;}return [x,y];}
  const bytes=new Uint8Array(width*height*4);
  return {width,height,
    displacementAt:(x,y,t)=>sum(weights(x,y),poses(t)),
    frame(t,reduced=false){const pose=poses(t);for(let i=0;i<lookup.length;i++){
      const [x,y]=reduced?[0,0]:sum(lookup[i],pose),at=i*4;
      // 128 represents exactly zero; bilinear sampling keeps ribbon boundaries soft.
      bytes[at]=Math.round(128+x*2.5);bytes[at+1]=Math.round(128+y*2.5);bytes[at+2]=128;bytes[at+3]=255;
    }return bytes;}
  };
}
