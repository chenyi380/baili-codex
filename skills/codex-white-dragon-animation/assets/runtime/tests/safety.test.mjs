import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {mainTarget,socketUrl} from '../cdp.mjs';
import {buildPayload,installSkin} from '../integration.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
test('only official main app page is eligible',()=>{
  assert.equal(mainTarget({type:'page',url:'app://-/index.html?initialRoute=%2F'}),true);
  for(const url of ['https://chatgpt.com/','file:///index.html','app://fs/index.html','app://-/index.html?initialRoute=/avatar','app://-/index.html?initialRoute=/quick-chat','app://-/index.html?initialRoute=/browser','app://-/other.html'])assert.equal(mainTarget({type:'page',url}),false,url);
  assert.equal(mainTarget({type:'service_worker',url:'app://-/index.html'}),false);
});
test('debug websocket cannot escape verified port or host',()=>{
  assert.equal(socketUrl('ws://127.0.0.1:38451/devtools/page/AB-CD',38451),'ws://127.0.0.1:38451/devtools/page/AB-CD');
  for(const url of ['ws://localhost:38451/devtools/page/A','ws://127.0.0.1:80/devtools/page/A','wss://127.0.0.1:38451/devtools/page/A','ws://evil.test:38451/devtools/page/A','ws://user@127.0.0.1:38451/devtools/page/A','ws://127.0.0.1:38451/devtools/browser/A','ws://127.0.0.1:38451/devtools/page/A?x=1'])assert.throws(()=>socketUrl(url,38451),url);
});
test('refuses subframes and not-yet-ready documents',()=>{
  const child={};assert.deepEqual(installSkin({top:child},null,null,null),{installed:false,reason:'not-top-window'});
  const w={document:{documentElement:{},body:null}};w.top=w;
  assert.deepEqual(installSkin(w,null,null,{}),{installed:false,reason:'main-window-not-ready'});
});
test('payload is self-contained with original assets and no remote resource URLs',async()=>{
  const src=await buildPayload(root);
  assert.doesNotThrow(()=>new Function('return '+src));
  assert.ok(!src.includes('http://')&&!src.includes('https://'));
  assert.ok(!src.includes('eval('));assert.ok(!src.includes('disable-web-security'));assert.ok(!src.includes('Content-Security-Policy'));
  assert.ok(src.includes('data:video/mp4;base64,'));
  assert.ok(src.length<32*1024*1024,'bound the self-contained 4K video payload');
});
test('launcher requires consent, respects running app, never kills app',async()=>{
  const launcher=await readFile(new URL('../launcher.mjs',import.meta.url),'utf8');
  assert.ok(launcher.includes('--accept-local-debug-risk'));
  assert.ok(launcher.indexOf('if(app.running.length)')<launcher.indexOf('const child=spawn'));
  for(const value of ['taskkill','Stop-Process','remote-allow-origins','disable-web-security'])assert.ok(!launcher.includes(value));
});
test('artwork dimensions match and PNGs are present',async()=>{
  const a=await readFile(new URL('../assets/baili-open.png',import.meta.url)),b=await readFile(new URL('../assets/baili-closed.png',import.meta.url));
  assert.equal(a.subarray(1,4).toString(),'PNG');assert.equal(b.subarray(1,4).toString(),'PNG');
  assert.equal(a.readUInt32BE(16),b.readUInt32BE(16));assert.ok(Math.abs(a.readUInt32BE(20)-b.readUInt32BE(20))<=1,'generator one-pixel rounding is normalized by canvas');
  const ratio=a.readUInt32BE(16)/a.readUInt32BE(20);assert.ok(Math.abs(ratio-16/9)<.005);
});
test('delivered MP4 has 960 frames, 16 seconds, 60 fps, 4K, music and fast-start metadata',async()=>{
  const {Input,BufferSource,Mp4InputFormat}=await import('../vendor/mediabunny-1.61.0.mjs');
  const bytes=await readFile(new URL('../startup.mp4',import.meta.url));
  const input=new Input({source:new BufferSource(bytes),formats:[new Mp4InputFormat()]});
  try{
    assert.ok(Math.abs(await input.computeDuration()-16)<.04,'allow AAC frame padding');
    const track=await input.getPrimaryVideoTrack();assert.equal(track.displayWidth,3840);assert.equal(track.displayHeight,2160);assert.equal(track.codec,'avc');
    const stats=await track.computePacketStats();assert.equal(stats.packetCount,960);assert.equal(stats.averagePacketRate,60);
    const audio=await input.getPrimaryAudioTrack();assert.ok(audio);assert.equal(audio.codec,'aac');assert.equal(audio.sampleRate,48000);assert.equal(audio.numberOfChannels,2);
    const types=[];for(let p=0;p+8<=bytes.length;){const size=bytes.readUInt32BE(p);assert.ok(size>=8);types.push(bytes.subarray(p+4,p+8).toString());p+=size;}
    assert.ok(types.indexOf('moov')>=0&&types.indexOf('moov')<types.indexOf('mdat'));
  }finally{input.dispose();}
});
