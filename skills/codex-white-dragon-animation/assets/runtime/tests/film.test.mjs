import test from 'node:test';
import assert from 'node:assert/strict';
import {mountFilm} from '../film.mjs';

// Browser media APIs are unavailable in Node. This event surface drives the real
// project controller, not a substitute implementation of that controller.
function fixture(){
  class Events extends EventTarget {}
  const doc=new Events();doc.hidden=false;
  const media=new Events();media.matches=false;
  const video=new Events();Object.assign(video,{style:{},currentTime:0,readyState:0,videoWidth:0,videoHeight:0,paused:true,frames:0,dropped:0});
  video.setAttribute=()=>{};video.removeAttribute=()=>{};video.load=()=>{};video.remove=()=>{};
  video.play=async()=>{video.paused=false};video.pause=()=>{video.paused=true};
  let nextFrame;video.requestVideoFrameCallback=fn=>{nextFrame=fn;return 1};video.cancelVideoFrameCallback=()=>{nextFrame=null};
  video.getVideoPlaybackQuality=()=>({totalVideoFrames:video.frames,droppedVideoFrames:video.dropped});
  doc.createElement=()=>video;
  const timers=new Map();let clock=0,id=0;
  const win={document:doc,matchMedia:()=>media,performance:{now:()=>clock},setInterval:fn=>{timers.set(++id,fn);return id},clearInterval:n=>timers.delete(n)};
  return {win,doc,video,container:{appendChild(){}},
    load(){video.readyState=3;video.videoWidth=3840;video.videoHeight=2160;video.dispatchEvent(new Event('loadeddata'));},
    frame(t){video.currentTime=t;video.frames++;const fn=nextFrame;nextFrame=null;fn?.(clock,{mediaTime:t,presentedFrames:video.frames});},
    advance(ms){clock+=ms;for(const fn of [...timers.values()])fn();}};
}

test('film does not report presented merely because loadeddata fired',async()=>{
  const f=fixture(),film=mountFilm(f.win,f.container,'startup.mp4',{loop:false});
  f.load();await film.ready;film.show(true);assert.equal(film.status().presented,false);
  f.frame(.016);f.frame(.033);assert.equal(film.status().presented,true);
  assert.equal(film.status().currentTime,.033);assert.equal(film.status().renderer,'video');film.dispose();
});
test('hidden document pauses film and timeout counts visible time only',async()=>{
  const f=fixture(),film=mountFilm(f.win,f.container,'startup.mp4',{loop:false});
  f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));f.advance(30000);
  assert.equal(film.status().error,'');f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));
  f.load();await film.ready;film.show(true);assert.equal(f.video.paused,false);
  f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(f.video.paused,true);film.dispose();
});
test('startup ends exactly once and looped background never signals completion',async()=>{
  const f=fixture();let calls=0;const film=mountFilm(f.win,f.container,'startup.mp4',{loop:false},()=>calls++);
  f.load();await film.ready;film.show(true);f.video.dispatchEvent(new Event('ended'));f.video.dispatchEvent(new Event('ended'));
  assert.equal(calls,1);assert.equal(film.status().completed,true);film.replay();assert.equal(film.status().completed,false);film.dispose();
  const g=fixture(),loop=mountFilm(g.win,g.container,'wallpaper.mp4',{loop:true},()=>calls++);g.load();await loop.ready;g.video.dispatchEvent(new Event('ended'));assert.equal(calls,1);loop.dispose();
});
test('decode failure is explicit, not a false ready or successful presentation',async()=>{
  const f=fixture(),film=mountFilm(f.win,f.container,'startup.mp4',{loop:false});
  f.video.dispatchEvent(new Event('error'));await assert.rejects(film.ready,/decode/);
  assert.equal(film.status().ready,false);assert.equal(film.status().presented,false);film.dispose();
});
test('intentional pause cancels a pending play without leaving a failure',async()=>{
  const f=fixture();let rejectPlay;f.video.play=()=>new Promise((_,reject)=>{rejectPlay=reject;});
  const film=mountFilm(f.win,f.container,'entry.mp4');f.load();await film.ready;film.show(true);film.pause(true);
  rejectPlay(new DOMException('The play request was interrupted by pause','AbortError'));await Promise.resolve();
  assert.equal(film.status().error,'');assert.equal(film.status().paused,true);film.dispose();
});
test('stale play rejection cannot interrupt a newer playback attempt',async()=>{
  const f=fixture(),rejects=[];f.video.play=()=>{f.video.paused=false;return new Promise((_,reject)=>rejects.push(reject));};
  const film=mountFilm(f.win,f.container,'loop.mp4',{loop:true});f.load();await film.ready;film.show(true);film.pause(true);film.pause(false);
  rejects[0](new Error('stale playback failure'));await Promise.resolve();
  assert.equal(film.status().error,'');assert.equal(f.video.paused,false);film.dispose();
});
test('seeking to a fade checkpoint cancels pending playback without a failure',async()=>{
  const f=fixture();let rejectPlay;f.video.play=()=>new Promise((_,reject)=>{rejectPlay=reject;});
  const film=mountFilm(f.win,f.container,'entry.mp4');f.load();await film.ready;film.show(true);film.seek(.75);
  rejectPlay(new DOMException('Seeking cancelled playback','AbortError'));await Promise.resolve();
  assert.equal(film.status().error,'');assert.equal(film.status().currentTime,.75);film.dispose();
});
test('a genuine active play rejection remains visible as a failure',async()=>{
  const f=fixture();f.video.play=()=>Promise.reject(new DOMException('Playback not permitted','NotAllowedError'));
  const film=mountFilm(f.win,f.container,'entry.mp4');f.load();await film.ready;film.show(true);await Promise.resolve();
  assert.match(film.status().error,/Playback not permitted/);assert.equal(f.video.paused,true);film.dispose();
});
test('seeking after completion permits playback and a second completion event',async()=>{
  const f=fixture();let completed=0;const film=mountFilm(f.win,f.container,'entry.mp4',{},()=>completed++);
  f.load();await film.ready;film.show(true);f.video.dispatchEvent(new Event('ended'));assert.equal(completed,1);
  film.seek(.75);film.pause(false);assert.equal(film.status().completed,false);assert.equal(f.video.paused,false);
  f.video.dispatchEvent(new Event('ended'));assert.equal(completed,2);film.dispose();
});
test('reduced motion shows one decoded frame without playing or hanging presentation',async()=>{
  const f=fixture(),film=mountFilm(f.win,f.container,'startup.mp4',{loop:false,reduceMotion:true});
  f.load();await film.ready;film.show(true);assert.equal(film.status().presented,true);assert.equal(f.video.paused,true);film.dispose();
});
test('local embedded film becomes a correct blob without a CSP-sensitive fetch',async()=>{
  const f=fixture();let produced;f.win.fetch=()=>{throw new Error('No connect-src data access is allowed');};
  f.win.atob=s=>Buffer.from(s,'base64').toString('binary');f.win.Blob=Blob;
  f.win.setTimeout=setTimeout;f.win.URL={createObjectURL:blob=>{produced=blob;return 'blob:test-film'},revokeObjectURL(){}};
  const film=mountFilm(f.win,f.container,'data:video/mp4;base64,AP8BBA==',{loop:false});
  // A rejection is asserted below rather than allowed to become unhandled.
  const readyResult=film.ready.catch(e=>e);
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(produced,'embedded media must not depend on connect-src data');
  assert.deepEqual([...new Uint8Array(await produced.arrayBuffer())],[0,255,1,4]);
  f.load();await readyResult;assert.equal(film.status().error,'');film.dispose();
});
