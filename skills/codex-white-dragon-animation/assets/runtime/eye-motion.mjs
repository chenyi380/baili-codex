// Deterministic art-directed eye motion; suitable for a seamless 16-second film.
// These are animation timings, not claims about clinical blink measurements.
export function eyeMotion(time, introTime, background=false, reduced=false) {
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  if(reduced)return {open:1,closure:0,phase:'rest'};
  const cycle=((time%16)+16)%16;
  const beats=[{at:10.70,down:.075,hold:.010,up:.185,depth:1},
    {at:13.86,down:.086,hold:.008,up:.202,depth:.96}];
  let closure=0,phase='rest';
  for(const b of beats){
    const t=cycle-b.at;let amount=0,state='rest';
    if(t>=0&&t<b.down){amount=smooth(t/b.down);state='closing';}
    else if(t>=b.down&&t<b.down+b.hold){amount=1;state='closed';}
    else if(t>=b.down+b.hold&&t<b.down+b.hold+b.up){
      amount=1-smooth((t-b.down-b.hold)/b.up);state='opening';
    }
    if(amount*b.depth>closure){closure=amount*b.depth;phase=state;}
  }
  // The intro is a deliberate awakening, slower than an ordinary blink.
  const awakening=background?1:smooth((introTime-3.16)/.78);
  return {open:awakening*(1-closure),closure:1-awakening*(1-closure),phase};
}
