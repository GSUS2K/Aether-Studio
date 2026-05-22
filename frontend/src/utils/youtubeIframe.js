let youtubeIframeApiPromise = null;

export const loadYouTubeIframeApi = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('YouTube player unavailable outside browser'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') previousReady();
      resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('Failed to load YouTube iframe API'));
      document.head.appendChild(script);
    }

    setTimeout(() => {
      if (!window.YT?.Player) reject(new Error('Timed out loading YouTube iframe API'));
    }, 12000);
  });

  return youtubeIframeApiPromise;
};
