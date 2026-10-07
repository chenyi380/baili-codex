// Restrict this adapter to the verified loopback listener and the main app document.
export function mainTarget(target) {
  try {
    const u=new URL(target.url);
    if(target.type!=='page'||u.protocol!=='app:'||u.hostname!=='-'||u.pathname!=='/index.html')return false;
    const route=u.searchParams.get('initialRoute')||'/';
    return !/avatar|quick.?chat|detached|mini|popover|notification|browser|review/i.test(route);
  }catch{return false;}
}
export function socketUrl(url,port) {
  const u=new URL(url);
  if(u.protocol!=='ws:'||u.hostname!=='127.0.0.1'||Number(u.port)!==port||u.username||u.password||!/^\/devtools\/page\/[\w-]+$/.test(u.pathname)||u.search||u.hash)throw new Error('Rejected non-local or unexpected debugger address');
  return u.href;
}
export async function attach(url) {
  const ws=new WebSocket(url), pending=new Map();let serial=0,closed=false;
  function clear(error){closed=true;for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();}
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.close();reject(new Error('Debugger connection timeout'));},5000);
    ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Debugger connection failed'));},{once:true});
    ws.addEventListener('close',()=>{clearTimeout(timer);reject(new Error('Debugger closed before ready'));},{once:true});
  });
  ws.addEventListener('close',()=>clear(new Error('Debugger disconnected')));
  ws.addEventListener('error',()=>clear(new Error('Debugger transport error')));
  ws.addEventListener('message',event=>{let msg;try{msg=JSON.parse(event.data);}catch{return;}
    const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result);});
  return {
    call(method,params={},timeout=12000){return new Promise((resolve,reject)=>{
      if(closed||ws.readyState!==WebSocket.OPEN)return reject(new Error('Debugger is not open'));
      const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error(method+' timed out'));},timeout);
      pending.set(id,{resolve,reject,timer});try{ws.send(JSON.stringify({id,method,params}));}catch(e){clearTimeout(timer);pending.delete(id);reject(e);}
    });},
    close(){clear(new Error('Debugger closed'));ws.close();}
  };
}
