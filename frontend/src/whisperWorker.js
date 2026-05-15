import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

class WhisperWorker {
    static instance = null;

    static async getInstance() {
        if (this.instance === null) {
            this.instance = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
        }
        return this.instance;
    }
}

self.addEventListener('message', async (e) => {
    const { type, audio, id } = e.data;
    
    if (type === 'init') {
        self.postMessage({ status: 'loading', id });
        try {
            await WhisperWorker.getInstance();
            self.postMessage({ status: 'ready', id });
        } catch (err) {
            self.postMessage({ status: 'error', id, error: err.message });
        }
    } else if (type === 'transcribe') {
        try {
            const transcriber = await WhisperWorker.getInstance();
            // Whisper expects 16kHz float32 arrays
            const result = await transcriber(audio, {
                chunk_length_s: 30,
                stride_length_s: 5,
                language: 'english',
                task: 'transcribe',
            });
            self.postMessage({ status: 'complete', id, text: result.text });
        } catch (err) {
            self.postMessage({ status: 'error', id, error: err.message });
        }
    }
});
