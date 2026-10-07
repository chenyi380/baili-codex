import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {mountFilm} from './film.mjs';
import {mountWorkFilms} from './work-films.mjs';

// Written independently for this project. Reference repositories were studied for architecture only.
export function installSkin(win, mount, assets, config, mountVideo, mountWork) {
  if(win.top!==win)return {installed:false,reason:'not-top-window'};
  if(win.__bailiCodexSkin)return {installed:true,alreadyActive:true};
  const doc=win.document, root=doc.documentElement;
  if(!doc.body || !doc.querySelector('#root'))return {installed:false,reason:'main-window-not-ready'};
  const requestedStrength=Number(config.backgroundStrength);
  let scene, wallpaper, wallpaperReady=false, workStarted=false, backgroundPaused=false, disposed=false, phase='loading', ready=false, presented=false, presentationTimer=0, failure='', strength=Math.max(0,Math.min(1,Number.isFinite(requestedStrength)?requestedStrength:.85));
  const original=root.getAttribute('data-baili-active');
  const previousFocus=doc.activeElement;
  const frame=doc.createElement('iframe'); frame.title='白璃 Codex 外观动画'; frame.id='baili-skin-frame';
  Object.assign(frame.style,{position:'fixed',inset:'0',width:'100%',height:'100%',border:'0',zIndex:'2147483645',background:'#02050a',pointerEvents:'auto'});
  const style=doc.createElement('style');
  style.id='baili-skin-style';
  // Backgrounds only. Never replace --color-text, app foreground, theme classes,
  // color-scheme or user accent colors. Portaled menus need the same surface vars.
  style.textContent=`html[data-baili-active] body{background:var(--baili-base,#030710)!important}
html[data-baili-active] #root{position:relative;z-index:1;background:transparent!important}
html[data-baili-active] :is([data-app-shell-frame],[data-app-shell-page-surface=true],#root>div){background:transparent!important}
html[data-baili-active],html[data-baili-active] :where(#root,[data-theme],[data-radix-popper-content-wrapper],[role=menu]){
--app-color-background-surface:var(--baili-shell,rgba(6,12,20,.16))!important;--app-color-background-surface-under:var(--baili-shell,rgba(6,12,20,.16))!important;
--color-token-bg-primary:var(--baili-shell,rgba(6,12,20,.16))!important;--color-token-main-surface-primary:var(--baili-shell,rgba(6,12,20,.16))!important;--chat-background-color:transparent!important;
--app-color-background-elevated-primary:var(--baili-panel,rgba(6,12,20,.32))!important;--app-color-background-elevated-primary-opaque:var(--baili-panel,rgba(6,12,20,.32))!important;
--app-color-background-elevated-secondary:var(--baili-panel,rgba(6,12,20,.32))!important;--app-color-background-elevated-secondary-opaque:var(--baili-panel,rgba(6,12,20,.32))!important;
--menu-background-color:var(--baili-panel,rgba(6,12,20,.32))!important;--composer-background-color:var(--baili-panel,rgba(6,12,20,.32))!important;
--color-background-composer-surface:var(--baili-panel,rgba(6,12,20,.32))!important;--app-shell-sidebar-popover-background:var(--baili-panel,rgba(6,12,20,.32))!important}
html[data-baili-active] :is([role=menu],[data-radix-menu-content],[data-radix-popover-content],#root form:has([contenteditable=true]),#root form:has(textarea)){
background:var(--baili-panel,rgba(6,12,20,.32))!important;backdrop-filter:blur(12px)}
html[data-baili-active] #root :is(textarea,[contenteditable=true]){background:transparent!important}
html[data-baili-active] #root :is(pre,[role=dialog]){background-color:var(--baili-readable,rgba(6,12,20,.85))!important}
#baili-controls{position:fixed;right:18px;bottom:18px;z-index:2147483646;font:12px 'Segoe UI','Microsoft YaHei',sans-serif;color:#d0e1ef}
#baili-controls button{cursor:pointer;font:inherit;border:1px solid #516e83;border-radius:6px;background:#102233;color:#d0e1ef;padding:8px 10px}
#baili-settings{width:280px;padding:14px;margin-bottom:8px;background:#091421;border:1px solid #456077;border-radius:8px;box-shadow:0 8px 30px #0007}
#baili-settings[hidden]{display:none}#baili-settings p{margin:0 0 12px;line-height:1.5;color:#95aec0}
#baili-settings label{display:flex;gap:8px;align-items:center;margin-bottom:12px}#baili-settings input[type=range]{width:140px;accent-color:#9cdaff}
#baili-settings div{display:flex;gap:6px;flex-wrap:wrap}#baili-controls button:focus-visible,#baili-controls input:focus-visible{outline:2px solid #9cdaff;outline-offset:3px}`;
  const controls=doc.createElement('div');controls.id='baili-controls';
  controls.innerHTML='<section id="baili-settings" hidden aria-label="白璃外观设置"><p>白璃 · v11 预渲染播放 · 非官方临时外观层<br>恢复外观不会关闭本机调试端口；退出应用后从原图标打开才能关闭。</p><label>背景强度 <input type="range" min="0" max="100" step="1" aria-label="背景强度"><output></output></label><label>壁纸内容 <select aria-label="壁纸内容"><option value="steady">角色＋标题持续动态</option></select></label><label><input type="checkbox" aria-label="减少动态效果">减少动态效果</label><div><button type="button" data-action="replay">重播</button><button type="button" data-action="pause">暂停背景</button><button type="button" data-action="restore">恢复原外观</button></div></section><button type="button" id="baili-toggle" aria-expanded="false">白璃 · 设置</button><button type="button" id="baili-skip" style="margin-left:6px">跳过动画</button>';
  const panel=controls.querySelector('#baili-settings'), toggle=controls.querySelector('#baili-toggle'), skip=controls.querySelector('#baili-skip');
  const slider=controls.querySelector('input[type=range]'), output=controls.querySelector('output'), reduce=controls.querySelector('input[type=checkbox]');
  slider.value=String(Math.round(strength*100));output.textContent=slider.value+'%';reduce.checked=!!config.reduceMotion||win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const soundLabel=doc.createElement('label'),sound=doc.createElement('input');sound.type='checkbox';sound.setAttribute('aria-label','启用启动音乐');soundLabel.append(sound,'启用启动音乐（点击后重播生效）');panel.insertBefore(soundLabel,panel.querySelector('div'));sound.onchange=()=>scene?.sound(sound.checked);
  const cycleLabel=controls.querySelector('select').parentElement;cycleLabel.textContent='工作背景：1.5 秒文字渐隐后，无文字 16 秒静音循环';
  const opacityLabel=doc.createElement('label'),opacitySlider=doc.createElement('input'),opacityOutput=doc.createElement('output');opacitySlider.type='range';opacitySlider.min='10';opacitySlider.max='90';opacitySlider.step='1';opacitySlider.setAttribute('aria-label','菜单与输入框底色');opacitySlider.value=String(Math.round((Number(config.panelOpacity)||.32)*100));opacityLabel.append('菜单/输入框底色 ',opacitySlider,opacityOutput);panel.insertBefore(opacityLabel,panel.querySelector('div'));
  const themeStyle=doc.createElement('style');themeStyle.id='baili-theme-surfaces';
  function syncTheme(){
    if(disposed)return;const color=win.getComputedStyle(doc.querySelector('#root')).color,parts=color.match(/[\d.]+/g)||[];
    const rgb=parts.slice(0,3).map(Number),lum=rgb.length===3?(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)/255:1;
    const dark=lum>.45,tone=dark?'6,12,20':'245,247,250',base=dark?'#030710':'#f5f7fa',alpha=Number(opacitySlider.value)/100;opacityOutput.textContent=opacitySlider.value+'%';
    const next=`html[data-baili-active]{--baili-base:${base};--baili-shell:rgba(${tone},.16);--baili-panel:rgba(${tone},${alpha});--baili-readable:rgba(${tone},.85)}`;
    if(themeStyle.textContent!==next)themeStyle.textContent=next;
  }
  let themeTimer=0;const themeObserver=new win.MutationObserver(()=>{win.clearTimeout(themeTimer);themeTimer=win.setTimeout(syncTheme,40);});
  themeObserver.observe(root,{attributes:true,attributeFilter:['class','style','data-theme']});themeObserver.observe(doc.querySelector('#root'),{attributes:true,attributeFilter:['class','style','data-theme']});opacitySlider.oninput=syncTheme;
  function backgroundSync(){if(phase!=='background')return;const hold=backgroundPaused||strength===0;
    if(wallpaperReady&&!workStarted){wallpaper.start();workStarted=true;}
    scene?.pause(wallpaperReady||hold);wallpaper?.show(wallpaperReady);wallpaper?.pause(hold);}
  function setStrength(value) {strength=Math.max(0,Math.min(1,Number(value)||0));output.textContent=Math.round(strength*100)+'%';
    if(phase==='background'){frame.style.opacity=String(strength);frame.hidden=strength===0;backgroundSync();}}
  function finish() {if(disposed)return;phase='background';frame.style.zIndex='0';frame.style.opacity=String(strength);frame.style.pointerEvents='none';
    frame.hidden=strength===0;root.setAttribute('data-baili-active','');skip.hidden=true;
    backgroundSync();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
  function replay() {if(!ready||disposed)return;phase='playing';frame.hidden=false;frame.style.zIndex='2147483645';frame.style.opacity='1';frame.style.pointerEvents='auto';
    root.removeAttribute('data-baili-active');skip.hidden=false;workStarted=false;wallpaper?.show(false);scene.pause(false);scene.replay();}
  function dispose() {if(disposed)return;disposed=true;phase='disposed';win.clearTimeout(watchdog);win.clearTimeout(themeTimer);win.clearTimeout(presentationTimer);themeObserver.disconnect();themeStyle.remove();wallpaper?.dispose();scene?.dispose();frame.contentWindow?.removeEventListener('keydown',key,true);frame.remove();controls.remove();style.remove();
    original===null?root.removeAttribute('data-baili-active'):root.setAttribute('data-baili-active',original);
    win.removeEventListener('keydown',key,true);win.removeEventListener('pagehide',dispose);delete win.__bailiCodexSkin;}
  function showPanel() {panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));}
  function key(e) {if(e.ctrlKey&&e.altKey&&e.code==='KeyB'){e.preventDefault();showPanel();}
    else if(e.key==='Escape' && phase==='playing'){e.preventDefault();scene?.skip();}}
  toggle.onclick=showPanel;skip.onclick=()=>scene?.skip();slider.oninput=()=>setStrength(Number(slider.value)/100);reduce.onchange=()=>{scene?.setReduced(reduce.checked);wallpaper?.setReduced(reduce.checked);backgroundSync();};
  controls.querySelector('[data-action=replay]').onclick=replay;
  controls.querySelector('[data-action=pause]').onclick=e=>{backgroundPaused=!backgroundPaused;if(phase==='background')backgroundSync();else scene?.pause(backgroundPaused);e.target.textContent=backgroundPaused?'继续背景':'暂停背景';};
  controls.querySelector('[data-action=restore]').onclick=dispose;
  let watchdog=win.setTimeout(()=>{if(!presented){failure='No visible progressing first frame';dispose();}},25000);
  function confirmPresentation(){
    if(disposed)return;
    const s=scene?.status(),r=frame.getBoundingClientRect();
    if(ready && !doc.hidden && r.width>0 && r.height>0 && s?.presented){
      presented=true;win.clearTimeout(watchdog);return;
    }
    presentationTimer=win.setTimeout(confirmPresentation,100);
  }
  frame.addEventListener('load',()=>{
    if(disposed)return;
    try{
      const fw=frame.contentWindow, fd=fw.document;
      fw.addEventListener('keydown',key,true);
      fd.title='白璃动画';fd.documentElement.lang='zh-CN';fd.body.replaceChildren();
      Object.assign(fd.documentElement.style,{height:'100%',background:'#02050a'});Object.assign(fd.body.style,{position:'relative',margin:'0',width:'100%',height:'100%',overflow:'hidden'});
      scene=mountVideo(fw,fd.body,assets.startup,{...config,loop:false},finish);
      // Decode the intro first. Defer the background's blob/decode work so two
      // 4K streams do not compete for the first visible frame.
      scene.ready.then(()=>{
        if(disposed)return;ready=true;if(phase==='loading')phase='playing';scene.show(true);scene.setReduced(reduce.checked);confirmPresentation();
        if(reduce.checked)scene.skip();
        win.setTimeout(()=>{
          if(disposed)return;wallpaper=mountWork(fw,fd.body,assets.entry,assets.video,config,mountVideo);
          wallpaper.ready.then(()=>{if(disposed)return;wallpaperReady=true;wallpaper.setReduced(reduce.checked);backgroundSync();}).catch(e=>{if(disposed)return;failure='Background film: '+e.message;dispose();});
        },1200);
      })
        .catch(()=>dispose());
    }catch{dispose();}
  },{once:true});
  win.__bailiCodexSkin={dispose,replay,openSettings:showPanel,status:()=>({ready,presented,failure,visibility:doc.visibilityState,phase,strength,backgroundPaused,scene:scene?.status(),wallpaper:wallpaper?.status()})};
  doc.head.append(style,themeStyle);doc.body.appendChild(controls);syncTheme();frame.src='about:blank';doc.body.appendChild(frame);
  win.addEventListener('keydown',key,true);win.addEventListener('pagehide',dispose,{once:true});
  return {installed:true};
}

export async function buildPayload(root) {
  const [startup,video,entry,configText]=await Promise.all(['startup.mp4','wallpaper.mp4','handoff.mp4','config.json'].map(x=>readFile(join(root,x))));
  const config=JSON.parse(configText);
  if(config.wallpaperFile!=='wallpaper.mp4')throw new Error('Expected the dedicated local wallpaper.mp4');
  if(startup.length+video.length+entry.length>23*1024*1024)throw new Error('Combined films exceed the 23 MiB local payload limit');
  const assets={startup:'data:video/mp4;base64,'+startup.toString('base64'),video:'data:video/mp4;base64,'+video.toString('base64'),entry:'data:video/mp4;base64,'+entry.toString('base64')};
  return `(${installSkin.toString()})(window,null,${JSON.stringify(assets)},${JSON.stringify(config)},${mountFilm.toString()},${mountWorkFilms.toString()})`;
}
