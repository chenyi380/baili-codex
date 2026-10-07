// Playback-only runtime: no Canvas, WebGL texture upload, Sobel or font raster work.
export function mountFilm(win,container,source,config={},onComplete=()=>{}){
  const doc=win.document,video=doc.createElement('video'),motion=win.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed=false,ready=false,presented=false,visible=false,paused=false,completed=false,error='',objectUrl=null,playbackAttempt=0;
  let reduced=!!config.reduceMotion||motion.matches,frames=0,frameId=0,lastMedia=-1,settled=false,resolveReady,rejectReady,loadedAt=0;
  const loop=!!config.loop,startedAt=win.performance.now();let visibleWait=0,lastTick=startedAt;
  video.muted=true;video.defaultMuted=true;video.loop=loop;video.playsInline=true;video.preload='auto';
  video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-label',loop?'白璃 · 静音动态工作壁纸':'白璃 · 预渲染流畅启动动画');
  Object.assign(video.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',display:'block',opacity:'0',pointerEvents:'none',background:'#02050a'});
  container.appendChild(video);
  const initialized=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  function sync(){
    if(disposed)return;
    if(ready&&visible&&!paused&&!reduced&&!doc.hidden&&!completed){
      const attempt=++playbackAttempt;
      video.play().catch(e=>{if(disposed||attempt!==playbackAttempt)return;error='playback: '+e.message;video.pause();});
    }
    else {playbackAttempt++;video.pause();}
    if(ready&&visible&&reduced&&!doc.hidden)presented=true;
  }
  function frame(now,meta){
    frameId=0;if(disposed)return;
    if(visible&&!doc.hidden&&meta.mediaTime!==lastMedia){frames++;lastMedia=meta.mediaTime;if(frames>=2&&meta.mediaTime>0)presented=true;}
    if(video.requestVideoFrameCallback)frameId=video.requestVideoFrameCallback(frame);
  }
  function loaded(){
    if(disposed||ready)return;ready=true;loadedAt=win.performance.now();
    if(video.requestVideoFrameCallback&&!frameId)frameId=video.requestVideoFrameCallback(frame);
    if(!settled){settled=true;resolveReady();}sync();
  }
  function failed(){
    error='film decode failed';ready=false;video.pause();
    if(!settled){settled=true;rejectReady(new Error(error));}
  }
  function ended(){if(loop||completed||disposed)return;completed=true;video.pause();onComplete();}
  function visibility(){lastTick=win.performance.now();sync();}
  function motionChange(){reduced=!!config.reduceMotion||motion.matches;sync();}
  const timer=win.setInterval(()=>{
    if(disposed)return;const now=win.performance.now();if(!doc.hidden)visibleWait+=now-lastTick;lastTick=now;
    if(!ready&&video.readyState>=2)loaded();
    if(!ready&&!settled&&visibleWait>25000){error='film first-frame timeout (visible time)';settled=true;rejectReady(new Error(error));}
    if(ready&&!video.requestVideoFrameCallback&&visible&&!doc.hidden&&video.currentTime!==lastMedia){frames++;lastMedia=video.currentTime;presented=frames>=2&&video.currentTime>0;}
    container.dataset&&(container.dataset.filmState=error?'error':completed?'completed':presented?'presented':ready?'ready':'loading');
  },100);
  video.addEventListener('loadeddata',loaded);video.addEventListener('canplay',loaded);video.addEventListener('error',failed);video.addEventListener('ended',ended);
  doc.addEventListener('visibilitychange',visibility);motion.addEventListener('change',motionChange);
  // Decode in bounded pieces and yield. A data-URI fetch would unnecessarily
  // require connect-src data: under the app CSP; this only uses local media APIs.
  async function assign(){
    try{
      let url=source;if(source.startsWith('data:video/mp4;base64,')){
        const encoded=source.slice(source.indexOf(',')+1),parts=[];
        for(let at=0;at<encoded.length;at+=262144){
          if(disposed)return;const binary=win.atob(encoded.slice(at,at+262144)),bytes=new Uint8Array(binary.length);
          for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);parts.push(bytes);
          if(at+262144<encoded.length)await new Promise(resolve=>win.setTimeout(resolve,0));
        }
        if(disposed)return;objectUrl=win.URL.createObjectURL(new win.Blob(parts,{type:'video/mp4'}));url=objectUrl;
      }
      if(disposed)return;video.src=url;video.load();
    }catch(e){error='film source: '+e.message;if(!settled){settled=true;rejectReady(new Error(error));}}
  }
  void assign();
  return {ready:initialized,status:()=>{const q=video.getVideoPlaybackQuality?.();return{renderer:'video',ready,presented,visible,paused,reduced,completed,loop,frames,currentTime:video.currentTime,videoWidth:video.videoWidth,videoHeight:video.videoHeight,muted:video.muted,error,disposed,loadMs:ready?loadedAt-startedAt:null,quality:q?{totalVideoFrames:q.totalVideoFrames,droppedVideoFrames:q.droppedVideoFrames}:null};},
    show(value){visible=!!value;video.style.opacity=visible?'1':'0';sync();},pause(value){paused=!!value;sync();},
    setReduced(value){reduced=!!value;sync();},sound(value){if(!loop){video.muted=!value;sync();}},
    replay(){if(disposed)return;completed=false;presented=false;frames=0;lastMedia=-1;video.currentTime=0;paused=false;visible=true;video.style.opacity='1';sync();},
    skip(){ended();},
    seek(value){if(!ready||disposed)return;paused=true;completed=false;playbackAttempt++;video.pause();video.currentTime=Math.max(0,Math.min(15.99,Number(value)||0));visible=true;video.style.opacity='1';},
    dispose(){if(disposed)return;disposed=true;video.pause();win.clearInterval(timer);if(frameId)video.cancelVideoFrameCallback?.(frameId);
      for(const [event,fn] of [['loadeddata',loaded],['canplay',loaded],['error',failed],['ended',ended]])video.removeEventListener(event,fn);
      doc.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',motionChange);
      if(!settled){settled=true;resolveReady();}video.removeAttribute('src');video.load();video.remove();if(objectUrl)win.URL.revokeObjectURL(objectUrl);
    }};
}
