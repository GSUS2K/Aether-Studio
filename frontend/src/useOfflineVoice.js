import { useState, useEffect, useRef, useCallback } from 'react';

export function useOfflineVoice({ onCommand, showToast }) {
    const [enabled, setEnabled] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, loading, listening, processing, error
    const [transcript, setTranscript] = useState('');
    
    const workerRef = useRef(null);
    const audioContextRef = useRef(null);
    const streamRef = useRef(null);
    const workletNodeRef = useRef(null);
    const sourceRef = useRef(null);
    const workletModuleUrlRef = useRef(null);
    
    const audioBufferRef = useRef([]);
    const isSpeakingRef = useRef(false);
    const silenceStartRef = useRef(0);
    const enabledRef = useRef(enabled);
    const statusRef = useRef(status);
    const onCommandRef = useRef(onCommand);
    const showToastRef = useRef(showToast);
    
    // Config
    const SILENCE_THRESHOLD = 0.01; 
    const MAX_SILENCE_MS = 1500; // 1.5s of silence triggers transcription

    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    const getAudioWorkletModuleUrl = useCallback(() => {
        if (!workletModuleUrlRef.current) {
            const moduleSource = `
class VoiceCaptureProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const input = inputs[0] && inputs[0][0];
        if (input && input.length) {
            this.port.postMessage({ type: 'audio', audio: input.slice() });
        }
        return true;
    }
}

registerProcessor('voice-capture-processor', VoiceCaptureProcessor);
`;
            workletModuleUrlRef.current = URL.createObjectURL(new Blob([moduleSource], { type: 'text/javascript' }));
        }

        return workletModuleUrlRef.current;
    }, []);

    const releaseAudioWorkletModuleUrl = useCallback(() => {
        if (workletModuleUrlRef.current) {
            URL.revokeObjectURL(workletModuleUrlRef.current);
            workletModuleUrlRef.current = null;
        }
    }, []);
    
    const stopAudio = useCallback(() => {
        if (workletNodeRef.current) {
            workletNodeRef.current.port.onmessage = null;
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        releaseAudioWorkletModuleUrl();
    }, []);

    useEffect(() => {
        // Init worker
        if (!workerRef.current) {
            workerRef.current = new Worker(new URL('./whisperWorker.js', import.meta.url), { type: 'module' });
            workerRef.current.onmessage = (e) => {
                const { status: wStatus, text, error } = e.data;
                console.log('[Aether/Voice] Worker message', { wStatus, hasText: Boolean(text), hasError: Boolean(error) });
                if (wStatus === 'loading') setStatus('loading');
                if (wStatus === 'ready') setStatus(enabledRef.current ? 'listening' : 'idle');
                if (wStatus === 'error') {
                    setStatus('error');
                    showToastRef.current(`Voice Error: ${error}`, 'error');
                }
                if (wStatus === 'complete') {
                    if (text && text.trim().length > 2) {
                        setTranscript(text.trim());
                        onCommandRef.current(text.trim());
                    }
                    setStatus(enabledRef.current ? 'listening' : 'idle');
                }
            };
            workerRef.current.onerror = (errorEvent) => {
                const message = errorEvent?.message || 'Voice worker failed to start';
                console.error('[Aether/Voice] Worker error', errorEvent);
                setStatus('error');
                showToastRef.current(`Voice Error: ${message}`, 'error');
            };
            // Pre-load model
            console.log('[Aether/Voice] Initializing worker');
            workerRef.current.postMessage({ type: 'init' });
        }
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []); // eslint-disable-line

    useEffect(() => {
        if (!enabled) {
            stopAudio();
            if (status !== 'error') setStatus('idle');
            return;
        }
        
        let cancelled = false;
        
        async function startListening() {
            try {
                setStatus('loading');
                
                console.log('[Aether/Voice] Requesting microphone access');
                const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
                if (cancelled) return;
                
                streamRef.current = stream;
                // Whisper expects 16kHz
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                const audioCtx = audioContextRef.current;
                
                sourceRef.current = audioCtx.createMediaStreamSource(stream);
                await audioCtx.audioWorklet.addModule(getAudioWorkletModuleUrl());
                const workletNode = new AudioWorkletNode(audioCtx, 'voice-capture-processor', {
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    outputChannelCount: [1],
                });
                workletNodeRef.current = workletNode;

                workletNode.port.onmessage = (event) => {
                    const { type, audio } = event.data || {};
                    if (type !== 'audio' || statusRef.current === 'processing') return;

                    const input = audio;
                    let sum = 0;
                    for (let i = 0; i < input.length; i += 1) sum += input[i] * input[i];
                    const rms = Math.sqrt(sum / input.length);

                    if (rms > SILENCE_THRESHOLD) {
                        isSpeakingRef.current = true;
                        silenceStartRef.current = 0;
                    } else if (isSpeakingRef.current) {
                        if (silenceStartRef.current === 0) {
                            silenceStartRef.current = Date.now();
                        } else if (Date.now() - silenceStartRef.current > MAX_SILENCE_MS) {
                            isSpeakingRef.current = false;
                            silenceStartRef.current = 0;

                            if (audioBufferRef.current.length > 16000 * 0.5) {
                                setStatus('processing');
                                const float32Data = new Float32Array(audioBufferRef.current);
                                console.log('[Aether/Voice] Sending audio for transcription', { samples: float32Data.length });
                                workerRef.current.postMessage({ type: 'transcribe', audio: float32Data });
                            }
                            audioBufferRef.current = [];
                        }
                    }

                    if (isSpeakingRef.current || silenceStartRef.current > 0) {
                        for (let i = 0; i < input.length; i += 1) {
                            audioBufferRef.current.push(input[i]);
                        }
                        if (audioBufferRef.current.length > 16000 * 15) {
                            audioBufferRef.current = audioBufferRef.current.slice(-16000 * 15);
                        }
                    }
                };

                sourceRef.current.connect(workletNode);
                workletNode.connect(audioCtx.destination);
                await audioCtx.resume();
                console.log('[Aether/Voice] Listening active');
                if (statusRef.current !== 'processing') {
                    setStatus('listening');
                }
                
            } catch (err) {
                console.error(err);
                if (!cancelled) {
                    setStatus('error');
                    showToastRef.current('Microphone access denied', 'error');
                    setEnabled(false);
                }
            }
        }
        
        startListening();
        
        return () => {
            cancelled = true;
            stopAudio();
            audioBufferRef.current = [];
            isSpeakingRef.current = false;
            silenceStartRef.current = 0;
        };
    }, [enabled]); // eslint-disable-line

    return {
        enabled,
        setEnabled,
        status,
        setStatus,
        transcript,
        setTranscript
    };
}
