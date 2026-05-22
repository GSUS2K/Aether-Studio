import { useEffect } from 'react';

export function useAudioVisualizerLoop(props) {
  const {
    AURA_PRESETS, AURA_PRESETS_MAP, Float32Array, Uint8Array, alphaHex, analyserRef, animationFrameRef, audioCtxRef,
    auraEnergyRef, beatRingsRef, clamp01, currentTimeRef, currentTrack, currentTrackRef, getComputedStyle, isPlayingRef,
    isStandalone, lastBeatRingTimeRef, lastVaultStateUpdateRef, lerp, localAudioRef, mixtapeVaultRef, performanceMode, playbackResetNonce,
    pulseCanvasRef, setVaultPulse, setVaultSpectrum, sourceRef, uiInteractionCooldownUntilRef, uiPulseRef, vaultPulseRef,
    vaultTelemetryRef, visualizerBarsRef, visualizerCanvasRef, visualizerErrorCountRef, visualizerFrameBudgetRef, visualizerStateRef,
  } = props;

  // Audio Visualizer Loop (NOVA
useEffect(() => {
  if (!isStandalone || !localAudioRef.current) return;
  if (performanceMode === 'low') {
    if (visualizerCanvasRef.current) {
      const canvas = visualizerCanvasRef.current;
      canvas.getContext('2d', {
        alpha: true
      })?.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    }
    if (pulseCanvasRef.current) {
      const canvas = pulseCanvasRef.current;
      canvas.getContext('2d', {
        alpha: true
      })?.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    }
    if (document.documentElement) {
      document.documentElement.style.setProperty('--aura-beat-pulse', '0');
      document.documentElement.style.setProperty('--aura-edge-glow', '0');
      document.documentElement.style.setProperty('--aura-kick-shift', '0deg');
      document.documentElement.style.setProperty('--aura-kick-glow', '0');
    }
    return undefined;
  }
  let cancelled = false;
  let startTimer = null;
  const setupAudioAnalysis = () => {
    if (cancelled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (!analyserRef.current) {
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 1024;
        analyserRef.current.smoothingTimeConstant = 0.7;
      }
      if (!sourceRef.current && localAudioRef.current) {
        sourceRef.current = audioCtxRef.current.createMediaElementSource(localAudioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (e) {
      console.error("[Aether] Audio API Error:", e.message);
    }
  };
  const runVisualizer = () => {
    if (cancelled) return;
    if (!analyserRef.current || !auraEnergyRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      try {
        if (cancelled) return;
        const frameNow = performance.now();
        const frameBudget = visualizerFrameBudgetRef.current;
        if (typeof document !== 'undefined' && document.hidden) {
          frameBudget.lastDrawAt = frameNow;
          return;
        }
        const visualizerState = visualizerStateRef.current;
        const liveVisualizerMode = visualizerState.visualizerMode;
        const liveThemeColor = visualizerState.themeColor;
        const liveAuraPreset = visualizerState.auraPreset;
        const isVaultOpen = visualizerState.isMixtapeVaultOpen;
        const needsPulseTelemetry = isVaultOpen || visualizerState.isAuraStageOpen || visualizerState.isSharedSceneOpen;
        const livePerformanceMode = visualizerState.performanceMode || 'high';
        const isHeavyOverlayOpen = Boolean(visualizerState.isHeavyOverlayOpen);
        const inUiInteractionCooldown = frameNow < (uiInteractionCooldownUntilRef.current || 0);
        const isPlaybackActive = Boolean(isPlayingRef.current && localAudioRef.current && !localAudioRef.current.paused);
        const minFrameGap = !isPlaybackActive ? 1000 : isHeavyOverlayOpen ? needsPulseTelemetry ? 140 : 220 : inUiInteractionCooldown ? 120 : livePerformanceMode === 'medium' ? 66 : 0;
        if (minFrameGap > 0 && frameNow - frameBudget.lastDrawAt < minFrameGap) return;
        frameBudget.lastDrawAt = frameNow;
        const shouldDrawVisualizerCanvas = !isHeavyOverlayOpen && !inUiInteractionCooldown;
        const auraModeActive = liveVisualizerMode === 'pulse' && shouldDrawVisualizerCanvas;
        const canvas = shouldDrawVisualizerCanvas && liveVisualizerMode === 'bars' ? visualizerCanvasRef.current : null;
        const pulseCanvas = shouldDrawVisualizerCanvas && liveVisualizerMode === 'pulse' ? pulseCanvasRef.current : null;
        if (!canvas && !pulseCanvas && !needsPulseTelemetry) return;
        if (canvas && frameBudget.canvas !== canvas) {
          frameBudget.canvas = canvas;
          frameBudget.ctx = canvas.getContext('2d', {
            alpha: true
          });
        } else if (!canvas) {
          frameBudget.canvas = null;
          frameBudget.ctx = null;
        }
        if (pulseCanvas && frameBudget.pulseCanvas !== pulseCanvas) {
          frameBudget.pulseCanvas = pulseCanvas;
          frameBudget.pulseCtx = pulseCanvas.getContext('2d', {
            alpha: true
          });
        } else if (!pulseCanvas) {
          frameBudget.pulseCanvas = null;
          frameBudget.pulseCtx = null;
        }
        const ctx = frameBudget.ctx;
        const pCtx = frameBudget.pulseCtx;
        if (document.documentElement && frameNow - frameBudget.lastStyleAt > 500) {
          const rootStyle = getComputedStyle(document.documentElement);
          frameBudget.brandAccent = rootStyle.getPropertyValue('--brand-accent')?.trim() || liveThemeColor || '#00ffbf';
          frameBudget.brandContrast = rootStyle.getPropertyValue('--brand-contrast')?.trim() || '#ff00ff';
          frameBudget.lastStyleAt = frameNow;
        }
        const width = canvas?.width || 800;
        const height = canvas?.height || 40;
        const pWidth = pulseCanvas?.width || 800;
        const pHeight = pulseCanvas?.height || 400;
        if (liveVisualizerMode === 'bars' && ctx) ctx.clearRect(0, 0, width, height);
        if (liveVisualizerMode === 'pulse' && pCtx) pCtx.clearRect(0, 0, pWidth, pHeight);
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const bassRaw = (dataArray[1] + dataArray[2] + dataArray[3]) / (3 * 255);
        let midsRawSum = 0;
        for (let i = 8; i < 28; i++) midsRawSum += dataArray[i];
        const midsRaw = midsRawSum / (20 * 255);
        let highsRawSum = 0;
        for (let i = 30; i < 70; i++) highsRawSum += dataArray[i];
        const highsRaw = highsRawSum / (40 * 255);
        if (!auraEnergyRef.current) return;
        auraEnergyRef.current.bass = lerp(auraEnergyRef.current.bass, bassRaw, 0.22);
        auraEnergyRef.current.mids = lerp(auraEnergyRef.current.mids, midsRaw, 0.18);
        auraEnergyRef.current.highs = lerp(auraEnergyRef.current.highs, highsRaw, 0.14);
        auraEnergyRef.current.phase += 0.01 + auraEnergyRef.current.highs * 0.05;
        const bass = auraEnergyRef.current.bass;
        const mids = auraEnergyRef.current.mids;
        const highs = auraEnergyRef.current.highs;
        const drift = Math.sin(auraEnergyRef.current.phase) * 0.03;
        const auraScale = 0.92 + bass * 0.45 + drift;
        const spinDeg = auraEnergyRef.current.phase * 180 / Math.PI;
        const energy = clamp01(bass * 0.46 + mids * 0.34 + highs * 0.20);
        uiPulseRef.current = auraModeActive ? auraScale : 1;
        if (mixtapeVaultRef.current && frameNow - frameBudget.lastMixtapeCssAt > (livePerformanceMode === 'high' ? 33 : 80)) {
          mixtapeVaultRef.current.style.setProperty('--vault-bass', String(bass));
          mixtapeVaultRef.current.style.setProperty('--vault-mids', String(mids));
          mixtapeVaultRef.current.style.setProperty('--vault-highs', String(highs));
          mixtapeVaultRef.current.style.setProperty('--vault-energy', String(energy));
          mixtapeVaultRef.current.style.setProperty('--vault-scale', String(auraScale));
          mixtapeVaultRef.current.style.setProperty('--vault-spin', `${spinDeg}deg`);
          mixtapeVaultRef.current.style.setProperty('--vault-glow', String(clamp01(0.18 + bass * 0.42 + highs * 0.22)));
          frameBudget.lastMixtapeCssAt = frameNow;
        }

        // AURA MODE: Propagate beat energy to transport & lyric underline
        if (auraModeActive && document.documentElement) {
          const selectedAuraPreset = AURA_PRESETS_MAP[liveAuraPreset] || AURA_PRESETS[1];
          const kickTransient = clamp01(Math.max(0, (bassRaw - bass) * 3.8) + Math.max(0, (bass - 0.66) * 1.9));
          const auraShiftDeg = (kickTransient * 13.5 + energy * 1.8) * selectedAuraPreset.hueShift;
          document.documentElement.style.setProperty('--aura-beat-pulse', String(bass * 0.8 + energy * 0.3));
          document.documentElement.style.setProperty('--aura-edge-glow', String(bass * 0.6 + mids * 0.4));
          document.documentElement.style.setProperty('--aura-kick-shift', `${auraShiftDeg.toFixed(2)}deg`);
          document.documentElement.style.setProperty('--aura-kick-glow', String(clamp01((0.22 + kickTransient * 0.78) * selectedAuraPreset.kickGlow)));

          // AURA MODE: Trigger beat rings on kick peaks (bass spikes)
          if (lastBeatRingTimeRef.current !== undefined && bass > selectedAuraPreset.ringThreshold && performance.now() - lastBeatRingTimeRef.current > selectedAuraPreset.ringCooldownMs) {
            lastBeatRingTimeRef.current = performance.now();
            if (beatRingsRef.current) {
              const ringScale = selectedAuraPreset.ringScale;
              const ringDuration = selectedAuraPreset.ringDurationMs;
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svg.setAttribute('viewBox', '0 0 100 100');
              svg.setAttribute('width', '100');
              svg.setAttribute('height', '100');
              svg.setAttribute('class', 'beat-ring');
              svg.style.position = 'absolute';
              svg.style.pointerEvents = 'none';
              svg.style.top = '50%';
              svg.style.left = '50%';
              svg.style.transform = 'translate(-50%, -50%)';
              svg.style.opacity = '0.55';
              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', '50');
              circle.setAttribute('cy', '50');
              circle.setAttribute('r', String(14 * ringScale));
              circle.style.strokeWidth = '1.1';
              svg.appendChild(circle);
              beatRingsRef.current.appendChild(svg);

              // Animate the circle
              let startTime = performance.now();
              const animateBeat = now => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / ringDuration, 1);
                const r = 14 * ringScale + progress * (22 * ringScale);
                const opacity = 0.55 * (1 - progress);
                circle.setAttribute('r', String(r));
                circle.style.opacity = String(opacity);
                if (progress < 1) {
                  requestAnimationFrame(animateBeat);
                } else {
                  svg.remove();
                }
              };
              requestAnimationFrame(animateBeat);
            }
          }
        } else if (document.documentElement) {
          document.documentElement.style.setProperty('--aura-kick-shift', '0deg');
          document.documentElement.style.setProperty('--aura-kick-glow', '0');
        }
        const now = performance.now();
        if (needsPulseTelemetry && now - vaultTelemetryRef.current.lastStateAt > 120) {
          vaultTelemetryRef.current.lastStateAt = now;
          const liveTrack = currentTrackRef.current;
          const liveTime = currentTimeRef.current;
          const sampledBars = Array.from({
            length: 48
          }, (_, i) => {
            // Less aggressive curve so high frequencies aren't squashed together as much
            const normStart = Math.pow(i / 48, 1.15);
            const normEnd = Math.pow((i + 1) / 48, 1.15);
            // Max bin reduced to 35% to avoid empty bars even on low-fidelity audio that rolls off early
            const maxBin = Math.floor(bufferLength * 0.35);
            let start = Math.floor(normStart * maxBin);
            let end = Math.floor(normEnd * maxBin);
            if (end <= start) end = start + 1;
            let total = 0;
            let count = 0;
            let peak = 0;
            for (let b = start; b < end; b++) {
              const val = dataArray[b] || 0;
              total += val;
              if (val > peak) peak = val;
              count += 1;
            }
            // Mix average and peak to give dynamic "highs and lows" rather than a flat average block
            const value = total / Math.max(count, 1) * 0.4 + peak * 0.6;
            return clamp01(value / 255);
          });
          const pulseData = {
            bass,
            mids,
            highs,
            energy,
            spin: spinDeg,
            stamp: ['AETHER-PULSE', liveTrack?.title || 'Aether Secret Session', `t=${Math.floor((liveTime || 0) / 1000)}s`, `b=${Math.round(bass * 100)}`, `m=${Math.round(mids * 100)}`, `h=${Math.round(highs * 100)}`].join(' · ')
          };
          vaultPulseRef.current = pulseData;

          // High-frequency CSS variable updates for smooth Aura effects without React re-renders
          if (auraModeActive || isVaultOpen || visualizerState.isAuraStageOpen || visualizerState.isSharedSceneOpen) {
            const root = document.documentElement;
            root.style.setProperty('--vault-bass', String(bass));
            root.style.setProperty('--vault-mids', String(mids));
            root.style.setProperty('--vault-highs', String(highs));
            root.style.setProperty('--vault-energy', String(energy));
            root.style.setProperty('--vault-scale', String(1 + energy * 0.1));
            root.style.setProperty('--vault-spin', `${spinDeg}deg`);
          }

          // Throttle React state updates; CSS variables carry the smoother beat response.
          const stateNow = Date.now();
          const vaultUiGap = livePerformanceMode === 'high' ? 260 : 520;
          if (stateNow - lastVaultStateUpdateRef.current > vaultUiGap) {
            setVaultPulse(pulseData);
            setVaultSpectrum(prev => sampledBars.map((v, idx) => lerp(prev[idx] ?? 0, v, 0.45)));
            lastVaultStateUpdateRef.current = stateNow;

            // DEV LOGGING
            if (window.AETHER_DEV_PROFILE) {
              const root = document.documentElement;
              const cssEnergy = root.style.getPropertyValue('--vault-energy');
              console.log(`[Pulse Debug] liveBeatIntensity: ${clamp01(pulseData.energy * 0.9 + pulseData.bass * 0.45 + pulseData.highs * 0.12).toFixed(3)} | vaultEnergy: ${pulseData.energy?.toFixed(3)} | CSS--vault-energy: ${cssEnergy}`);
            }
          }
        }
        if (liveVisualizerMode === 'bars' && ctx) {
          const barWidth = width / bufferLength * 2.5;
          let x = 0;
          ctx.fillStyle = frameBudget.brandContrast || '#ff00ff';
          if (!visualizerBarsRef.current || visualizerBarsRef.current.length !== bufferLength) {
            visualizerBarsRef.current = new Float32Array(bufferLength);
          }
          const smoothedBars = visualizerBarsRef.current;
          for (let i = 0; i < bufferLength; i++) {
            const targetHeight = dataArray[i] / 255 * height;
            smoothedBars[i] = lerp(smoothedBars[i] || 0, targetHeight, targetHeight > smoothedBars[i] ? 0.42 : 0.24);
            const barHeight = smoothedBars[i];
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 2;
          }
        } else if (liveVisualizerMode === 'pulse' && pCtx) {
          const accent = frameBudget.brandAccent || liveThemeColor || '#00ffbf';
          const contrast = frameBudget.brandContrast || '#ff00ff';
          const centerX = pWidth / 2;
          const centerY = pHeight / 2;
          const baseRadius = Math.min(pWidth, pHeight) * 0.26;

          // Layer 1: soft ambient bloom
          const outer = pCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 2.8 * auraScale);
          outer.addColorStop(0, `${accent}${alphaHex(0.22 + bass * 0.20)}`);
          outer.addColorStop(0.45, `${contrast}${alphaHex(0.10 + mids * 0.14)}`);
          outer.addColorStop(1, 'transparent');
          pCtx.fillStyle = outer;
          pCtx.beginPath();
          pCtx.arc(centerX, centerY, baseRadius * 2.7 * auraScale, 0, Math.PI * 2);
          pCtx.fill();

          // Layer 2: liquid rings
          pCtx.lineCap = 'round';
          for (let ring = 0; ring < 3; ring++) {
            const ringAlpha = 0.55 - ring * 0.15;
            const ringBoost = 1 - ring * 0.2;
            pCtx.beginPath();
            pCtx.strokeStyle = `${ring % 2 === 0 ? accent : contrast}${alphaHex(ringAlpha)}`;
            pCtx.lineWidth = 3 - ring * 0.7;
            pCtx.shadowBlur = 24 + bass * 32;
            pCtx.shadowColor = ring % 2 === 0 ? accent : contrast;
            for (let i = 0; i <= 140; i++) {
              const t = i / 140;
              const angle = t * Math.PI * 2;
              const bin = Math.floor((t * (bufferLength - 1) + ring * 13) % (bufferLength - 1));
              const val = (dataArray[bin] || 0) / 255;
              const ripple = Math.sin(angle * 3 + auraEnergyRef.current.phase * 2) * highs * 9;
              const radius = baseRadius + val * (54 * ringBoost) + ripple;
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              if (i === 0) pCtx.moveTo(x, y);else pCtx.lineTo(x, y);
            }
            pCtx.closePath();
            pCtx.stroke();
          }

          // Layer 3: perimeter ticks
          pCtx.shadowBlur = 0;
          pCtx.lineWidth = 1.6;
          for (let i = 0; i < 56; i += 2) {
            const angle = i / 56 * Math.PI * 2;
            const val = (dataArray[i * 2 % bufferLength] || 0) / 255;
            const len = 5 + val * (14 + highs * 10);
            const radius = baseRadius - 12;
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius - len);
            const y2 = centerY + Math.sin(angle) * (radius - len);
            pCtx.strokeStyle = `${accent}${alphaHex(0.35 + val * 0.45)}`;
            pCtx.beginPath();
            pCtx.moveTo(x1, y1);
            pCtx.lineTo(x2, y2);
            pCtx.stroke();
          }
        }
        visualizerErrorCountRef.current = 0;
      } catch (e) {
        visualizerErrorCountRef.current += 1;
        const shouldLog = visualizerErrorCountRef.current <= 3 || visualizerErrorCountRef.current % 60 === 0;
        if (shouldLog) {
          console.error('[Aether/Visualizer] Frame error (likely post-restart):', e?.message || String(e));
        }
      } finally {
        if (!cancelled) {
          animationFrameRef.current = requestAnimationFrame(draw);
        }
      }
    };
    animationFrameRef.current = requestAnimationFrame(draw);
  };
  startTimer = window.setTimeout(() => {
    if (cancelled) return;
    setupAudioAnalysis();
    runVisualizer();
  }, 50);
  return () => {
    cancelled = true;
    if (startTimer) window.clearTimeout(startTimer);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    visualizerErrorCountRef.current = 0;
  };
}, [isStandalone, currentTrack?.id, currentTrack?.queueNonce, playbackResetNonce, performanceMode]);
}
