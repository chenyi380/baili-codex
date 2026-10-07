import test from 'node:test';import assert from 'node:assert/strict';
const art=await import('../construction-field.mjs').catch(()=>({}));
test('births are distributed within each height instead of a vertical refresh front',()=>{
  assert.equal(typeof art.constructionBirth,'function');const means=[];
  for(const y of [.1,.3,.5,.7,.9]){let sum=0,lo=1,hi=0;for(let i=0;i<80;i++){
    const value=art.constructionBirth(.42+i*.58/79,y);assert.ok(value>=0&&value<=1);
    sum+=value;lo=Math.min(lo,value);hi=Math.max(hi,value);
  }assert.ok(hi-lo>.25);means.push(sum/80);}
  assert.ok(Math.max(...means)-Math.min(...means)<.18);
});
