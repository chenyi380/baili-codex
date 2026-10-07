// Browser media event surface used to exercise the real playback controller in Node.
export function fixture(){
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
