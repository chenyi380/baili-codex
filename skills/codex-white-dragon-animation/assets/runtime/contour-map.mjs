// Sobel direction plus nonmaximum suppression, computed once during authoring.
export function thinContour(lum,w,h){
  if(lum.length!==w*h)throw new Error('Luminance dimensions do not match');
  const magnitude=new Float32Array(w*h),direction=new Uint8Array(w*h),out=new Uint8Array(w*h);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const i=y*w+x,gx=-lum[i-w-1]+lum[i-w+1]-2*lum[i-1]+2*lum[i+1]-lum[i+w-1]+lum[i+w+1];
    const gy=-lum[i-w-1]-2*lum[i-w]-lum[i-w+1]+lum[i+w-1]+2*lum[i+w]+lum[i+w+1];
    magnitude[i]=Math.hypot(gx,gy);let angle=(Math.atan2(gy,gx)*180/Math.PI+180)%180;
    direction[i]=angle<22.5||angle>=157.5?0:angle<67.5?1:angle<112.5?2:3;
  }
  const offsets=[1,w+1,w,w-1];
  for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
    const i=y*w+x,m=magnitude[i],d=offsets[direction[i]];
    if(m>56&&m>magnitude[i-d]&&m>=magnitude[i+d])out[i]=Math.round(210*Math.min(1,(m-56)/155));
  }
  return out;
}
