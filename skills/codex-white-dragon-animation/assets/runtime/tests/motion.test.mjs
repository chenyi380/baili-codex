import test from 'node:test';import assert from 'node:assert/strict';
import {windMotion} from '../motion.mjs';
test('hair wind is visibly nonzero, smooth, bounded and returns to the same pose at the loop seam',()=>{
  let range=0;for(let i=0;i<=960;i++){
    const t=i/60,a=windMotion(t),b=windMotion(t+16),next=windMotion(t+.001);
    for(let j=0;j<3;j++){assert.ok(Math.abs(a[j]-b[j])<1e-9);assert.ok(Math.abs(a[j])<12);assert.ok(Math.abs(next[j]-a[j])<.025);range=Math.max(range,Math.abs(a[j]));}
  }
  assert.ok(range>5,'small subpixel breathing alone is not visible hair motion');
});
test('reduced motion pins every hair field',()=>{for(const t of [0,1,5.25,9,15.99])assert.deepEqual(windMotion(t,true),[0,0,0]);});
