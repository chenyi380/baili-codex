import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {existsSync} from 'node:fs';
const root=dirname(fileURLToPath(import.meta.url)),exec=promisify(execFile);
const bundled=join(homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','native','powershell','pwsh.exe');
const ps=process.env.BAILI_POWERSHELL||(existsSync(bundled)?bundled:'pwsh.exe');
async function run(file,args){const {stdout}=await exec(ps,['-NoProfile','-NonInteractive','-File',join(root,file),...args],{windowsHide:true,timeout:15000});return stdout.replace(/^\uFEFF/,'').trim();}
try{
  if(process.platform!=='win32')throw new Error('Windows only');
  const action=process.argv.includes('--install')?'Install':process.argv.includes('--remove')?'Remove':'Inspect';
  const argument=process.argv.find(x=>x.startsWith('--directory='));
  const extra=argument?['-Directory',argument.slice(12)]:[];
  const previous=process.argv.find(x=>x.startsWith('--upgrade-from='));if(previous)extra.push('-PreviousRoot',previous.slice(15));
  const app=JSON.parse(await run('platform.ps1',['-Action','Inspect']));
  const result=await run('shortcut.ps1',['-Action',action,'-Root',root,'-Executable',app.exe,'-LauncherShell',ps,...extra]);
  console.log(result);
}catch(e){console.error(e.message);process.exitCode=1;}
