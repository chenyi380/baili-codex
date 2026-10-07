import test from 'node:test';import assert from 'node:assert/strict';
const mod=await import('../work-phase.mjs').catch(()=>({}));
// Catches returning branding on a later loop, early intro fade, or a camera/hair time reset.
test('branding stays visible through startup and fades only in the one-shot work entry',()=>{
  assert.equal(typeof mod.workFrame,'function');
  for(const t of [0,4.5,14.35,15.99,16])assert.equal(mod.workFrame(t,'boot').brandOpacity,1);
  assert.equal(mod.workFrame(0,'handoff').brandOpacity,1);
  assert.equal(mod.workFrame(.75,'handoff').brandOpacity,.5);
  for(const t of [1.5,2,16,48])assert.equal(mod.workFrame(t,'handoff').brandOpacity,0);
  let prior=1;for(let i=0;i<=90;i++){const value=mod.workFrame(i/60,'handoff').brandOpacity;assert.ok(value>=0&&value<=prior);assert.ok(prior-value<.04);prior=value;}
});
test('all looping frames omit branding and motion continues across both handoffs',()=>{
  assert.equal(typeof mod.workFrame,'function');
  for(const t of [0,.5,1.5,15.99,16,32,48])assert.equal(mod.workFrame(t,'background').brandOpacity,0);
  assert.equal(mod.workFrame(16,'boot').motionTime,16);
  assert.equal(mod.workFrame(0,'handoff').motionTime,16);
  assert.equal(mod.workFrame(1.5,'handoff').motionTime,17.5);
  assert.equal(mod.workFrame(0,'background').motionTime,1.5);
  assert.equal(mod.workFrame(16,'background').motionTime,17.5);
});
