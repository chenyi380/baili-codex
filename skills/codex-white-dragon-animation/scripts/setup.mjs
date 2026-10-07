import {cp,mkdir,stat,readFile} from 'node:fs/promises';
import {dirname,join,resolve,isAbsolute,parse} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
export async function prepareRuntime({destination,dryRun=false}={}){
  if(process.platform!=='win32')throw new Error('This package supports Windows only');
  const source=fileURLToPath(new URL('../assets/runtime/',import.meta.url));
  const target=destination||join(homedir(),'Documents','Codex','WhiteDragonCodex');
  if(!isAbsolute(target))throw new Error('Choose an absolute runtime directory');
  const resolved=resolve(target);
  if([parse(resolved).root,homedir(),join(homedir(),'Documents')].some(x=>x.toLowerCase()===resolved.toLowerCase()))throw new Error('Choose a dedicated runtime subdirectory');
  if(resolved.toLowerCase().startsWith(source.toLowerCase()))throw new Error('Do not copy runtime into the skill assets');
  await Promise.all(['launcher.mjs','platform.ps1','Start-Codex.cmd','startup.mp4','handoff.mp4','wallpaper.mp4','work-films.mjs','assets/baili-open.png'].map(x=>stat(join(source,x))));
  const config=JSON.parse(await readFile(join(source,'config.json'),'utf8'));
  if(config.audioFile)await stat(join(source,config.audioFile));
  let exists=false;try{await stat(resolved);exists=true;}catch(e){if(e.code!=='ENOENT')throw e;}
  if(exists)throw new Error('Destination exists; refusing to overwrite. Select another dedicated directory or inspect the existing installation first.');
  const result={source,destination:resolved,dryRun,created:false};
  if(dryRun)return result;
  await mkdir(dirname(resolved),{recursive:true});
  await cp(source,resolved,{recursive:true,force:false,errorOnExist:true});
  result.created=true;return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const arg=process.argv.find(x=>x.startsWith('--destination='));
  prepareRuntime({destination:arg?.slice(14),dryRun:process.argv.includes('--dry-run')}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
