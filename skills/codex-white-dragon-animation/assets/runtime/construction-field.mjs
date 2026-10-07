// Distributed birth field for the already approved contour artwork.
// There is deliberately no screen-height ramp or left/right wipe.
export function constructionBirth(x,y){
  const value=.46+.20*Math.sin(x*29+y*7)*Math.cos(y*23-x*3)
    +.15*Math.sin(x*17-y*19+.8)+.08*Math.cos(x*41+y*37);
  return Math.max(.035,Math.min(.94,value));
}
