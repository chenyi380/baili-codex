import test from 'node:test';import assert from 'node:assert/strict';
const stats=await import('../playback-stats.mjs').catch(()=>({}));
test('measurement subtracts prior decode and drop counters on replay',()=>{
  assert.equal(typeof stats.playbackStats,'function');
  assert.deepEqual(stats.playbackStats({frames:360,dropped:6},{totalVideoFrames:720,droppedVideoFrames:12},6.034),{decodedFrames:360,droppedFrames:6,meanPresentedFps:58.67});
});
test('zero-drop playback reports the interval rather than cumulative totals',()=>{
  assert.equal(typeof stats.playbackStats,'function');
  assert.deepEqual(stats.playbackStats({frames:720,dropped:12},{totalVideoFrames:1080,droppedVideoFrames:12},6),{decodedFrames:360,droppedFrames:0,meanPresentedFps:60});
});
