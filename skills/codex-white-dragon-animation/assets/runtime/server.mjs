import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPayload} from './integration.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const files=new Map([
  ['/', ['index.html','text/html']],['/index.html',['index.html','text/html']],['/preview.css',['preview.css','text/css']],
  ['/preview.mjs',['preview.mjs','text/javascript']],['/scene.mjs',['scene.mjs','text/javascript']],['/config.json',['config.json','application/json']],
  ['/wallpaper.mjs',['wallpaper.mjs','text/javascript']],
  ['/eye-motion.mjs',['eye-motion.mjs','text/javascript']],
  ['/film.mjs',['film.mjs','text/javascript']],
  ['/motion.mjs',['motion.mjs','text/javascript']],
  ['/contour-map.mjs',['contour-map.mjs','text/javascript']],
  ['/reveal.mjs',['reveal.mjs','text/javascript']],
  ['/hair-rig.mjs',['hair-rig.mjs','text/javascript']],
  ['/construction-field.mjs',['construction-field.mjs','text/javascript']],
  ['/playback-stats.mjs',['playback-stats.mjs','text/javascript']],
  ['/work-phase.mjs',['work-phase.mjs','text/javascript']],
  ['/work-films.mjs',['work-films.mjs','text/javascript']],
  ['/handoff.mp4',['handoff.mp4','video/mp4']],
  ['/assets/style-contours.png',['assets/style-contours.png','image/png']],
  ['/assets/style-material.png',['assets/style-material.png','image/png']],
  ['/wallpaper.mp4',['wallpaper.mp4','video/mp4']],
  ['/eye.html',['tests/eye.html','text/html']],['/eye-check.mjs',['tests/eye-check.mjs','text/javascript']],
  ['/encode-video.mjs',['encode-video.mjs','text/javascript']],['/vendor/mediabunny-1.61.0.mjs',['vendor/mediabunny-1.61.0.mjs','text/javascript']],
  ['/assets/baili-open.png',['assets/baili-open.png','image/png']],['/assets/baili-closed.png',['assets/baili-closed.png','image/png']],
  ['/assets/startup-audio.m4a',['assets/startup-audio.m4a','audio/mp4']],
  ['/test-host.html',['tests/host.html','text/html']],['/test-host.css',['tests/host.css','text/css']],['/test-host.mjs',['tests/host.mjs','text/javascript']]
  ,['/startup.mp4',['startup.mp4','video/mp4']],['/video-check.html',['tests/video.html','text/html']],['/video-check.mjs',['tests/video.mjs','text/javascript']]
]);
const exportKey=randomBytes(32).toString('hex');let savedBytes=0;
const payload=await buildPayload(root);
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.method==='POST'&&url.pathname==='/save-qa'){
      if(req.headers.origin!==`http://127.0.0.1:${server.address().port}`||req.headers['x-baili-export']!==exportKey){res.writeHead(403);res.end();return;}
      const len=Number(req.headers['content-length']);if(req.headers['content-type']!=='image/png'||!Number.isInteger(len)||len<8||len>10*1024*1024){res.writeHead(413);res.end();return;}
      const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>len){res.writeHead(413);res.end();return;}chunks.push(c);}
      const data=Buffer.concat(chunks);if(size!==len||data.subarray(1,4).toString()!=='PNG'){res.writeHead(400);res.end();return;}
      await mkdir(join(root,'exports'),{recursive:true});await writeFile(join(root,'exports','eye-qa.png'),data);res.writeHead(201);res.end('Saved');return;
    }
    if(req.method==='POST' && url.pathname==='/save-export'){
      const origin=`http://127.0.0.1:${server.address().port}`;
      if(req.headers.origin!==origin || req.headers['x-baili-export']!==exportKey){res.writeHead(403);res.end('Rejected export origin');return;}
      const mime=String(req.headers['content-type']).split(';')[0].toLowerCase(),len=Number(req.headers['content-length']);
      if(!['video/mp4','video/webm'].includes(mime)||!Number.isInteger(len)||len<8||len>256*1024*1024||savedBytes+len>512*1024*1024){res.writeHead(413);res.end('Invalid or oversized export');return;}
      savedBytes+=len;const chunks=[];let bytes=0;
      for await(const chunk of req){bytes+=chunk.length;if(bytes>len){res.writeHead(413);res.end();return;}chunks.push(chunk);}
      if(bytes!==len){res.writeHead(400);res.end();return;}
      const binary=Buffer.concat(chunks), ext=mime==='video/mp4'?'mp4':'webm';
      if(ext==='mp4' && binary.subarray(4,8).toString()!=='ftyp'){res.writeHead(400);res.end('Invalid MP4 header');return;}
      if(ext==='webm' && binary.readUInt32BE(0)!==0x1a45dfa3){res.writeHead(400);res.end('Invalid WebM header');return;}
      const name=`baili-codex-startup-${Date.now()}-${randomBytes(3).toString('hex')}.${ext}`;
      await mkdir(join(root,'exports'),{recursive:true});await writeFile(join(root,'exports',name),binary,{flag:'wx'});
      const route='/exports/'+name;files.set(route,['exports/'+name,mime]);
      res.writeHead(201,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({url:route,file:name,bytes}));return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    if(url.pathname==='/test-payload.mjs'){
      res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':payload);return;
    }
    const route=files.get(url.pathname);if(!route){res.writeHead(404);res.end('Not found');return;}
    const data=url.pathname==='/config.json'?Buffer.from(JSON.stringify({...JSON.parse(await readFile(join(root,'config.json'),'utf8')),exportKey})):await readFile(join(root,route[0]));
    const range=/^bytes=(\d+)-(\d*)$/.exec(String(req.headers.range||''));
    if(range && ['video/mp4','video/webm','audio/mp4'].includes(route[1])){
      const begin=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;
      if(begin>end||begin>=data.length){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});res.end();return;}
      res.writeHead(206,{'Content-Type':route[1],'Content-Length':end-begin+1,'Accept-Ranges':'bytes','Content-Range':`bytes ${begin}-${end}/${data.length}`,'Cache-Control':'no-store'});res.end(req.method==='HEAD'?'':data.subarray(begin,end+1));return;
    }
    res.writeHead(200,{'Content-Type':route[1]+'; charset=utf-8','Content-Length':data.length,'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self' about:; media-src 'self' data: blob:; object-src 'none'"});
    res.end(req.method==='HEAD'?'':data);
  }catch{res.writeHead(500);res.end('Local file unavailable');}
});
const argument=process.argv.find(a=>a.startsWith('--port='));const port=argument?Number(argument.slice(7)):0;
server.listen(port,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:'+server.address().port+'/'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
