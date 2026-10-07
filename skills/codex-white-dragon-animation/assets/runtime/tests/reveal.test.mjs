import test from 'node:test';
import assert from 'node:assert/strict';
import {eyeMotion} from '../eye-motion.mjs';
const module=await import('../reveal.mjs').catch(()=>({}));

// These tests catch a missing construction phase, global abrupt cuts, and mesh leaking into the open eye.
test('approved art starts dark and hands off overlapping moving construction heads',()=>{
  assert.equal(typeof module.revealPhase,'function');
  assert.deepEqual(module.revealPhase(0),{lineHead:0,materialMix:0,settleMix:0});
  const overlap=module.revealPhase(1.7);
  assert.ok(overlap.lineHead>.9,'contours are established by the early material handoff');
  assert.ok(overlap.materialMix>.6&&overlap.materialMix<1,'material must already be growing during the overlapping finish');
  const settling=module.revealPhase(2.2);
  assert.equal(settling.materialMix,1);
  assert.ok(settling.settleMix>.3&&settling.settleMix<.5,'finished material follows before the mesh holds still');
});
test('mesh retires completely before awakening uncovers the iris',()=>{
  assert.equal(typeof module.revealPhase,'function');
  assert.equal(module.revealPhase(3.1).settleMix,1);assert.equal(eyeMotion(3.1,3.1).open,0);
  assert.ok(eyeMotion(3.55,3.55).open>.3&&eyeMotion(3.55,3.55).open<.7,'awakening follows immediately, without a long static pause');
  assert.equal(eyeMotion(4,4).open,1);
  for(let t=3.1;t<16;t+=1/60){assert.equal(module.revealPhase(t).settleMix,1);}
});
test('each construction transition is bounded, monotonic and continuous at 60 fps',()=>{
  assert.equal(typeof module.revealPhase,'function');let prior=module.revealPhase(0);
  for(let t=1/60;t<=16;t+=1/60){const current=module.revealPhase(t);
    for(const key of ['lineHead','materialMix','settleMix']){assert.ok(current[key]>=0&&current[key]<=1);assert.ok(current[key]>=prior[key]);assert.ok(current[key]-prior[key]<.04);}
    prior=current;
  }
});
test('working wallpaper and reduced motion have no construction or topology overlay',()=>{
  assert.equal(typeof module.revealPhase,'function');
  for(const args of [[0,true,false],[0,false,true],[8,true,false]])assert.deepEqual(module.revealPhase(...args),{lineHead:1,materialMix:1,settleMix:1});
});
