import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Lock, Upload } from 'lucide-react';

const COOKIE_HELP_URL = 'https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies';

export const YouTubeAuthOverlay = memo(function YouTubeAuthOverlay({
  prompt,
  isStandalone,
  onDismiss,
  onImportCookies,
}) {
  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-brand-dark/95 backdrop-blur-[30px]"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-lg glass-card bg-brand-dark/80 border-brand-accent/40 rounded-3xl flex flex-col items-center justify-center overflow-hidden relative z-10 px-8 py-10 text-center"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50" />

            <div className="w-16 h-16 rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,255,191,0.2)]">
              <Lock size={28} className="text-brand-accent" />
            </div>

            <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Authentication Required</h2>
            <p className="text-brand-text-dim text-sm mb-8 leading-relaxed max-w-sm">
              {prompt?.hasCookies
                ? 'The saved cookies.txt did not unlock this YouTube request. Upload a fresh Netscape cookies.txt export from the signed-in browser account.'
                : 'YouTube is blocking this request. Upload a valid Netscape cookies.txt export from your signed-in browser account to unblock playback and downloads.'}
            </p>
            {prompt?.cookieAudit?.summary && (
              <div className="mb-5 w-full rounded-2xl border border-yellow-300/20 bg-yellow-300/8 px-4 py-3 text-left">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-200/70">Current cookies file</div>
                <div className="mt-1 text-xs font-bold leading-5 text-white/62">{prompt.cookieAudit.summary}</div>
                {prompt.cookieAudit.note && <div className="mt-1 text-[11px] leading-5 text-white/38">{prompt.cookieAudit.note}</div>}
              </div>
            )}

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={onImportCookies}
                className="w-full py-4 rounded-xl bg-brand-accent text-brand-dark font-black tracking-[0.2em] uppercase hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Upload size={18} /> Upload cookies.txt
              </button>
              <button
                onClick={() => {
                  if (isStandalone && window.aether?.openExternal) {
                    window.aether.openExternal(COOKIE_HELP_URL);
                  } else {
                    window.open(COOKIE_HELP_URL, '_blank');
                  }
                }}
                className="w-full py-2 rounded-xl bg-transparent text-brand-accent/70 font-bold tracking-[0.1em] uppercase hover:text-brand-accent transition-all text-[11px] mb-2"
              >
                How to export cookies?
              </button>
              <button
                onClick={onDismiss}
                className="w-full py-3 rounded-xl bg-transparent border border-white/10 text-white/50 font-bold tracking-[0.2em] uppercase hover:bg-white/5 hover:text-white transition-all text-sm"
              >
                Dismiss Overlay
              </button>
            </div>

            <div className="mt-8 text-[10px] text-white/30 uppercase tracking-widest flex items-center justify-center gap-2">
              <AlertTriangle size={12} className="text-yellow-500/50" /> Downloads are paused until authentication
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
