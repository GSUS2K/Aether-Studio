import { useEffect } from 'react';

export function useGestureControlLoop(props) {
  const {
    Element, clamp01, gestureRuntimeRef, gestureStateRef, isGestureControlEnabled, localAudioRef, setVolume, showGestureNotice,
    showVolumeToastFor, touchGestureRef,
  } = props;

  useEffect(() => {
  if (!isGestureControlEnabled) {
    // Camera controls are independent — do NOT force-disable them here.
    document.documentElement.style.setProperty('--aether-head-x', '0');
    document.documentElement.style.setProperty('--aether-head-y', '0');
    return undefined;
  }
  const isInteractiveTarget = target => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('button, input, textarea, select, option, a, [role="button"], [contenteditable="true"], .no-drag'));
  };
  const applyHeadPosition = (x, y) => {
    document.documentElement.style.setProperty('--aether-head-x', String(clamp01((x + 1) / 2) * 2 - 1));
    document.documentElement.style.setProperty('--aether-head-y', String(clamp01((y + 1) / 2) * 2 - 1));
  };
  let headPositionRaf = 0;
  let pendingHeadPosition = null;
  const setHeadPosition = (x, y) => {
    pendingHeadPosition = {
      x,
      y
    };
    if (headPositionRaf) return;
    headPositionRaf = window.requestAnimationFrame(() => {
      headPositionRaf = 0;
      if (!pendingHeadPosition) return;
      const next = pendingHeadPosition;
      pendingHeadPosition = null;
      applyHeadPosition(next.x, next.y);
    });
  };
  const nudgeVolume = delta => {
    setVolume(prev => {
      const next = clamp01(prev + delta);
      if (localAudioRef.current) localAudioRef.current.volume = next;
      window.aether?.store?.set('volume', next);
      return next;
    });
    showVolumeToastFor(900);
  };

  // ── Mouse / single-pointer swipe ─────────────────────────────────
  const onPointerMove = event => {
    if (event.pointerType === 'touch') return; // handled by touch events
    const x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
    const y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
    setHeadPosition(x, y);
  };
  const onPointerDown = event => {
    if (event.pointerType === 'touch') return;
    if (isInteractiveTarget(event.target)) return;
    gestureStateRef.current.pointerDown = {
      x: event.clientX,
      y: event.clientY,
      at: Date.now()
    };
  };
  const onPointerUp = event => {
    if (event.pointerType === 'touch') return;
    const start = gestureStateRef.current.pointerDown;
    gestureStateRef.current.pointerDown = null;
    if (!start || isInteractiveTarget(event.target)) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const elapsed = Date.now() - start.at;
    const distance = Math.hypot(dx, dy);
    const now = Date.now();

    // Double-tap to toggle play/pause (< 250ms, didn't move much)
    if (distance < 20 && elapsed < 250) {
      if (now - gestureStateRef.current.lastTapAt < 380) {
        gestureStateRef.current.lastTapAt = 0;
        gestureRuntimeRef.current.handleControl?.('resume');
        showGestureNotice('Gesture: play / pause');
        gestureRuntimeRef.current.appendRecentEvent?.('gesture_tap', 'Double-tap', {
          tone: 'transport'
        });
        return;
      }
      gestureStateRef.current.lastTapAt = now;
      return;
    }

    // Directional swipe: must be fast (<700ms), long enough (>70px), cooldown
    if (elapsed > 700 || distance < 70 || now - gestureStateRef.current.lastActionAt < 700) return;
    gestureStateRef.current.lastActionAt = now;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    // Require clear dominance in one axis (ratio > 1.6)
    if (absX > absY * 1.6) {
      if (dx < 0) {
        gestureRuntimeRef.current.handleControl?.('skip');
        showGestureNotice('Swipe → next track');
        gestureRuntimeRef.current.appendRecentEvent?.('gesture_next', 'Swipe left', {
          tone: 'transport'
        });
      } else {
        gestureRuntimeRef.current.handleControl?.('previous');
        showGestureNotice('Swipe → previous track');
        gestureRuntimeRef.current.appendRecentEvent?.('gesture_previous', 'Swipe right', {
          tone: 'transport'
        });
      }
    } else if (absY > absX * 1.6) {
      const delta = dy < 0 ? 0.1 : -0.1;
      nudgeVolume(delta);
      showGestureNotice(dy < 0 ? 'Swipe → volume up' : 'Swipe → volume down');
      gestureRuntimeRef.current.appendRecentEvent?.('gesture_volume', dy < 0 ? 'Swipe up' : 'Swipe down', {
        tone: 'neutral'
      });
    }
  };

  // ── 2-finger touch gestures ───────────────────────────────────────
  const tg = touchGestureRef.current;
  const getTouchDist = t => {
    const ids = Object.keys(t.touches);
    if (ids.length < 2) return 0;
    const a = t.touches[ids[0]];
    const b = t.touches[ids[1]];
    return Math.hypot(b.x - a.x, b.y - a.y);
  };
  const getTouchMidpoint = t => {
    const ids = Object.keys(t.touches);
    if (ids.length < 2) return null;
    const a = t.touches[ids[0]];
    const b = t.touches[ids[1]];
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  };
  const onTouchStart = e => {
    Array.from(e.changedTouches).forEach(t => {
      tg.touches[t.identifier] = {
        x: t.clientX,
        y: t.clientY
      };
    });
    if (Object.keys(tg.touches).length === 2) {
      tg.pinchStartDist = getTouchDist(tg);
      tg.twoFingerStart = getTouchMidpoint(tg);
      tg.active = true;
      tg.pinchTriggered = false;
      tg.swipeTriggered = false;
      tg.startAt = Date.now();
      // Update stage depth with midpoint
      if (tg.twoFingerStart) {
        const x = (tg.twoFingerStart.x / Math.max(window.innerWidth, 1) - 0.5) * 2;
        const y = (tg.twoFingerStart.y / Math.max(window.innerHeight, 1) - 0.5) * 2;
        setHeadPosition(x, y);
      }
    }
  };
  const onTouchMove = e => {
    Array.from(e.changedTouches).forEach(t => {
      if (tg.touches[t.identifier]) tg.touches[t.identifier] = {
        x: t.clientX,
        y: t.clientY
      };
    });
    if (!tg.active || Object.keys(tg.touches).length < 2) return;
    // Update depth with midpoint
    const mid = getTouchMidpoint(tg);
    if (mid) {
      const x = (mid.x / Math.max(window.innerWidth, 1) - 0.5) * 2;
      const y = (mid.y / Math.max(window.innerHeight, 1) - 0.5) * 2;
      setHeadPosition(x, y);
    }

    // Pinch detection (≥ 15% dist change from start)
    if (!tg.pinchTriggered && !tg.swipeTriggered && tg.pinchStartDist > 40) {
      const curDist = getTouchDist(tg);
      const ratio = curDist / tg.pinchStartDist;
      const now = Date.now();
      if ((ratio < 0.78 || ratio > 1.28) && now - gestureStateRef.current.lastActionAt > 900) {
        gestureStateRef.current.lastActionAt = now;
        tg.pinchTriggered = true;
        if (ratio < 0.78) {
          // Pinch in → pause
          gestureRuntimeRef.current.handleControl?.('pause');
          showGestureNotice('Pinch → pause');
          gestureRuntimeRef.current.appendRecentEvent?.('gesture_pinch_pause', 'Pinch in', {
            tone: 'transport'
          });
        } else {
          // Spread → play
          gestureRuntimeRef.current.handleControl?.('resume');
          showGestureNotice('Spread → play');
          gestureRuntimeRef.current.appendRecentEvent?.('gesture_spread_play', 'Spread out', {
            tone: 'transport'
          });
        }
      }
    }
  };
  const onTouchEnd = e => {
    if (tg.active && Object.keys(tg.touches).length === 2 && !tg.pinchTriggered && !tg.swipeTriggered) {
      // Check for 2-finger swipe
      const mid = getTouchMidpoint(tg);
      const start = tg.twoFingerStart;
      const now = Date.now();
      const elapsed = now - (tg.startAt || now);
      if (mid && start && elapsed < 600 && elapsed > 60) {
        const dx = mid.x - start.x;
        const dy = mid.y - start.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 55 && now - gestureStateRef.current.lastActionAt > 700) {
          gestureStateRef.current.lastActionAt = now;
          tg.swipeTriggered = true;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);
          if (absX > absY * 1.4) {
            if (dx < 0) {
              gestureRuntimeRef.current.handleControl?.('skip');
              showGestureNotice('✌️ 2-finger → next track');
              gestureRuntimeRef.current.appendRecentEvent?.('gesture2_next', '2-finger swipe left', {
                tone: 'transport'
              });
            } else {
              gestureRuntimeRef.current.handleControl?.('previous');
              showGestureNotice('✌️ 2-finger → previous track');
              gestureRuntimeRef.current.appendRecentEvent?.('gesture2_prev', '2-finger swipe right', {
                tone: 'transport'
              });
            }
          } else if (absY > absX * 1.4) {
            const delta = dy < 0 ? 0.12 : -0.12;
            nudgeVolume(delta);
            showGestureNotice(dy < 0 ? '✌️ 2-finger → vol up' : '✌️ 2-finger → vol down');
            gestureRuntimeRef.current.appendRecentEvent?.('gesture2_vol', dy < 0 ? '2-finger swipe up' : '2-finger swipe down', {
              tone: 'neutral'
            });
          }
        }
      }
    }
    Array.from(e.changedTouches).forEach(t => {
      delete tg.touches[t.identifier];
    });
    if (Object.keys(tg.touches).length < 2) {
      tg.active = false;
      tg.pinchStartDist = 0;
      tg.twoFingerStart = null;
    }
  };
  const onDeviceOrientation = event => {
    if (!Number.isFinite(event.gamma) && !Number.isFinite(event.beta)) return;
    const x = clamp01(((Number(event.gamma) || 0) + 28) / 56) * 2 - 1;
    const y = clamp01(((Number(event.beta) || 0) + 18) / 36) * 2 - 1;
    setHeadPosition(x, y);
  };
  window.addEventListener('pointermove', onPointerMove, {
    passive: true
  });
  window.addEventListener('pointerdown', onPointerDown, {
    passive: true
  });
  window.addEventListener('pointerup', onPointerUp, {
    passive: true
  });
  window.addEventListener('touchstart', onTouchStart, {
    passive: true
  });
  window.addEventListener('touchmove', onTouchMove, {
    passive: true
  });
  window.addEventListener('touchend', onTouchEnd, {
    passive: true
  });
  window.addEventListener('touchcancel', onTouchEnd, {
    passive: true
  });
  window.addEventListener('deviceorientation', onDeviceOrientation, {
    passive: true
  });
  showGestureNotice('Gesture lab enabled');
  gestureRuntimeRef.current.appendRecentEvent?.('gesture_lab', 'Swipe, pinch & 2-finger controls enabled', {
    tone: 'neutral'
  });
  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
    window.removeEventListener('deviceorientation', onDeviceOrientation);
    if (headPositionRaf) window.cancelAnimationFrame(headPositionRaf);
  };
}, [isGestureControlEnabled, showGestureNotice, showVolumeToastFor]);
}
