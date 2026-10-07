import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {eyeMotion} from '../eye-motion.mjs';
test('eye motion is bounded, cyclic, continuous, with asymmetric varied blinks',()=>{
  for(let i=0;i<=9600;i++){const t=i/600;const m=eyeMotion(t,11,true);assert.ok(m.open>=0&&m.open<=1);assert.ok(Math.abs(m.open-eyeMotion(t+16,11,true).open)<1e-10);}
  for(const t of [10.70,10.775,10.785,10.970,13.86,13.946,13.954,14.156])
    assert.ok(Math.abs(eyeMotion(t-1e-6,11,true).open-eyeMotion(t+1e-6,11,true).open)<.001);
  assert.equal(eyeMotion(10.78,11,true).open,0);assert.ok(eyeMotion(13.95,11,true).open>0);
  assert.equal(eyeMotion(3.1,3.1,false).open,0);assert.equal(eyeMotion(4.0,4.0,false).open,1);
  assert.equal(eyeMotion(10.78,11,true,true).open,1);
});
test('GUI spawn is visible; readiness requires progressing presentation',async()=>{
  const launcher=await readFile(new URL('../launcher.mjs',import.meta.url),'utf8');
  assert.match(launcher,/const child=spawn\([^\n]+windowsHide:false/);
  assert.ok(launcher.includes('!document.hidden'));assert.ok(launcher.includes('r.result?.value?.presented'));
  const skin=await readFile(new URL('../integration.mjs',import.meta.url),'utf8');
  assert.ok(skin.includes('s?.presented'));assert.ok(skin.includes('!presented'));
});
test('video timeout counts visible time, preserves failure, uses a preloading surface',async()=>{
  const video=await readFile(new URL('../wallpaper.mjs',import.meta.url),'utf8');
  assert.ok(video.includes('if(!doc.hidden)visibleWait'));assert.ok(video.includes('video.readyState>=2'));
  assert.ok(video.includes("display:'block',opacity:'0'"));assert.ok(!video.includes("display:'none'"));
});
