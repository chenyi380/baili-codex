import {Output,BufferTarget,Mp4OutputFormat,CanvasSource,AudioBufferSource,Quality} from './vendor/mediabunny-1.61.0.mjs';

export async function encodeVideo(canvas, render, seconds, progress=()=>{},options={}) {
  if(typeof VideoEncoder==='undefined')throw new Error('逐帧 MP4 导出需要支持 WebCodecs 的现代 Chromium 浏览器');
  const fps=options.fps||60,bitrate=options.bitrate||40000000;
  if(canvas.width!==3840||canvas.height!==2160||fps!==60||![16,1.5].includes(seconds))throw new Error('本版导出固定为 3840 × 2160、60 fps，启动/循环 16 秒、工作入场 1.5 秒');
  let audioBuffer=null;
  if(options.audio){
    if(typeof AudioEncoder==='undefined')throw new Error('此浏览器不支持音频编码，请使用现代 Chromium');
    const response=await fetch(options.audio);if(!response.ok)throw new Error('音乐素材读取失败');
    const context=new OfflineAudioContext(2,Math.round(seconds*48000),48000);
    const buffer=await context.decodeAudioData(await response.arrayBuffer());
    const node=context.createBufferSource();node.buffer=buffer;node.connect(context.destination);node.start(0);audioBuffer=await context.startRendering();
  }
  const target=new BufferTarget();
  const output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target});
  const source=new CanvasSource(canvas,{codec:'avc',quality:new Quality({bitrate}),keyFrameInterval:2,contentHint:'detail'});
  const sound=audioBuffer?new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:192000})}):null;
  output.addVideoTrack(source,{frameRate:fps});if(sound)output.addAudioTrack(sound);
  try {
    await output.start();if(sound){await sound.add(audioBuffer);sound.close();}const count=Math.round(seconds*fps);
    for(let i=0;i<count;i++){
      render(i/fps);await source.add(i/fps,1/fps);
      if(i%10===0||i===count-1)progress(Math.round((i+1)/count*100));
    }
    source.close();await output.finalize();
    return {blob:new Blob([target.buffer],{type:'video/mp4'}),extension:'mp4'};
  }catch(error){await output.cancel().catch(()=>{});throw error;}
}
