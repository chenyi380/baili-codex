import test from 'node:test';
import assert from 'node:assert/strict';
const rig=await import('../hair-rig.mjs').catch(()=>({}));
// Catches static hair, drifting roots/skin, and a 6-second oscillator wrapped at 16 seconds.
test('all six roots stay pinned while tips travel visibly and smoothly',()=>{
  assert.equal(typeof rig.strandPose,'function');
  for(let id=0;id<6;id++){
    let lo=Infinity,hi=-Infinity;
    for(let i=0;i<960;i++){
      const t=i/60,p=rig.strandPose(t,1,id),next=rig.strandPose(t+1/60,1,id);
      assert.deepEqual(rig.strandPose(t,0,id),[0,0]);
      lo=Math.min(lo,p[0]);hi=Math.max(hi,p[0]);
      assert.ok(Math.abs(p[0])<48&&Math.abs(p[1])<24);
      assert.ok(Math.hypot(p[0]-next[0],p[1]-next[1])<2);
    }
    assert.ok(hi-lo>24);
  }
});
test('16-second background repeats both pose and near-seam velocity',()=>{
  assert.equal(typeof rig.strandPose,'function');
  for(let id=0;id<6;id++)for(const s of [.2,.5,1])for(const t of [0,1/60,1.5,3,8,15.99]){
    const a=rig.strandPose(t,s,id),b=rig.strandPose(t+16,s,id);
    assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-9,'pose must repeat after exactly 16 seconds');
  }
  assert.notDeepEqual(rig.strandPose(1,.5,0),rig.strandPose(1,1,0).map(v=>v*.5));
});
test('field locks protected zones and animates hair with a seamless displacement map',()=>{
  assert.equal(typeof rig.createHairField,'function');
  const field=rig.createHairField(96,54,1672,940);
  for(const [x,y] of [[.90,.42],[.94,.66],[.58,.43],[.56,.09],[.20,.40],[.79,.96]]){
    for(const t of [0,.5,1,2,3,5,16])assert.deepEqual(field.displacementAt(x,y,t),[0,0]);
  }
  let travel=0;for(let i=0;i<=160;i++)travel=Math.max(travel,Math.hypot(...field.displacementAt(.42,.85,i/10)));
  assert.ok(travel>10);
  const a=field.frame(0).slice(),b=field.frame(16).slice();assert.deepEqual(a,b);
});
