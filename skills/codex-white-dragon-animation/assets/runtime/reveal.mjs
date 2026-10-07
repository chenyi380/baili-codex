// Art-directed construction of the user-approved bitmap plates.
// Values drive the actual renderer uniforms; no inferred 3D topology is drawn.
export function revealPhase(time,reduced=false,background=false){
  if(reduced||background)return {lineHead:1,materialMix:1,settleMix:1};
  const ramp=(a,b)=>{const x=Math.max(0,Math.min(1,(time-a)/(b-a)));return Math.max(0,Math.min(1,x*x*x*(x*(x*6-15)+10)));};
  // Overlapping heads keep the same character moving through construction,
  // rather than bringing three complete still plates to rest in succession.
  return {lineHead:ramp(.10,1.65),materialMix:ramp(.95,2.1),settleMix:ramp(1.5,3.1)};
}
