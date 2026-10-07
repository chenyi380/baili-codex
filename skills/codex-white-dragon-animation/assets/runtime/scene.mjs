import {eyeMotion} from './eye-motion.mjs';
import {windMotion} from './motion.mjs';
import {thinContour} from './contour-map.mjs';
import {revealPhase} from './reveal.mjs';
import {createHairField} from './hair-rig.mjs';
import {constructionBirth} from './construction-field.mjs';
import {workFrame} from './work-phase.mjs';
// Original deterministic 2.5D renderer. Model passed explicitly into native payload.
export function mountScene(win, container, assets, config = {}, onComplete = () => {}, sampleEye=eyeMotion, sampleWind=windMotion, makeContour=thinContour) {
  const doc=win.document,canvas=doc.createElement('canvas');
  canvas.setAttribute('aria-label','白璃：柔和轮廓显现、冷蓝材质、连续睁眼、眼内数字流与环绕星光');
  Object.assign(canvas.style,{width:'100%',height:'100%',display:'block'});container.appendChild(canvas);
  const screenContext=canvas.getContext('2d',{alpha:false});if(!screenContext)throw new Error('Canvas 2D is unavailable');let ctx=screenContext;
  const image=new win.Image(),closed=new win.Image(),linePlate=new win.Image(),materialPlate=new win.Image();
  const edgeLayer=doc.createElement('canvas'),titleLayer=doc.createElement('canvas'),portraitLayer=doc.createElement('canvas');
  const portraitContext=portraitLayer.getContext('2d',{alpha:false});
  const deformLayer=doc.createElement('canvas');let deform=null,deformError='';
  const duration=Number(config.durationSeconds)||16;
  const media=win.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=!!config.reduceMotion||media.matches,mode='boot',disposed=false,paused=false,ready=false,completed=false;
  let raf=0,start=0,last=-1,heldAt=0,heldTotal=0,pausedAt=0,elapsed=0,fixedTime=null,edge=null,renderSize=null;
  let fps=0,frames=0,measureAt=0,recording=false,renderedFrames=0;
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};
  const ramp=(t,a,b)=>ease((t-a)/(b-a));
  const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)};
  const particles=Array.from({length:24},(_,i)=>({x:noise(i+1),y:noise(i+51),r:.45+noise(i+87)*1.1,speed:.002+noise(i+129)*.004}));
  const audio=assets.audio?new win.Audio(assets.audio):null;let soundEnabled=false,soundBlocked=false;
  if(audio){audio.preload='auto';audio.volume=1;}
  function soundSync(){
    if(!audio)return;
    if(!soundEnabled||mode!=='boot'||paused||doc.hidden||recording||fixedTime!==null){audio.pause();return}
    if(Math.abs(audio.currentTime-elapsed)>.3)audio.currentTime=Math.min(elapsed,Math.max(0,(audio.duration||duration)-.03));
    audio.play().then(()=>soundBlocked=false).catch(()=>soundBlocked=true);
  }
  function size(){
    const r=container.getBoundingClientRect(),limit=Math.max(1280,Math.min(3840,Number(config.liveMaxWidth)||3840)),scale=Math.min(2,win.devicePixelRatio||1,limit/Math.max(1,r.width));
    canvas.width=renderSize?renderSize[0]:Math.max(320,Math.round(r.width*scale/2)*2);
    canvas.height=renderSize?renderSize[1]:Math.max(180,Math.round(r.height*scale/2)*2);
    titleLayer.width=Math.round(canvas.width*.52);titleLayer.height=Math.round(canvas.height*.32);
    portraitLayer.width=canvas.width;portraitLayer.height=canvas.height;
    deformLayer.width=canvas.width;deformLayer.height=canvas.height;
    if(ready)paint(elapsed);
  }
  function mapping(t){
    const W=canvas.width,H=canvas.height,breathing=1; // No camera motion disguised as hair motion.
    const s=Math.max(W/image.naturalWidth,H/image.naturalHeight)*breathing;
    return {s,dx:(W-image.naturalWidth*s)/2,dy:(H-image.naturalHeight*s)/2};
  }
  function portrait(source,map,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingQuality='high';ctx.drawImage(source,map.dx,map.dy,image.naturalWidth*map.s,image.naturalHeight*map.s);ctx.restore()}
  function contours(){
    const c=doc.createElement('canvas');c.width=Math.round(image.naturalWidth*.5);c.height=Math.round(image.naturalHeight*.5);
    const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingQuality='high';g.drawImage(closed,0,0,c.width,c.height);
    const data=g.getImageData(0,0,c.width,c.height).data,lum=new Float32Array(c.width*c.height),out=g.createImageData(c.width,c.height),w=c.width;
    for(let i=0;i<lum.length;i++)lum[i]=data[i*4]*.2126+data[i*4+1]*.7152+data[i*4+2]*.0722;
    const strokes=makeContour(lum,c.width,c.height);
    for(let y=1;y<c.height-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x;
      // Half-resolution anti-aliased gradients suppress tiny skin/texture noise.
      // Keep major hair/wing/horn structure, not every pore and glitter fleck.
      const a=strokes[i]*ramp(x/w,.32,.56);
      out.data[i*4]=118;out.data[i*4+1]=203;out.data[i*4+2]=248;out.data[i*4+3]=Math.round(a);
    }
    g.putImageData(out,0,0);edgeLayer.width=c.width;edgeLayer.height=c.height;return c;
  }
  function contourPass(t,map,u){
    if(!edge)return;const a=ramp(u,.20,1.3)*(1-ramp(u,3.15,5.35));if(a<.001)return;
    const g=edgeLayer.getContext('2d'),W=edge.width,H=edge.height,p=ramp(u,.2,3.3);
    g.clearRect(0,0,W,H);g.globalCompositeOperation='source-over';g.drawImage(edge,0,0);g.globalCompositeOperation='destination-in';
    const x=W*(.28+1.04*p),mask=g.createLinearGradient(x-W*.19,H*.72,x+W*.14,H*.28);
    mask.addColorStop(0,'white');mask.addColorStop(1,'transparent');g.fillStyle=mask;g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';
    // Map the half-size contour raster back to the exact same portrait bounds.
    const draw=alpha=>{ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(edgeLayer,map.dx,map.dy,image.naturalWidth*map.s,image.naturalHeight*map.s);ctx.restore();};
    ctx.save();ctx.filter=`blur(${canvas.width*.0011}px)`;draw(a*.32);ctx.restore();draw(a*.90);
    const sweep=canvas.width*(.40+.61*p),beam=ctx.createLinearGradient(sweep-canvas.width*.026,0,sweep+canvas.width*.026,0);
    beam.addColorStop(0,'transparent');beam.addColorStop(.5,`rgba(107,213,255,${a*.08})`);beam.addColorStop(1,'transparent');
    ctx.fillStyle=beam;ctx.fillRect(canvas.width*.40,0,canvas.width*.60,canvas.height);
  }
  // The steady periodic solution of m*x'' + c*x' + k*x = F*sin(w*t).
  // This is a 2D damped-spring field, not a 3D strand/collision simulation.
  function spring(t,m,c,k,force,harmonic,phase=0){const w=Math.PI*harmonic/8;
    return force/Math.hypot(k-m*w*w,c*w)*Math.sin(w*t+phase-Math.atan2(c*w,k-m*w*w));}
  function openness(t,u,isBg){
    return sampleEye(t,u,isBg,reduced).open;
  }
  function initDeform(){
    const gl=deformLayer.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,premultipliedAlpha:false});
    if(!gl)throw new Error('WebGL unavailable: static image fallback');
    const hairField=createHairField(256,144,image.naturalWidth,image.naturalHeight);
    const birthMap=new Uint8Array(256*144*4);
    for(let i=0;i<256*144;i++){const v=Math.round(constructionBirth((i%256+.5)/256,(Math.floor(i/256)+.5)/144)*255);birthMap[i*4]=v;birthMap[i*4+1]=v;birthMap[i*4+2]=v;birthMap[i*4+3]=255;}
    const vertex='attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.0)*.5;gl_Position=vec4(a,0.,1.);}';
    const fragment=`precision highp float;varying vec2 uv;
uniform sampler2D opened;uniform sampler2D shut;uniform sampler2D lines;uniform sampler2D material;uniform sampler2D hairMap;uniform sampler2D birthMap;uniform vec2 screen;uniform vec2 origin;uniform float scale;uniform vec2 photo;uniform float aperture;uniform vec3 construction;
vec4 openAt(vec2 p){return texture2D(opened,(p*scale+origin)/screen);}
vec4 closedAt(vec2 p){return texture2D(shut,p/photo);}
float gauss(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-dot(d,d));}
void main(){
vec2 p=((vec2(uv.x,1.-uv.y)*screen)-origin)/scale;
vec2 n=p/photo;
// Six independently phased guide ribbons; roots and protected facial regions
// are zero in the displacement map. Every portrait plate uses the same motion.
vec2 movement=(texture2D(hairMap,n).rg*255.-128.)/2.5;
p-=movement;
vec4 col=openAt(p);
vec2 e=(p-vec2(1461.,416.))/vec2(177.,130.);
float patch=1.-smoothstep(.82,1.,dot(e,e));
if(patch>0. && aperture<.99999){
float q=clamp((p.x-1335.)/257.,0.,1.);
float bend=pow(max(0.,sin(q*3.14159265)),.85);
float shutLine=mix(424.,417.,q)+25.*bend;
float openLine=mix(424.,417.,q)-60.*bend;
float lowerLine=mix(424.,417.,q)+43.*bend;
float closing=1.-aperture;
float edge=mix(openLine,shutLine,closing);
// The lower lid stays nearly still until late closure. Do not squeeze/scale the iris.
float bottom=mix(lowerLine,shutLine,pow(closing,3.));
vec2 cp=p,op=p;
// Warp both real eyelid surfaces onto one moving boundary. Fully opaque output;
// never alpha-blend an eye layer over another eye.
vec4 lid;
if(p.y<edge){
cp.y=312.+(p.y-312.)*(shutLine-312.)/max(1.,edge-312.);
op.y=312.+(p.y-312.)*(openLine-312.)/max(1.,edge-312.);
// Both samples are skin ABOVE the lid edge, never a half-transparent eye.
lid=mix(closedAt(cp),openAt(op),pow(aperture,.55));
}else{
// Lower-lid skin uses only the open source: prevents a second row of upper lashes.
op.y=lowerLine+(p.y-bottom)*(520.-lowerLine)/max(1.,520.-bottom);
lid=openAt(op);
}
// Iris is uncovered geometrically, not faded through skin. A subpixel edge
// antialiases only the aperture boundary, never the whole eyelid patch.
float inside=smoothstep(edge-.45,edge+.45,p.y)*(1.-smoothstep(bottom-.45,bottom+.45,p.y));
inside*=smoothstep(1335.,1340.,p.x)*(1.-smoothstep(1588.,1592.,p.x));
inside*=smoothstep(.008,.025,aperture);
vec4 eye=mix(lid,openAt(p),inside);
// Closing lashes are attached to the upper lid, not left below the aperture.
// Their dark strand coverage can occlude the iris; skin remains fully opaque.
float lashDistance=p.y-edge;
if(lashDistance>=0. && lashDistance<28.*closing && aperture<.30){
vec4 lash=closedAt(vec2(p.x,shutLine+lashDistance));
float coverage=(1.-smoothstep(.19,.36,dot(lash.rgb,vec3(.2126,.7152,.0722))))*(1.-smoothstep(.08,.30,aperture));
eye=mix(eye,lash,coverage);
}
if(aperture<.008)eye=closedAt(p);
col=mix(col,eye,patch);
}
// A single opaque composite: constructed lines -> approved material plate ->
// stable finished portrait. Topology is gone before the iris is uncovered.
vec2 artUV=p/photo;
vec3 finished=pow(max(col.rgb,vec3(0.)),vec3(1.035))*vec3(.76,.83,.94);
vec3 wire=texture2D(lines,artUV).rgb;
vec3 mesh=texture2D(material,artUV).rgb;
// Different contour groups come alive across the whole figure. No Y-coordinate
// scan line, band, or hard replacement front. Material joins globally and softly.
float birth=texture2D(birthMap,artUV).r;
float built=smoothstep(birth-.32,birth+.32,construction.x*1.3);
// A continuous faint contour bed prevents dark masking islands. Bright outline
// cores appear first; local groups brighten gently instead of chopping the art.
float wireLight=dot(wire,vec3(.2126,.7152,.0722));
float core=smoothstep(.44*(1.-construction.x),.44*(1.-construction.x)+.085,wireLight);
wire*=construction.x*(.42+.58*built)*core;
float flesh=construction.y;
float settled=construction.z;
vec3 art=mix(wire,mesh,flesh);
col=vec4(mix(art,finished,settled),1.);
gl_FragColor=vec4(col.rgb,1.);
}`;
    function shader(kind,src){const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
    const program=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const at=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);
    const textures=[0,1,2,3,4,5].map(i=>{const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return tex;});
    gl.uniform1i(gl.getUniformLocation(program,'opened'),0);gl.uniform1i(gl.getUniformLocation(program,'shut'),1);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures[1]);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,closed);
    for(const [i,name,source] of [[2,'lines',linePlate],[3,'material',materialPlate]]){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.uniform1i(gl.getUniformLocation(program,name),i);}
    for(const [i,name,bytes] of [[4,'hairMap',hairField.frame(0)],[5,'birthMap',birthMap]]){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,256,144,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);gl.uniform1i(gl.getUniformLocation(program,name),i);}
    const uniforms=Object.fromEntries(['screen','origin','scale','photo','aperture','construction'].map(k=>[k,gl.getUniformLocation(program,k)]));
    return {draw(t,map,open,u,isBg){
      gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[0]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,portraitLayer);
      gl.uniform2f(uniforms.screen,canvas.width,canvas.height);gl.uniform2f(uniforms.origin,map.dx,map.dy);gl.uniform1f(uniforms.scale,map.s);gl.uniform2f(uniforms.photo,image.naturalWidth,image.naturalHeight);gl.uniform1f(uniforms.aperture,open);
      const phase=revealPhase(u,reduced,isBg);gl.uniform3f(uniforms.construction,phase.lineHead,phase.materialMix,phase.settleMix);
      gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,textures[4]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,256,144,gl.RGBA,gl.UNSIGNED_BYTE,hairField.frame(t,reduced));gl.drawArrays(gl.TRIANGLES,0,6);
      if(gl.isContextLost())throw new Error('WebGL context lost');
    },dispose(){textures.forEach(x=>gl.deleteTexture(x));gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);}};
  }
  function iris(t,map,alpha){
    const iw=image.naturalWidth,ih=image.naturalHeight,cx=iw*.878,cy=ih*.438,rx=iw*.036,ry=ih*.058;
    ctx.save();ctx.setTransform(map.s,0,0,map.s,map.dx,map.dy);ctx.globalAlpha=alpha;
    ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,-.07,0,Math.PI*2);ctx.clip();
    const shade=ctx.createRadialGradient(cx,cy,0,cx,cy,ry);shade.addColorStop(0,'rgba(3,31,38,.26)');shade.addColorStop(.68,'rgba(5,40,48,.12)');shade.addColorStop(1,'transparent');ctx.fillStyle=shade;ctx.fillRect(cx-rx,cy-ry,rx*2,ry*2);ctx.globalCompositeOperation='screen';
    const lens=ctx.createRadialGradient(cx,cy,0,cx,cy,ry);lens.addColorStop(0,'rgba(18,172,149,.035)');lens.addColorStop(.72,'rgba(44,223,189,.085)');lens.addColorStop(1,'rgba(136,190,255,.06)');ctx.fillStyle=lens;ctx.fillRect(cx-rx,cy-ry,rx*2,ry*2);
    const pitch=ry*.185;ctx.font=`${ry*.105}px Consolas,monospace`;ctx.textAlign='center';
    for(const col of [-.24,.27]){
      const x=cx+rx*col,shift=reduced?0:Math.sin(t*Math.PI/8+col)*ry*.045;
      ctx.fillStyle='rgba(53,234,181,.22)';ctx.fillRect(x-rx*.028,cy-ry*.66+shift,rx*.056,ry*1.23);
      for(let j=0;j<10;j++){ctx.fillStyle=`rgba(107,255,213,${.16+.12*Math.sin(t*Math.PI/4+j)**2})`;ctx.fillRect(x-rx*.024,cy-ry*.6+j*ry*.115+shift,rx*.048,ry*.018)}
    }
    for(let col=0;col<7;col++){
      const x=cx+(col-3)*rx*.205,scroll=reduced?0:((t*(col+2)/16*pitch+col*9)%pitch);
      for(let row=-7;row<8;row++){
        const y=cy+row*pitch+scroll,d=clamp(1-Math.abs(y-cy)/ry),code=['0','1','{','}','|','·'][Math.floor(noise(col*31+row+97)*6)];
        ctx.fillStyle=`rgba(64,246,185,${d*(col===2||col===4?.58:.27)})`;ctx.fillText(code,x,y);
        if((row+col)%4===0){ctx.fillStyle=`rgba(83,255,212,${d*.19})`;ctx.fillRect(x-1.2,y-5,2.4,4)}
      }
    }
    ctx.lineWidth=Math.max(.65,iw*.00045);
    for(let i=0;i<18;i++){
      const angle=i*Math.PI/9+(reduced?0:t*Math.PI/8),r=.78+.025*Math.sin(t*Math.PI/4+i);
      ctx.strokeStyle=`rgba(146,228,255,${.15+.10*Math.sin(t*Math.PI/4+i)**2})`;ctx.beginPath();ctx.ellipse(cx,cy,rx*r,ry*r,-.07,angle,angle+.052);ctx.stroke();
    }
    const gx=cx-rx*.32+(reduced?0:Math.sin(t*Math.PI/8)*rx*.08),gy=cy-ry*.48+(reduced?0:Math.cos(t*Math.PI/8)*ry*.035);
    const glint=ctx.createRadialGradient(gx,gy,0,gx,gy,ry*.22);glint.addColorStop(0,'rgba(238,254,255,.27)');glint.addColorStop(.23,'rgba(170,226,255,.12)');glint.addColorStop(1,'transparent');ctx.fillStyle=glint;ctx.fillRect(gx-ry*.22,gy-ry*.22,ry*.44,ry*.44);ctx.restore();
  }
  function label(value,x,y,font,color,tracking=0){ctx.font=font;ctx.fillStyle=color;ctx.textAlign='left';for(const ch of value){ctx.fillText(ch,x,y);x+=ctx.measureText(ch).width+tracking}}
  function sparkle(x,y,r,a){
    const W=canvas.width;ctx.save();ctx.globalAlpha=a;ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(x,y,0,x,y,r*6);g.addColorStop(0,'rgba(220,248,255,.65)');g.addColorStop(.16,'rgba(140,214,255,.26)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r*6,y-r*6,r*12,r*12);
    ctx.lineWidth=Math.max(.5,W*.0003);ctx.strokeStyle='#c2ebff';ctx.beginPath();ctx.moveTo(x-r*3.5,y);ctx.lineTo(x+r*3.5,y);ctx.moveTo(x,y-r*2.8);ctx.lineTo(x,y+r*2.8);ctx.stroke();ctx.fillStyle='#f7ffff';ctx.beginPath();ctx.arc(x,y,r*.55,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function orbit(t,u,front){
    const W=canvas.width,H=canvas.height,a=reduced?0:ramp(u,1.4,2.75);if(a<.002)return;
    const cx=W*.245,cy=H*.447,rx=W*.211,ry=H*.092,tilt=-.14;
    const point=angle=>{const x=Math.cos(angle)*rx,y=Math.sin(angle)*ry;return [cx+x*Math.cos(tilt)-y*Math.sin(tilt),cy+x*Math.sin(tilt)+y*Math.cos(tilt)]};
    ctx.save();ctx.lineWidth=Math.max(.7,W*.00035);
    for(let i=0;i<3;i++){
      const angle=t*Math.PI/8+i*Math.PI*2/3,near=Math.sin(angle)>0;if(near!==front)continue;
      for(let j=0;j<30;j++){const p1=point(angle-j*.011),p2=point(angle-(j+1)*.011);ctx.strokeStyle=`rgba(133,217,255,${a*(front?.30:.14)*(1-j/30)**2})`;ctx.beginPath();ctx.moveTo(...p1);ctx.lineTo(...p2);ctx.stroke()}
      const [x,y]=point(angle);sparkle(x,y,W*(front?.00125:.0008),a*(front?.92:.38));
    }ctx.restore();
  }
  function title(t,u){
    const W=canvas.width,H=canvas.height,word=String(config.title??'Codex').slice(0,32),font=`italic 800 ${W*.111}px "Segoe UI",Arial,sans-serif`,x=W*.054,y=H*.515;
    ctx.save();ctx.font=font;ctx.lineWidth=W*.0008;ctx.strokeStyle='#9ec3e0';let at=x;const baseAlpha=ctx.globalAlpha;
    for(let i=0;i<word.length;i++){ctx.globalAlpha=baseAlpha*(reduced?1:ramp(u,1.65+i*.10,2.7+i*.10));ctx.strokeText(word[i],at,y);at+=ctx.measureText(word[i]).width}ctx.restore();
    const g=titleLayer.getContext('2d');g.clearRect(0,0,titleLayer.width,titleLayer.height);g.globalCompositeOperation='source-over';g.font=font;
    const gy=H*.198,silver=g.createLinearGradient(0,gy-W*.095,0,gy);silver.addColorStop(0,'#fdfeff');silver.addColorStop(.46,'#d8e9ff');silver.addColorStop(.76,'#9ec1e6');silver.addColorStop(1,'#4e76a4');g.fillStyle=silver;g.fillText(word,W*.011,gy);
    if(!reduced){const p=ramp(u,2.2,4.2),edgeX=(-.20+.93*p)*W,mask=g.createLinearGradient(edgeX-W*.125,0,edgeX+W*.08,0);mask.addColorStop(0,`rgba(255,255,255,${ramp(u,2.2,2.9)})`);mask.addColorStop(1,'transparent');g.globalCompositeOperation='destination-in';g.fillStyle=mask;g.fillRect(0,0,titleLayer.width,titleLayer.height);g.globalCompositeOperation='source-over'}
    ctx.save();ctx.shadowColor='#78b8f4';ctx.shadowBlur=W*.0025;ctx.drawImage(titleLayer,W*.043,H*.317);ctx.restore();
    if(!reduced&&u>2.15&&u<4.8){const at=W*(.045+.375*ramp(u,2.15,4.8)),a=Math.sin(ramp(u,2.15,4.8)*Math.PI)*.65;ctx.save();ctx.translate(at,H*.531);ctx.scale(1,.035);const light=ctx.createRadialGradient(0,0,0,0,0,W*.15);light.addColorStop(0,`rgba(240,254,255,${a})`);light.addColorStop(.05,`rgba(164,216,255,${a*.5})`);light.addColorStop(1,'transparent');ctx.fillStyle=light;ctx.fillRect(-W*.15,-W*.15,W*.30,W*.30);ctx.restore()}
  }
  function paint(elapsedTime){
    const phase=workFrame(elapsedTime,mode),t=phase.motionTime;
    const W=canvas.width,H=canvas.height,isBg=mode!=='boot',u=isBg?11:t,map=mapping(t);
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=0;ctx.fillStyle='#02050a';ctx.fillRect(0,0,W,H);
    const reveal=1;
    if(reveal>0){
      // Composite the eye into the character first, then fade the entire character once.
      // Separate low-alpha passes previously doubled brightness inside the eye patch.
      try{ctx=portraitContext;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=0;portrait(image,map,1);iris(t,map,1)}finally{ctx=screenContext}
      let rendered=portraitLayer;
      if(deform){try{deform.draw(t,map,openness(t,u,isBg),u,isBg);rendered=deformLayer;}catch(e){deformError=e.message;deform.dispose();deform=null;}}
      else if(openness(t,u,isBg)<.5){ctx=portraitContext;portrait(closed,map,1);ctx=screenContext;}
      ctx.save();ctx.globalAlpha=reveal;ctx.drawImage(rendered,0,0);ctx.restore();
    }
    // No v06/v07 photo-edge or generated mathematical-grid pass. Approved art is composited in the shader.
    const wash=ctx.createLinearGradient(0,0,W*.67,0),washStrength=revealPhase(u,reduced,isBg).settleMix;wash.addColorStop(0,`rgba(0,3,8,${.30*washStrength})`);wash.addColorStop(.69,`rgba(0,3,8,${.13*washStrength})`);wash.addColorStop(1,'transparent');ctx.fillStyle=wash;ctx.fillRect(0,0,W,H);
    if(!reduced)for(let i=0;i<particles.length;i++){const p=particles[i],x=(p.x+.014*Math.sin(t*Math.PI/8+i))*W,y=(p.y+.007*Math.sin(t*Math.PI/8+i))*H;ctx.fillStyle=`rgba(134,200,255,${.025+.085*(.5+.5*Math.sin(t*Math.PI/8+i))})`;ctx.beginPath();ctx.arc(x,y,p.r*W/1600,0,Math.PI*2);ctx.fill()}
    {
      orbit(t,u,false);ctx.save();ctx.globalAlpha=phase.brandOpacity;
      label('OPENAI / CODEX',W*.055,H*.086,`600 ${W*.012}px "Segoe UI",sans-serif`,'#b7c9d8',W*.002);
      label('AN AI COMPANION FOR A BETTER TOMORROW',W*.055,H*.109,`500 ${W*.0067}px "Segoe UI",sans-serif`,'#6b8399',W*.0015);
      ctx.strokeStyle='#3f5468';ctx.lineWidth=W*.00035;ctx.beginPath();ctx.moveTo(W*.055,H*.137);ctx.lineTo(W*.411,H*.137);ctx.stroke();title(t,u);
      ctx.save();ctx.globalAlpha*=reduced?1:ramp(u,3.1,4.5);
      label(String(config.subtitle??'欢迎来到专业工作模式').slice(0,48),W*.065,H*.588,`600 ${W*.019}px "Microsoft YaHei","Segoe UI",sans-serif`,'#c9deef',W*.0027);
      label(String(config.englishSubtitle??'YOUR AI CODING COMPANION').slice(0,64),W*.067,H*.624,`600 ${W*.0083}px "Segoe UI",sans-serif`,'#8aa7be',W*.0032);ctx.restore();
      const messages=['> preparing visual layer...','> rendering white dragon...','> digital iris online...','> visual layer ready'];ctx.save();ctx.globalAlpha*=reduced?1:ramp(u,3.4,4.2);
      for(let i=0;i<messages.length;i++){const a=reduced?1:ramp(u,3.5+i*.5,4.05+i*.5);ctx.save();ctx.globalAlpha*=a;label(messages[i],W*.058,H*(.710+i*.022),`${W*.009}px Consolas,monospace`,i===3?'#92d8cd':'#567e88');ctx.restore()}ctx.restore();
      label('BAILI // WHITE DRAGON',W*.057,H*.904,`600 ${W*.0075}px "Segoe UI",sans-serif`,'#adbfce',W*.0015);label('GENTLE SPIRIT · BRIGHT IDEAS',W*.057,H*.93,`500 ${W*.0065}px "Segoe UI",sans-serif`,'#668098',W*.0014);
      if(!isBg)label('VISUAL INTRO — ESC TO SKIP',W*.67,H*.951,`${W*.0068}px "Segoe UI",sans-serif`,'#7c97ad',W*.0009);ctx.restore();orbit(t,u,true);
    }
    renderedFrames++;container.dataset.phase=mode==='handoff'?'text-fade':isBg?'background':u<1.1?'contours':u<3.16?'render':u<3.94?'eye-opening':'open-eye';container.dataset.elapsed=elapsedTime.toFixed(3);container.dataset.brandOpacity=phase.brandOpacity.toFixed(4);
  }
  function end(){if(completed)return;completed=true;mode='background';audio?.pause();onComplete();paint(elapsed)}
  function tick(now){
    raf=0;if(disposed||paused||doc.hidden||fixedTime!==null)return;const rate=mode==='background'?Math.max(5,Math.min(60,Number(config.backgroundFps)||24)):60;
    if(now-last>=1000/rate-.5){last=now;elapsed=(now-start-heldTotal)/1000;paint(elapsed);frames++;if(now-measureAt>1000){fps=Math.round(frames*1000/(now-measureAt));frames=0;measureAt=now}if(mode==='boot'&&elapsed>=duration)end()}
    if(!reduced)raf=win.requestAnimationFrame(tick);
  }
  function play(){if(disposed||!ready||paused||doc.hidden||fixedTime!==null||reduced||raf)return;raf=win.requestAnimationFrame(tick)}
  function visibility(){if(doc.hidden){heldAt=win.performance.now();win.cancelAnimationFrame(raf);raf=0;audio?.pause()}else{if(heldAt)heldTotal+=win.performance.now()-heldAt;heldAt=0;play();soundSync()}}
  function pause(value){if(paused===value||recording)return;paused=value;if(value){pausedAt=win.performance.now();win.cancelAnimationFrame(raf);raf=0}else{heldTotal+=win.performance.now()-pausedAt;pausedAt=0;play()}soundSync()}
  function setReduced(value){if(recording)return;reduced=!!value;win.cancelAnimationFrame(raf);raf=0;if(ready){if(reduced&&mode==='boot')end();paint(elapsed);play()}}
  function motionChange(){setReduced(!!config.reduceMotion||media.matches)}
  const resize=new win.ResizeObserver(size);resize.observe(container);doc.addEventListener('visibilitychange',visibility);media.addEventListener('change',motionChange);
  const loaded=Promise.all([image,closed,linePlate,materialPlate].map(img=>new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(new Error('人物/已批准风格素材加载失败'));img.decoding='async'})));image.src=assets.open;closed.src=assets.closed;linePlate.src=assets.contours||'assets/style-contours.png';materialPlate.src=assets.material||'assets/style-material.png';
  const initialized=loaded.then(()=>{if(disposed)return;ready=true;start=win.performance.now();measureAt=start;if(doc.hidden)heldAt=start;size();try{deform=initDeform();}catch(e){deformError=e.message;}if(reduced)end();paint(0);play()});
  return {
    ready:initialized,status:()=>({ready,mode,completed,paused,reduced,elapsed,fps,renderedFrames,visibility:doc.visibilityState,fixedTime,canvasWidth:canvas.width,canvasHeight:canvas.height,disposed,recording,soundEnabled,soundBlocked,deformation:!!deform,deformError,eyeOpenness:openness(elapsed,elapsed,mode==='background')}),pause,setReduced,
    sound:value=>{soundEnabled=!!value;soundSync();return soundEnabled},
    skip:()=>{if(ready&&!recording){fixedTime=null;completed=false;end();start=win.performance.now()-elapsed*1000;heldTotal=0;play()}},
    replay:()=>{if(!ready||disposed||recording)return;mode='boot';completed=false;elapsed=0;fixedTime=null;heldTotal=0;start=win.performance.now();last=-1;if(reduced)end();paint(0);play();soundSync()},
    seek:seconds=>{if(!ready||disposed||recording)return;fixedTime=Math.max(0,Number(seconds)||0);mode=fixedTime>=duration?'background':'boot';completed=mode==='background';elapsed=fixedTime;win.cancelAnimationFrame(raf);raf=0;audio?.pause();paint(fixedTime)},
    background:()=>{if(!recording){mode='background';completed=true;audio?.pause();paint(elapsed)}},
    async record(encode,progress,options={}){
      if(recording)throw new Error('正在导出');if(!ready)await initialized;const wasReduced=reduced;recording=true;reduced=false;paused=false;
      renderSize=[Number(config.exportWidth)||3840,Number(config.exportHeight)||2160];fixedTime=0;mode=options.handoff?'handoff':options.background?'background':'boot';completed=false;win.cancelAnimationFrame(raf);raf=0;audio?.pause();size();
      try{if(!deform)throw new Error('导出需要 WebGL 眼睑/发束渲染：'+deformError);return await encode(canvas,t=>{fixedTime=t;elapsed=t;paint(t)},options.handoff?1.5:duration,progress,{fps:Number(config.exportFps)||60,bitrate:Number(config.exportBitrate)||40000000,audio:options.background||options.handoff?null:assets.audio})}
      finally{recording=false;renderSize=null;fixedTime=null;reduced=wasReduced;mode='background';completed=true;elapsed=duration;start=win.performance.now()-duration*1000;heldTotal=0;last=-1;size();play()}
    },
    dispose:()=>{if(disposed)return;disposed=true;win.cancelAnimationFrame(raf);resize.disconnect();doc.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',motionChange);audio?.pause();if(audio){audio.removeAttribute('src');audio.load()}deform?.dispose();deform=null;deformLayer.width=0;image.src='';closed.src='';linePlate.src='';materialPlate.src='';edge=null;edgeLayer.width=0;titleLayer.width=0;portraitLayer.width=0;canvas.remove()}
  };
}
