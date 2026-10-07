const v=document.querySelector('#video'),out=document.querySelector('#metadata');
v.onloadedmetadata=()=>{out.textContent=`${v.videoWidth} × ${v.videoHeight} · ${v.duration.toFixed(2)} 秒 · MP4 已加载`;};
v.onerror=()=>{out.textContent='MP4 加载失败，错误码 '+v.error?.code;};
document.querySelector('#play').onclick=()=>{v.currentTime=0;v.play().catch(error=>out.textContent=error.message)};
document.querySelector('#transition').onclick=()=>{v.pause();v.currentTime=3.2};
document.querySelector('#eye-open').onclick=()=>{v.pause();v.currentTime=7.4};
v.onended=()=>{out.textContent=`完整播放结束 · ${v.videoWidth} × ${v.videoHeight} · ${v.currentTime.toFixed(2)} 秒 · 无解码错误`;};
