// One silent periodic 4K film; never crossfade two different faces.
export function mountWallpaper(win,container,source,config={}){
  const doc=win.document,video=doc.createElement('video');let objectUrl=null,disposed=false,visible=false,paused=false,ready=false,error='';
  const motion=win.matchMedia('(prefers-reduced-motion: reduce)');let reduced=!!config.reduceMotion||motion.matches;
  video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-label','白璃 · 单视频 4K 静音循环背景');
  // Keep a decoding surface alive while preloading; opacity hides it behind intro.
  Object.assign(video.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',display:'block',opacity:'0',pointerEvents:'none',background:'#02050a'});container.appendChild(video);
  let url=source;
  if(source.startsWith('data:video/mp4;base64,')){const binary=win.atob(source.slice(source.indexOf(',')+1)),bytes=new Uint8Array(binary.length);for(let i=0;i<bytes.length;i++)bytes[i]=binary.charCodeAt(i);objectUrl=win.URL.createObjectURL(new win.Blob([bytes],{type:'video/mp4'}));url=objectUrl;}
  function sync(){if(ready&&visible&&!paused&&!reduced&&!doc.hidden&&!disposed){video.play().catch(e=>{error=e.message;video.pause();});}else video.pause();}
  let release;
  const initialized=new Promise((resolve,reject)=>{
    let visibleWait=0,last=win.performance.now(),settled=false;
    const timer=win.setInterval(()=>{
      const now=win.performance.now();if(!doc.hidden)visibleWait+=now-last;last=now;
      if(video.readyState>=2){loaded();return;}
      if(visibleWait>25000){error='4K wallpaper first-frame timeout (visible-window time)';cleanup();reject(new Error(error));}
    },250);
    function cleanup(){if(settled)return;settled=true;win.clearInterval(timer);video.removeEventListener('loadeddata',loaded);video.removeEventListener('canplay',loaded);video.removeEventListener('error',failed);}
    function loaded(){cleanup();if(disposed){resolve();return;}ready=true;sync();resolve();}
    function failed(){cleanup();error='4K wallpaper decode failed';reject(new Error(error));}
    release=()=>{cleanup();resolve();};video.addEventListener('loadeddata',loaded,{once:true});video.addEventListener('canplay',loaded,{once:true});video.addEventListener('error',failed,{once:true});video.src=url;video.load();
  });
  function visibility(){sync();}function motionChange(){reduced=!!config.reduceMotion||motion.matches;sync();}
  doc.addEventListener('visibilitychange',visibility);motion.addEventListener('change',motionChange);
  return {ready:initialized,status:()=>{const q=video.getVideoPlaybackQuality?.();return{ready,visible,paused,reduced,cycle:'single-periodic',blending:false,currentTime:video.currentTime,videoWidth:video.videoWidth,videoHeight:video.videoHeight,muted:video.muted,error,disposed,quality:q?{droppedVideoFrames:q.droppedVideoFrames,totalVideoFrames:q.totalVideoFrames}:null};},
    show:value=>{visible=!!value;video.style.opacity=visible?'1':'0';sync();},pause:value=>{paused=!!value;sync();},setReduced:value=>{reduced=!!value;sync();},setCycle:()=>{},
    dispose:()=>{if(disposed)return;disposed=true;video.pause();release();doc.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',motionChange);video.removeAttribute('src');video.load();if(objectUrl)win.URL.revokeObjectURL(objectUrl);video.remove();}};
}
