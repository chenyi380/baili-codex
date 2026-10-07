document.querySelector('#inspect').onclick=()=>{
  const state=window.__bailiCodexSkin?.status();
  document.querySelector('#report').textContent=JSON.stringify({state:state||'disposed',frames:document.querySelectorAll('#baili-skin-frame').length,
    styles:document.querySelectorAll('#baili-skin-style').length,controls:document.querySelectorAll('#baili-controls').length,
    themeStyles:document.querySelectorAll('#baili-theme-surfaces').length,
    activeAttribute:document.documentElement.hasAttribute('data-baili-active'),themeColor:getComputedStyle(document.querySelector('#root')).color,inputColor:getComputedStyle(document.querySelector('textarea')).color,
    menuBackground:getComputedStyle(document.querySelector('[role=menu]')).backgroundColor,composerBackground:getComputedStyle(document.querySelector('form')).backgroundColor,editorBackground:getComputedStyle(document.querySelector('textarea')).backgroundColor},null,2);
};
document.querySelector('#theme').onclick=()=>{const root=document.documentElement;root.dataset.theme=root.dataset.theme==='light'?'dark':'light';};
