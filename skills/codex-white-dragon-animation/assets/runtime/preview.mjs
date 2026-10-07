import {mountFilm} from './film.mjs';
import {mountWorkFilms} from './work-films.mjs';
import {playbackStats} from './playback-stats.mjs';
const editing=new URL(location.href).searchParams.has('edit');
if(!editing){
  const stage=document.querySelector('#scene'),status=document.querySelector('#status'),report=document.querySelector('#qa-report');
  stage.style.position='relative';const cfg=await fetch('config.json').then(r=>r.json());
  let bg=null,phase='startup',workStarted=false,hold=false,bench=null,hiddenDuring=false,longTasks=0;
  const observer=typeof PerformanceObserver==='function'?new PerformanceObserver(list=>{longTasks+=list.getEntries().length;}):null;
  try{observer?.observe({type:'longtask',buffered:false});}catch{}
  const boot=mountFilm(window,stage,'startup.mp4',{...cfg,loop:false},finish);
  async function prepareBg(){if(bg)return;bg=mountWorkFilms(window,stage,'handoff.mp4','wallpaper.mp4',cfg);await bg.ready;document.querySelector('#skip').disabled=false;if(phase==='background')showBg();}
  function showBg(){boot.show(false);if(bg&&!workStarted){bg.start();workStarted=true;}bg?.show(true);bg?.pause(hold);}
  function finish(){if(bench){const s=boot.status(),q=s.quality;const wall=(performance.now()-bench.at)/1000;report.textContent=JSON.stringify({kind:'complete-playback',hiddenDuring,width:s.videoWidth,height:s.videoHeight,wallSeconds:+wall.toFixed(3),mediaSeconds:+s.currentTime.toFixed(3),...playbackStats(bench,q,wall),longTasks:longTasks-bench.tasks});bench=null;}phase='background';showBg();}
  function replay(){hold=false;phase='startup';workStarted=false;bg?.show(false);boot.replay();document.querySelector('#pause').textContent='暂停';}
  boot.ready.then(()=>{boot.show(true);setTimeout(()=>prepareBg().catch(e=>status.textContent=e.message),1200);}).catch(e=>status.textContent=e.message);
  document.querySelector('#export').hidden=true;document.querySelector('#export-wallpaper').hidden=true;document.querySelector('#export-handoff').hidden=true;
  document.querySelector('#editor-link').hidden=false;
  document.querySelector('#qa-controls').hidden=false;document.querySelector('#eye-qa').hidden=true;document.querySelector('#loop-qa').hidden=true;
  document.querySelector('#bench').hidden=false;document.querySelector('#bench').onclick=()=>{const q=boot.status().quality;hiddenDuring=document.hidden;bench={at:performance.now(),frames:q?.totalVideoFrames||0,dropped:q?.droppedVideoFrames||0,tasks:longTasks};report.textContent='正在测量完整 16 秒播放，请保持此页可见…';replay();};
  document.querySelector('#replay').onclick=replay;document.querySelector('#skip').onclick=()=>{bench=null;boot.pause(true);finish();};
  document.querySelector('#pause').onclick=e=>{hold=!hold;(phase==='startup'?boot:bg)?.pause(hold);e.target.textContent=hold?'继续':'暂停';};
  document.querySelector('#reduce').onchange=e=>{boot.setReduced(e.target.checked);bg?.setReduced(e.target.checked);if(e.target.checked){bench=null;finish();}};
  document.querySelector('#sound').onclick=e=>{const enable=boot.status().muted;boot.sound(enable);e.target.textContent=enable?'关闭启动音乐':'启用启动音乐并重播';replay();};
  document.querySelector('#fullscreen').onclick=()=>stage.requestFullscreen();
  function seek(value){bench=null;phase='startup';bg?.show(false);boot.seek(value);}
  document.querySelector('#timeline').oninput=e=>seek(e.target.value);
  document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{seek(b.dataset.time);document.querySelector('#timeline').value=b.dataset.time;});
  document.querySelectorAll('[data-entry-time]').forEach(b=>b.onclick=()=>{if(!bg)return;bench=null;phase='background';hold=true;workStarted=true;boot.show(false);bg.seekEntry(b.dataset.entryTime);document.querySelector('#pause').textContent='继续';});
  const timer=setInterval(()=>{const s=(phase==='startup'?boot:bg)?.status();if(!s)return;status.textContent=s.error||`${phase==='startup'?'启动视频':s.phase==='entry'?'工作入场 · 文字淡出':'无文字动态工作壁纸'} · ${s.videoWidth} × ${s.videoHeight} · ${s.currentTime.toFixed(2)} 秒 · 累计解码 ${s.quality?.totalVideoFrames??0} 帧 / 丢帧 ${s.quality?.droppedVideoFrames??0} · ${s.paused?'暂停':s.reduced?'减少动态':'播放'}`;},250);
  const onVisibility=()=>{if(bench&&document.hidden)hiddenDuring=true;};document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('pagehide',()=>{clearInterval(timer);observer?.disconnect();boot.dispose();bg?.dispose();document.removeEventListener('visibilitychange',onVisibility);},{once:true});
}else{
document.querySelector('#entry-checkpoints').hidden=true;
const [{mountScene},{encodeVideo},{mountWallpaper}]=await Promise.all([import('./scene.mjs'),import('./encode-video.mjs'),import('./wallpaper.mjs')]);
const stage=document.querySelector('#scene'), status=document.querySelector('#status');
const cfg=await fetch('config.json').then(r=>{if(!r.ok)throw new Error('config.json 未找到');return r.json();});
stage.style.position='relative';
let wallpaperReady=false;
function enterWallpaper(){if(!wallpaperReady)return;scene.pause(true);wallpaper.show(true);wallpaper.pause(false);}
function leaveWallpaper(){wallpaper.show(false);}
const scene=mountScene(window,stage,{open:'assets/baili-open.png',closed:'assets/baili-closed.png',audio:cfg.audioFile},cfg,enterWallpaper);
const wallpaper=mountWallpaper(window,stage,cfg.wallpaperFile||'startup.mp4',cfg);
wallpaper.ready.then(()=>{wallpaperReady=true;if(scene.status().mode==='background')enterWallpaper();}).catch(e=>{status.textContent='视频壁纸未加载，使用实时画布：'+e.message;});
window.__bailiPreview={status:()=>({scene:scene.status(),wallpaper:wallpaper.status()})};
if(new URL(location.href).searchParams.has('qa')){
  document.querySelector('#qa-controls').hidden=false;
  document.querySelector('#eye-qa').onclick=async()=>{
    await scene.ready;leaveWallpaper();const times=[3.1,3.25,3.40,3.55,3.70,3.95,10.70,10.735,10.775,10.84,10.92,10.975];
    const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=912;const g=sheet.getContext('2d',{alpha:false}),source=stage.querySelector('canvas');
    for(let i=0;i<times.length;i++){scene.seek(times[i]);const st=scene.status(),s=Math.max(source.width/1672,source.height/940);
      const dx=(source.width-1672*s)/2,dy=(source.height-940*s)/2,x=(i%4)*360,y=Math.floor(i/4)*304;
      g.fillStyle='#07101b';g.fillRect(x,y,360,304);g.drawImage(source,dx+1290*s,dy+285*s,330*s,225*s,x,y+35,360,245);g.fillStyle='white';g.font='16px Segoe UI';g.fillText(`${times[i]}s · open=${st.eyeOpenness.toFixed(3)}`,x+10,y+24);
    }
    const blob=await new Promise(ok=>sheet.toBlob(ok,'image/png'));const res=await fetch('/save-qa',{method:'POST',headers:{'Content-Type':'image/png','X-Baili-Export':cfg.exportKey},body:blob});document.querySelector('#qa-report').textContent=res.ok?'眼睑检查图已保存':'保存失败';
  };
  document.querySelector('#loop-qa').onclick=async()=>{
    await scene.ready;leaveWallpaper();scene.background();const source=stage.querySelector('canvas'),g=source.getContext('2d');
    // record() supplies the same deterministic frame callback used by the encoder.
    const result=await scene.record(async(c,render)=>{render(0);const a=g.getImageData(0,0,c.width,c.height).data.slice();render(16);const b=g.getImageData(0,0,c.width,c.height).data;let max=0,total=0,count=0;for(let i=0;i<a.length;i+=4)for(let j=0;j<3;j++){const d=Math.abs(a[i+j]-b[i+j]);max=Math.max(max,d);total+=d;count++;}return{maxDifference:max,meanDifference:total/count};},()=>{},{background:true});
    document.querySelector('#qa-report').textContent=JSON.stringify(result);
  };
}
let persistentError='';
scene.ready.catch(error=>{status.textContent=error.message;});
document.querySelector('#replay').onclick=()=>{leaveWallpaper();scene.pause(false);scene.replay();document.querySelector('#pause').textContent='暂停';};
document.querySelector('#skip').onclick=()=>scene.skip();
document.querySelector('#pause').onclick=e=>{const video=wallpaper.status().visible,p=!(video?wallpaper.status().paused:scene.status().paused);video?wallpaper.pause(p):scene.pause(p);e.target.textContent=p?'继续':'暂停';};
document.querySelector('#fullscreen').onclick=()=>stage.requestFullscreen().catch(e=>{status.textContent=e.message;});
document.querySelector('#reduce').onchange=e=>{scene.setReduced(e.target.checked);wallpaper.setReduced(e.target.checked);};
document.querySelector('#timeline').oninput=e=>{leaveWallpaper();scene.seek(e.target.value);};
document.querySelector('#timeline').onchange=e=>{leaveWallpaper();scene.seek(e.target.value);};
document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{leaveWallpaper();scene.seek(b.dataset.time);document.querySelector('#timeline').value=b.dataset.time;});
document.querySelector('#sound').onclick=e=>{const enable=!scene.status().soundEnabled;scene.sound(enable);e.target.textContent=enable?'关闭启动音乐':'启用启动音乐并重播';if(enable){leaveWallpaper();scene.pause(false);scene.replay();}};
let previousVideoURL=null;
async function exportFilm(e,background=false,handoff=false){
  const button=e.target;document.querySelectorAll('button,input').forEach(x=>x.disabled=true);persistentError='';button.textContent=`4K / ${handoff?90:960} 帧编码 0%…`;
  try{leaveWallpaper();const {blob,extension}=await scene.record(encodeVideo,p=>{button.textContent=`${handoff?'淡出':background?'背景':'启动'}逐帧编码 ${p}%…`;},{background,handoff});enterWallpaper();if(previousVideoURL)URL.revokeObjectURL(previousVideoURL);previousVideoURL=null;
    const a=document.querySelector('#video-download');
    if(cfg.exportKey){const saved=await fetch('/save-export',{method:'POST',headers:{'Content-Type':blob.type,'X-Baili-Export':cfg.exportKey},body:blob});
      if(!saved.ok)throw new Error('本地视频保存失败：'+saved.status);const data=await saved.json();a.href=data.url;a.download=data.file;
      a.textContent=`已保存到 exports：下载视频（${extension.toUpperCase()}）`;}
    else{previousVideoURL=URL.createObjectURL(blob);a.href=previousVideoURL;a.download=`baili-codex-startup.${extension}`;a.textContent=`下载已导出的视频（${extension.toUpperCase()}）`;}
    a.hidden=false;}
  catch(error){persistentError=error.message;status.textContent=persistentError;}
  finally{document.querySelectorAll('button,input').forEach(x=>x.disabled=false);button.textContent=handoff?'导出文字淡出':background?'导出工作背景':'导出启动视频';}
}
document.querySelector('#export').onclick=e=>exportFilm(e,false);
document.querySelector('#export-wallpaper').onclick=e=>exportFilm(e,true);
document.querySelector('#export-handoff').onclick=e=>exportFilm(e,true,true);
window.addEventListener('keydown',e=>{if(e.key==='Escape')scene.skip();});
const timer=setInterval(()=>{const s=scene.status(),v=wallpaper.status();if(s.ready)status.textContent=persistentError||(v.visible?`4K 视频壁纸 · ${v.videoWidth} × ${v.videoHeight} · ${v.paused?'已暂停':v.reduced?'静态模式':'独立工作背景循环'} · 静音`:`启动动画 · ${s.fixedTime!==null?'定格 '+s.fixedTime.toFixed(2)+' 秒':s.paused?'已暂停':s.reduced?'静态模式':s.fps+' fps'} · ${s.canvasWidth} × ${s.canvasHeight}${s.soundBlocked?' · 请点击音乐按钮启用声音':''}${s.deformError?' · 图形回退：'+s.deformError:''}`);},1000);
window.addEventListener('pagehide',()=>{clearInterval(timer);if(previousVideoURL)URL.revokeObjectURL(previousVideoURL);wallpaper.dispose();scene.dispose();delete window.__bailiPreview;},{once:true});
}
