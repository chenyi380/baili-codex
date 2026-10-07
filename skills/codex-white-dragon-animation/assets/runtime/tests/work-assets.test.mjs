import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,copyFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {buildPayload} from '../integration.mjs';import {remember,hasConsent} from '../consent.mjs';
const root=new URL('..',import.meta.url);
test('missing one-shot fade film refuses a partial native payload',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'baili-entry-missing-'));
  try{for(const f of ['startup.mp4','wallpaper.mp4','config.json'])await copyFile(new URL(f,root),join(dir,f));
    await assert.rejects(buildPayload(dir),{code:'ENOENT'});
  }finally{await rm(dir,{recursive:true});}
});
test('editing the new runtime work controller invalidates remembered consent',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'baili-work-consent-')),app={userSid:'TEST',version:'1',family:'TEST',exe:'TEST',signature:'Valid OpenAI'};
  try{for(const f of ['consent.mjs','launcher.mjs','platform.ps1','cdp.mjs','integration.mjs','scene.mjs','eye-motion.mjs','wallpaper.mjs','film.mjs','Desktop-Launch.ps1','config.json','work-films.mjs'])await copyFile(new URL(f,root),join(dir,f));
    await remember(dir,app);assert.equal(await hasConsent(dir,app),true);
    await copyFile(new URL('consent.mjs',root),join(dir,'work-films.mjs'));assert.equal(await hasConsent(dir,app),false);
  }finally{await rm(dir,{recursive:true});}
});
test('one-shot fade film is 4K/60fps/90 frames/1.5 seconds and silent',async()=>{
  const bytes=await readFile(new URL('handoff.mp4',root)).catch(()=>null);assert.ok(bytes,'handoff film must be delivered');
  const {Input,BufferSource,Mp4InputFormat}=await import('../vendor/mediabunny-1.61.0.mjs');
  const input=new Input({source:new BufferSource(bytes),formats:[new Mp4InputFormat()]});
  try{assert.equal(await input.computeDuration(),1.5);const v=await input.getPrimaryVideoTrack();assert.equal(v.displayWidth,3840);assert.equal(v.displayHeight,2160);
    const stats=await v.computePacketStats();assert.equal(stats.packetCount,90);assert.equal(stats.averagePacketRate,60);assert.equal(await input.getPrimaryAudioTrack(),null);
  }finally{input.dispose();}
});
