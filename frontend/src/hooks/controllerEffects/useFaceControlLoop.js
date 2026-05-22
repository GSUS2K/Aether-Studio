import { useEffect } from 'react';

export function useFaceControlLoop(props) {
  const {
    Uint8Array, cameraMotionRef, cameraUiUpdateRef, clamp01, faceActionRef, faceLoopRef, faceStreamRef, faceVideoRef,
    gestureRuntimeRef, isFaceControlEnabled, localAudioRef, setCameraHandSignal, setFaceControlSignal, setFaceControlStatus, setIsCameraPreviewVisible, setIsFaceControlEnabled,
    setVolume, setVolumeToast, showGestureNotice,
  } = props;

  useEffect(() => {
  if (!isFaceControlEnabled) {
    if (faceLoopRef.current) {
      window.clearTimeout(faceLoopRef.current);
      faceLoopRef.current = 0;
    }
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(track => track.stop());
      faceStreamRef.current = null;
    }
    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = null;
    }
    faceActionRef.current = {
      lastActionAt: 0,
      lastZone: 'center',
      centeredFrames: 0
    };
    cameraMotionRef.current = {
      prevLuma: null,
      active: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      startAt: 0,
      lastSeenAt: 0,
      lastActionAt: 0
    };
    setFaceControlStatus('Camera off');
    setFaceControlSignal({
      x: 0,
      y: 0,
      confidence: 0,
      source: 'idle'
    });
    setCameraHandSignal({
      x: 0,
      y: 0,
      motion: 0,
      last: 'idle'
    });
    return undefined;
  }
  setIsCameraPreviewVisible(true);
  let cancelled = false;
  let detector = null;
  const hasFaceDetector = typeof window !== 'undefined' && 'FaceDetector' in window;
  const fallbackCanvas = document.createElement('canvas');
  fallbackCanvas.width = 72;
  fallbackCanvas.height = 54;
  const fallbackCtx = fallbackCanvas.getContext('2d', {
    willReadFrequently: true
  });
  const supportStatus = hasFaceDetector ? 'Starting face and hand tracker...' : 'Starting camera (no FaceDetector API — using fallback)...';
  console.log('[Aether/Camera] Initialising. FaceDetector available:', hasFaceDetector);
  setFaceControlStatus(supportStatus);
  cameraUiUpdateRef.current.status = supportStatus;
  const updateFaceStatus = status => {
    if (cameraUiUpdateRef.current.status === status) return;
    cameraUiUpdateRef.current.status = status;
    setFaceControlStatus(status);
  };
  const updateFaceSignal = (next, minDelay = 220) => {
    const now = Date.now();
    if (now - cameraUiUpdateRef.current.faceAt < minDelay) return;
    cameraUiUpdateRef.current.faceAt = now;
    setFaceControlSignal(next);
  };
  const updateHandSignal = (next, minDelay = 240) => {
    const now = Date.now();
    if (now - cameraUiUpdateRef.current.handAt < minDelay) return;
    cameraUiUpdateRef.current.handAt = now;
    setCameraHandSignal(next);
  };
  const nudgeCameraVolume = delta => {
    setVolume(prev => {
      const next = clamp01(prev + delta);
      if (localAudioRef.current) localAudioRef.current.volume = next;
      window.aether?.store?.set('volume', next);
      return next;
    });
    setVolumeToast(true);
    setTimeout(() => setVolumeToast(false), 900);
  };
  const setHeadPosition = (x, y) => {
    const safeX = clamp01((x + 1) / 2) * 2 - 1;
    const safeY = clamp01((y + 1) / 2) * 2 - 1;
    document.documentElement.style.setProperty('--aether-head-x', String(safeX));
    document.documentElement.style.setProperty('--aether-head-y', String(safeY));
    return {
      safeX,
      safeY
    };
  };
  const runFaceAction = zone => {
    const now = Date.now();
    const actionState = faceActionRef.current;
    if (zone === 'center') {
      // Require 4 consecutive center frames before resetting (hysteresis)
      actionState.centeredFrames = Math.min((actionState.centeredFrames || 0) + 1, 8);
      if (actionState.centeredFrames >= 4) actionState.lastZone = 'center';
      actionState.holdFrames = 0;
      actionState.holdZone = null;
      return;
    }
    actionState.centeredFrames = 0;

    // Must hold the same zone for 3 consecutive frames to avoid jitter triggers
    if (actionState.holdZone === zone) {
      actionState.holdFrames = (actionState.holdFrames || 0) + 1;
    } else {
      actionState.holdZone = zone;
      actionState.holdFrames = 1;
    }
    if (actionState.holdFrames < 3) return;

    // Must return to center first, cooldown 1400ms
    if (actionState.lastZone !== 'center' || now - actionState.lastActionAt < 1400) return;
    actionState.lastZone = zone;
    actionState.lastActionAt = now;
    actionState.holdFrames = 0;
    if (zone === 'left') {
      gestureRuntimeRef.current.handleControl?.('previous');
      showGestureNotice('👈 Face: previous track');
      gestureRuntimeRef.current.appendRecentEvent?.('face_previous', 'Look left', {
        tone: 'transport'
      });
    } else if (zone === 'right') {
      gestureRuntimeRef.current.handleControl?.('skip');
      showGestureNotice('👉 Face: next track');
      gestureRuntimeRef.current.appendRecentEvent?.('face_next', 'Look right', {
        tone: 'transport'
      });
    } else if (zone === 'up' || zone === 'down') {
      nudgeCameraVolume(zone === 'up' ? 0.1 : -0.1);
      showGestureNotice(zone === 'up' ? '👆 Face: volume up' : '👇 Face: volume down');
      gestureRuntimeRef.current.appendRecentEvent?.('face_volume', zone === 'up' ? 'Look up' : 'Look down', {
        tone: 'neutral'
      });
    }
  };
  const runCameraHandAction = direction => {
    const now = Date.now();
    const motionState = cameraMotionRef.current;
    if (now - motionState.lastActionAt < 1200) return;
    motionState.lastActionAt = now;
    motionState.active = false;
    if (direction === 'left') {
      gestureRuntimeRef.current.handleControl?.('skip');
      showGestureNotice('🤚 Wave left → next track');
      gestureRuntimeRef.current.appendRecentEvent?.('hand_next', 'Camera swipe left', {
        tone: 'transport'
      });
    } else if (direction === 'right') {
      gestureRuntimeRef.current.handleControl?.('previous');
      showGestureNotice('🤚 Wave right → previous track');
      gestureRuntimeRef.current.appendRecentEvent?.('hand_previous', 'Camera swipe right', {
        tone: 'transport'
      });
    } else if (direction === 'up' || direction === 'down') {
      nudgeCameraVolume(direction === 'up' ? 0.1 : -0.1);
      showGestureNotice(direction === 'up' ? '🤚 Wave up → vol up' : '🤚 Wave down → vol down');
      gestureRuntimeRef.current.appendRecentEvent?.('hand_volume', direction === 'up' ? 'Camera swipe up' : 'Camera swipe down', {
        tone: 'neutral'
      });
    }
    setCameraHandSignal(prev => ({
      ...prev,
      last: `swipe ${direction}`
    }));
  };
  const sampleCameraFrame = video => {
    if (!fallbackCtx) return {
      frame: null,
      avg: 0
    };
    fallbackCtx.drawImage(video, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
    const frame = fallbackCtx.getImageData(0, 0, fallbackCanvas.width, fallbackCanvas.height).data;
    let avg = 0;
    for (let i = 0; i < frame.length; i += 4) {
      avg += frame[i] * 0.299 + frame[i + 1] * 0.587 + frame[i + 2] * 0.114;
    }
    avg /= Math.max(1, frame.length / 4);
    return {
      frame,
      avg
    };
  };
  const runCameraHandMotion = frame => {
    if (!frame) return;
    const width = fallbackCanvas.width;
    const height = fallbackCanvas.height;
    const motionState = cameraMotionRef.current;
    const now = Date.now();
    const luma = new Uint8Array(width * height);
    let motionSum = 0;
    let motionX = 0;
    let motionY = 0;
    for (let py = 0; py < height; py += 1) {
      for (let px = 0; px < width; px += 1) {
        const pixelIndex = py * width + px;
        const frameIndex = pixelIndex * 4;
        const nextLuma = Math.round(frame[frameIndex] * 0.299 + frame[frameIndex + 1] * 0.587 + frame[frameIndex + 2] * 0.114);
        luma[pixelIndex] = nextLuma;
        if (!motionState.prevLuma) continue;
        const diff = Math.abs(nextLuma - motionState.prevLuma[pixelIndex]);
        if (diff < 18) continue;
        const edgeBias = 1 + Math.abs(px / width - 0.5) * 0.35;
        const weight = (diff - 12) * edgeBias;
        motionSum += weight;
        motionX += px * weight;
        motionY += py * weight;
      }
    }
    motionState.prevLuma = luma;
    const normalizedMotion = clamp01(motionSum / 22000);
    if (motionSum < 1000) {
      if (motionState.active && now - motionState.lastSeenAt > 240) {
        motionState.active = false;
      }
      updateHandSignal(prev => ({
        ...prev,
        motion: normalizedMotion,
        last: normalizedMotion > 0.02 ? prev.last : 'ready'
      }));
      return;
    }
    const x = (motionX / motionSum / width - 0.5) * 2;
    const y = (motionY / motionSum / height - 0.5) * 2;
    motionState.lastSeenAt = now;
    if (!motionState.active) {
      motionState.active = true;
      motionState.startX = x;
      motionState.startY = y;
      motionState.startAt = now;
    }
    motionState.lastX = x;
    motionState.lastY = y;
    updateHandSignal({
      x,
      y,
      motion: normalizedMotion,
      last: 'tracking'
    });
    const dx = x - motionState.startX;
    const dy = y - motionState.startY;
    const elapsed = now - motionState.startAt;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    // Require clear axis dominance (1.8x) to avoid diagonal false positives
    const dominant = absX > absY * 1.8 ? 'h' : absY > absX * 1.8 ? 'v' : null;
    if (dominant && elapsed > 100 && elapsed < 1000 && (absX > 0.42 || absY > 0.42)) {
      const direction = dominant === 'h' ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'up' : 'down';
      runCameraHandAction(direction);
    } else if (elapsed >= 1000) {
      motionState.active = false;
    }
  };
  async function detectLoop() {
    if (cancelled) return;
    const video = faceVideoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      scheduleLoop();
      return;
    }
    try {
      let x = 0;
      let y = 0;
      let confidence = 0;
      let source = 'camera';
      let status = 'Camera face/hand tracking active';
      const {
        frame,
        avg
      } = sampleCameraFrame(video);
      runCameraHandMotion(frame);
      if (detector) {
        const faces = await detector.detect(video);
        if (cancelled) return;
        const face = faces?.[0];
        if (!face?.boundingBox) {
          updateFaceStatus('Looking for face; hand gestures active...');
          updateFaceSignal({
            x: 0,
            y: 0,
            confidence: 0,
            source: 'searching'
          }, 600);
          runFaceAction('center');
          return;
        }
        const box = face.boundingBox;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        x = (centerX / video.videoWidth - 0.5) * 2;
        y = (centerY / video.videoHeight - 0.5) * 2;
        confidence = clamp01(box.width * box.height / Math.max(1, video.videoWidth * video.videoHeight) * 7);
        source = 'face';
        status = 'Face and hand tracking active';
      } else if (fallbackCtx && frame) {
        let sum = 0;
        let sumX = 0;
        let sumY = 0;
        for (let py = 0; py < fallbackCanvas.height; py += 1) {
          for (let px = 0; px < fallbackCanvas.width; px += 1) {
            const i = (py * fallbackCanvas.width + px) * 4;
            const r = frame[i];
            const g = frame[i + 1];
            const b = frame[i + 2];
            const luma = r * 0.299 + g * 0.587 + b * 0.114;
            const skinBias = r > 55 && g > 35 && b > 20 && r > b * 1.08 && r > g * 0.82 ? 22 : 0;
            const centerBias = 1 - Math.abs(px / fallbackCanvas.width - 0.5) * 0.22;
            const weight = Math.max(0, luma - avg + skinBias) * centerBias;
            if (weight <= 0) continue;
            sum += weight;
            sumX += px * weight;
            sumY += py * weight;
          }
        }
        if (sum < 180) {
          updateFaceStatus('Looking for camera subject; hand gestures active...');
          updateFaceSignal({
            x: 0,
            y: 0,
            confidence: 0,
            source: 'searching'
          }, 600);
          runFaceAction('center');
          return;
        }
        x = (sumX / sum / fallbackCanvas.width - 0.5) * 2;
        y = (sumY / sum / fallbackCanvas.height - 0.5) * 2;
        confidence = clamp01(sum / 12000);
        status = 'Camera face/hand fallback active';
      }
      const {
        safeX,
        safeY
      } = setHeadPosition(x, y);
      updateFaceSignal({
        x: safeX,
        y: safeY,
        confidence,
        source
      });
      updateFaceStatus(status);
      const absX = Math.abs(safeX);
      const absY = Math.abs(safeY);
      let zone = 'center';
      // Tighter dead-band (0.42/0.46) + axis dominance for clean zone reads
      if (absX > 0.42 || absY > 0.46) {
        if (absX > absY * 1.3) zone = safeX < 0 ? 'left' : 'right';else if (absY > absX * 1.3) zone = safeY < 0 ? 'up' : 'down';
      }
      runFaceAction(zone);
    } catch (error) {
      console.warn('[Aether/FaceControl] detection failed', error);
      updateFaceStatus(`Face tracking failed: ${String(error?.message || error).slice(0, 46)}`);
    } finally {
      scheduleLoop();
    }
  }
  function scheduleLoop() {
    if (!cancelled) {
      faceLoopRef.current = window.setTimeout(detectLoop, 120);
    }
  }
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn('[Aether/Camera] getUserMedia not available on this context.');
        setFaceControlStatus('Camera API unavailable — check HTTPS or Electron permissions');
        return;
      }
      console.log('[Aether/Camera] Requesting camera permission...');
      updateFaceStatus('Requesting camera permission...');
      detector = hasFaceDetector ? new window.FaceDetector({
        fastMode: true,
        maxDetectedFaces: 1
      }) : null;
      console.log('[Aether/Camera] FaceDetector instance:', detector ? 'created' : 'null (fallback mode)');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: {
            ideal: 320
          },
          height: {
            ideal: 240
          },
          facingMode: 'user'
        },
        audio: false
      });
      console.log('[Aether/Camera] Stream acquired:', stream.id, 'Tracks:', stream.getTracks().map(t => `${t.kind}:${t.readyState}`));
      if (cancelled) {
        console.log('[Aether/Camera] Cancelled after stream acquired — stopping tracks.');
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      faceStreamRef.current = stream;
      const video = faceVideoRef.current;
      if (video) {
        video.srcObject = stream;
        console.log('[Aether/Camera] Assigned stream to video element. Calling play()...');
        await video.play().catch(playErr => {
          console.warn('[Aether/Camera] video.play() rejected:', playErr);
        });
        console.log('[Aether/Camera] video.play() resolved. readyState:', video.readyState, 'size:', video.videoWidth, 'x', video.videoHeight);
        updateFaceStatus('Camera connected — waiting for first video frame...');
      } else {
        console.warn('[Aether/Camera] faceVideoRef.current is null — video element not mounted yet.');
        updateFaceStatus('Camera connected but video element missing. Try reopening.');
      }
      showGestureNotice(detector ? 'Camera face + hand enabled' : 'Camera hand fallback enabled');
      gestureRuntimeRef.current.appendRecentEvent?.('camera_control', detector ? 'Camera face and hand controls enabled' : 'Camera fallback controls enabled', {
        tone: 'neutral'
      });
      detectLoop();
    } catch (error) {
      console.error('[Aether/Camera] startCamera failed:', error?.name, error?.message, error);
      const msg = error?.name === 'NotAllowedError' ? 'Camera blocked — permission denied. Allow camera access and retry.' : error?.name === 'NotFoundError' ? 'No camera found on this device.' : `Camera error: ${String(error?.message || error).slice(0, 60)}`;
      setFaceControlStatus(msg);
      setIsFaceControlEnabled(false);
    }
  };
  startCamera();
  return () => {
    cancelled = true;
    if (faceLoopRef.current) {
      window.clearTimeout(faceLoopRef.current);
      faceLoopRef.current = 0;
    }
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(track => track.stop());
      faceStreamRef.current = null;
    }
    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = null;
    }
  };
}, [isFaceControlEnabled, showGestureNotice]);
}
