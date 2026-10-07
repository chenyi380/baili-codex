import test from 'node:test';import assert from 'node:assert/strict';import {readFile,mkdtemp,copyFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {binding,sameBinding,hasConsent,remember,forget} from '../consent.mjs';
import {fileURLToPath} from 'node:url';
const root=new URL('..',import.meta.url);
test('remembered consent is specific to account, version, application and exact code',async()=>{
 const app={userSid:'TEST-ONLY',version:'1.0',family:'OpenAI.Codex_2p2nqsd0c76g0',exe:'TEST-EXE',signature:'Valid OpenAI'};
 const expected=await binding(fileURLToPath(root),app),record={...expected,accepted:true};assert.ok(sameBinding(record,expected));
 for(const key of ['userSid','version','family','exe','codeHash','scope'])assert.equal(sameBinding({...record,[key]:'changed'},expected),false,key);
 assert.equal(sameBinding({...record,accepted:false},expected),false);
});
test('dedicated wallpaper is 4K/60fps/960 frames/16 seconds and has no audio',async()=>{
 const {Input,BufferSource,Mp4InputFormat}=await import('../vendor/mediabunny-1.61.0.mjs');
 const bytes=await readFile(new URL('wallpaper.mp4',root)),input=new Input({source:new BufferSource(bytes),formats:[new Mp4InputFormat()]});
 try{assert.equal(await input.computeDuration(),16);const v=await input.getPrimaryVideoTrack();assert.equal(v.displayWidth,3840);assert.equal(v.displayHeight,2160);const stats=await v.computePacketStats();assert.equal(stats.packetCount,960);assert.equal(stats.averagePacketRate,60);assert.equal(await input.getPrimaryAudioTrack(),null);assert.ok(bytes.length<20*1024*1024);}finally{input.dispose();}
});
test('save/revoke consent never launches an app; code change invalidates it',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'baili-consent-test-')),app={userSid:'TEST',version:'1',family:'TEST',exe:'TEST',signature:'Valid OpenAI'};
 try{for(const f of ['consent.mjs','launcher.mjs','platform.ps1','cdp.mjs','integration.mjs','scene.mjs','eye-motion.mjs','wallpaper.mjs','film.mjs','work-films.mjs','Desktop-Launch.ps1','config.json'])await copyFile(new URL(f,root),join(dir,f));
 assert.equal(await hasConsent(dir,app),false);await remember(dir,app);assert.equal(await hasConsent(dir,app),true);
 assert.equal(await hasConsent(dir,{...app,version:'2'}),false);await copyFile(new URL('consent.mjs',root),join(dir,'scene.mjs'));assert.equal(await hasConsent(dir,app),false);
 await forget(dir);assert.equal(await hasConsent(dir,app),false);
 }finally{await rm(dir,{recursive:true});}
});
test('eye shader occludes rather than translucent overlay; hair uses damped spring solution',async()=>{
 const code=await readFile(new URL('scene.mjs',root),'utf8');assert.ok(code.includes('gl_FragColor=vec4(col.rgb,1.)'));assert.ok(code.includes('function spring('));assert.ok(code.includes('smoothstep(edge-.45,edge+.45,p.y)'));assert.ok(!code.includes('globalAlpha=reveal*(1-ramp(open'));
});
test('single loop video and theme font colors are preserved',async()=>{
 const wallpaper=await readFile(new URL('wallpaper.mjs',root),'utf8'),skin=await readFile(new URL('integration.mjs',root),'utf8');assert.ok(wallpaper.includes('video.loop=true'));assert.ok(!wallpaper.includes('videos=['));assert.ok(!skin.includes('color-scheme:dark;--app'));
 assert.ok(skin.includes('--menu-background-color:var(--baili-panel'));assert.ok(skin.includes('--color-background-composer-surface:var(--baili-panel'));assert.ok(!/--app-color-text-foreground\s*:/.test(skin));assert.ok(!/--color-text\s*:/.test(skin));
});
