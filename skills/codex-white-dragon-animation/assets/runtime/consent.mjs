import {readFile,writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const files=['consent.mjs','launcher.mjs','platform.ps1','cdp.mjs','integration.mjs','scene.mjs','eye-motion.mjs','wallpaper.mjs','film.mjs','work-films.mjs','Desktop-Launch.ps1','config.json'];
export async function binding(root,app){
  if(!app.userSid||!app.version||app.signature!=='Valid OpenAI')throw new Error('Cannot bind consent to an unverified application/account');
  const hash=createHash('sha256');for(const name of files){hash.update(name);hash.update(await readFile(join(root,name)));}
  return {schema:1,userSid:app.userSid,version:app.version,family:app.family,exe:app.exe,codeHash:hash.digest('hex'),scope:'127.0.0.1 debugger until app fully exits'};
}
export function sameBinding(a,b){return !!a&&a.accepted===true&&['schema','userSid','version','family','exe','codeHash','scope'].every(k=>a[k]===b[k]);}
export async function hasConsent(root,app){const expected=await binding(root,app);try{return sameBinding(JSON.parse(await readFile(join(root,'local-consent.json'),'utf8')),expected);}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return false;throw e;}}
export async function remember(root,app){const bound=await binding(root,app);await writeFile(join(root,'local-consent.json'),JSON.stringify({...bound,accepted:true,acceptedAt:new Date().toISOString()},null,2));}
export async function forget(root){try{const record=JSON.parse(await readFile(join(root,'local-consent.json'),'utf8'));if(record.schema!==1||record.scope!=='127.0.0.1 debugger until app fully exits')throw new Error('Refusing to remove an unrecognized consent file');await unlink(join(root,'local-consent.json'));}catch(e){if(e.code!=='ENOENT')throw e;}}
