for(const file of ['baili-open.png','baili-closed.png']){
  const img=new Image();img.src='/assets/'+file;await img.decode();const c=document.createElement('canvas');c.width=1000;c.height=620;document.querySelector('#views').append(c);const g=c.getContext('2d');
  const x=1280,y=280,w=350,h=217;g.drawImage(img,x,y,w,h,0,0,1000,620);g.font='12px monospace';
  for(let px=1300;px<1630;px+=20){const at=(px-x)/w*1000;g.strokeStyle='#6fffff55';g.beginPath();g.moveTo(at,0);g.lineTo(at,620);g.stroke();g.fillStyle='#dfffff';g.fillText(String(px),at,18);}
  for(let py=300;py<490;py+=20){const at=(py-y)/h*620;g.strokeStyle='#6fffff55';g.beginPath();g.moveTo(0,at);g.lineTo(1000,at);g.stroke();g.fillStyle='#dfffff';g.fillText(String(py),5,at);}
}
