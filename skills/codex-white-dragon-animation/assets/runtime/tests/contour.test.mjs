import test from 'node:test';import assert from 'node:assert/strict';import {thinContour} from '../contour-map.mjs';
test('a flat portrait patch produces no false texture lines',()=>{assert.deepEqual(thinContour(new Float32Array(64).fill(140),8,8),new Uint8Array(64));});
test('nonmaximum suppression makes a two-pixel step response one thin line',()=>{
 const lum=Float32Array.from({length:64},(_,i)=>i%8>=4?255:0),out=thinContour(lum,8,8);
 for(let y=2;y<6;y++){assert.ok(out[y*8+3]>100);assert.equal(out[y*8+4],0);assert.equal(out[y*8+2],0);}
});
test('small texture differences do not turn into glowing portrait pores',()=>{
 const lum=Float32Array.from({length:64},(_,i)=>i%8>=4?12:0);assert.deepEqual(thinContour(lum,8,8),new Uint8Array(64));
});
