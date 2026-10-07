import {mountFilm} from './film.mjs';
// Playback-only: no blend between character frames and no work-time canvas rendering.
export function mountWorkFilms(win,container,entrySource,loopSource,config={},makeFilm=mountFilm){
  let phase='waiting',visible=false,paused=false,disposed=false,reduced=!!config.reduceMotion||!!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const loop=makeFilm(win,container,loopSource,{...config,loop:true});
  const entry=makeFilm(win,container,entrySource,{...config,loop:false},finishEntry);
  function sync(){
    if(disposed)return;entry.show(visible&&phase==='entry');loop.show(visible&&phase==='loop');
    entry.pause(paused);loop.pause(paused);
  }
  function finishEntry(){if(disposed||phase!=='entry')return;phase='loop';sync();}
  const ready=Promise.all([entry.ready,loop.ready]).then(()=>{if(!disposed)sync();});
  return {ready,
    start(){if(disposed)return;loop.replay();loop.show(false);entry.replay();phase=reduced?'loop':'entry';sync();},
    show(value){visible=!!value;sync();},pause(value){paused=!!value;sync();},
    setReduced(value){reduced=!!value;entry.setReduced(value);loop.setReduced(value);if(reduced)finishEntry();sync();},
    seekEntry(value){if(disposed)return;phase='entry';entry.seek(Math.max(0,Math.min(1.49,Number(value)||0)));paused=true;visible=true;sync();},
    status(){const active=phase==='loop'?loop:entry;return {...active.status(),phase,paused,disposed,entry:entry.status(),loopFilm:loop.status()};},
    dispose(){if(disposed)return;disposed=true;entry.dispose();loop.dispose();}
  };
}
