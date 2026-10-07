// One-shot entry and periodic wallpaper are separate: labels never return on a loop.
export function workFrame(time,mode='boot'){
  const t=Math.max(0,Number(time)||0);
  if(mode==='background')return {motionTime:t+1.5,brandOpacity:0};
  if(mode==='handoff'){
    const x=Math.min(1,t/1.5),fade=x*x*x*(x*(x*6-15)+10);
    return {motionTime:t+16,brandOpacity:Math.max(0,1-fade)};
  }
  return {motionTime:t,brandOpacity:1};
}
