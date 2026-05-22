import { useEffect } from 'react';

export function useDiscordQueueBridge(props) {
  const {
    handleControlRef, isStandalone, localAudioRef, setStreamPort, setVolume, showVolumeToastFor
  } = props;
  useEffect(() => {
  let cancelled = false;
  let unsubscribeLibraryUpdate = null;
  let unsubscribeControl = null;
  if (isStandalone && window.aether?.getStreamPort) {
    window.aether.getStreamPort().then(port => {
      if (cancelled) return;
      console.log('[Aether] Neural Streamer linked to port:', port);
      setStreamPort(port);
    });
  }

  // --- NEURAL WATCHER LISTENER (NOVA ---
  if (isStandalone && window.aether?.onLibraryUpdate) {
    unsubscribeLibraryUpdate = window.aether.onLibraryUpdate(event => {
      console.log("[Aether] Neural Sync detected change:", event);
      // Library refresh logic...
    });
    if (typeof unsubscribeLibraryUpdate !== 'function') {
      console.warn('[Aether/Perf] Standalone library watcher did not provide an unsubscribe; IPC listener may accumulate.');
    }
  }

  // --- UNIVERSAL CONTROL RECEIVER (NOVA ---
  if (isStandalone && window.aether?.onControl) {
    unsubscribeControl = window.aether.onControl(action => {
      console.log("[Aether/Hardware] Action Received:", action);
      if (action === 'volume-up') {
        setVolume(prev => {
          const nextV = Math.min(1, prev + 0.1);
          showVolumeToastFor(2000);
          if (localAudioRef.current) localAudioRef.current.volume = nextV;
          window.aether?.store?.set('volume', nextV);
          return nextV;
        });
      } else if (action === 'volume-down') {
        setVolume(prev => {
          const nextV = Math.max(0, prev - 0.1);
          if (localAudioRef.current) localAudioRef.current.volume = nextV;
          showVolumeToastFor(2000);
          window.aether?.store?.set('volume', nextV);
          return nextV;
        });
      } else if (action === 'mute') {
        setVolume(prev => {
          const nextV = prev > 0 ? 0 : 0.5;
          if (localAudioRef.current) localAudioRef.current.volume = nextV;
          return nextV;
        });
      } else {
        handleControlRef.current?.(action);
      }
    });
    if (typeof unsubscribeControl !== 'function') {
      console.warn('[Aether/Perf] Hardware control bridge did not provide an unsubscribe; IPC listener may accumulate.');
    }
  }
  return () => {
    cancelled = true;
    if (typeof unsubscribeLibraryUpdate === 'function') unsubscribeLibraryUpdate();
    if (typeof unsubscribeControl === 'function') unsubscribeControl();
  };
}, [isStandalone, showVolumeToastFor]);
}
