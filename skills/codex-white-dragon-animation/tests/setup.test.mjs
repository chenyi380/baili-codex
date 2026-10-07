import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm,copyFile} from 'node:fs/promises';import {dirname,join,resolve} from 'node:path';import {fileURLToPath} from 'node:url';
import {prepareRuntime} from '../scripts/setup.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
async function temporary(run){const dir=await mkdtemp(join(root,'.test-setup-'));
  try{return await run(dir);}finally{if(!resolve(dir).startsWith(resolve(root)+ '\\'+'.test-setup-'))throw new Error('Unsafe test cleanup target');await rm(dir,{recursive:true});}
}
test('authorized bundled music is accepted and dry run creates no runtime directory',()=>temporary(async(dir)=>{
  const target=join(dir,'runtime');let result,error;try{result=await prepareRuntime({destination:target,dryRun:true});}catch(e){error=e;}
  assert.equal(error,undefined,'music explicitly included in this release must not be rejected as private');
  assert.equal(result.created,false);await assert.rejects(stat(target),{code:'ENOENT'});
}));
test('prepared runtime preserves the three films and bundled audio without local state',()=>temporary(async(dir)=>{
  const target=join(dir,'runtime');let result,error;try{result=await prepareRuntime({destination:target});}catch(e){error=e;}
  assert.equal(error,undefined);assert.equal(result.created,true);
  const source=new URL('../assets/runtime/',import.meta.url);
  for(const name of ['startup.mp4','handoff.mp4','wallpaper.mp4','assets/startup-audio.m4a'])assert.deepEqual(await readFile(join(target,name)),await readFile(new URL(name,source)));
  for(const name of ['local-consent.json','session.json','launcher.log'])await assert.rejects(stat(join(target,name)),{code:'ENOENT'});
}));
test('existing destination refuses overwrite and preserves its content',()=>temporary(async(dir)=>{
  const protectedFile=join(dir,'pet.json');await copyFile(new URL('../../../pets/baili/pet.json',import.meta.url),protectedFile);const before=await readFile(protectedFile);
  await assert.rejects(prepareRuntime({destination:dir,dryRun:true}),/Destination exists/);assert.deepEqual(await readFile(protectedFile),before);
}));
