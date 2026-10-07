export function playbackStats(start,quality,seconds){
  const decodedFrames=quality.totalVideoFrames-start.frames;
  const droppedFrames=quality.droppedVideoFrames-start.dropped;
  return {decodedFrames,droppedFrames,meanPresentedFps:+((decodedFrames-droppedFrames)/seconds).toFixed(2)};
}
