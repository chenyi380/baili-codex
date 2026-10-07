// The bounded periodic response of three differently damped 2D strand fields.
// This is not a 3D hair solver or collision simulation.
export function windMotion(t,reduced=false){
  if(reduced)return [0,0,0];
  function response(m,c,k,force,harmonic,phase){const w=Math.PI*harmonic/8;return force/Math.hypot(k-m*w*w,c*w)*Math.sin(w*t+phase-Math.atan2(c*w,k-m*w*w));}
  return [response(1,2.2,5,28,1,0),response(1,2.8,8,22,2,.85),response(1,3,7,14,1,1.35)];
}
