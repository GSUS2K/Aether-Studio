import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ListMusic, Loader2, Plus, Shuffle, Trash2, X } from 'lucide-react';

export const FullQueueOverlay = memo(function FullQueueOverlay({
  open,
  queue,
  downloadedTracks,
  draggedQueueIndex,
  isContentReady,
  getProxyUrl,
  resolveWarmupTrackId,
  requestDestructiveConfirmation,
  reorderQueueByDrag,
  setDraggedQueueIndex,
  setIsViewingFullQueue,
  setQueue,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-[20px]" onClick={() => setIsViewingFullQueue(false)} />
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-2xl max-h-[80vh] glass-card bg-brand-dark/60 border-brand-accent/20 rounded-3xl flex flex-col overflow-hidden relative z-10"
          >
            <div className="flex items-center justify-between p-6 border-b border-brand-accent/10">
              <div className="flex items-center gap-3">
                <ListMusic size={20} className="text-brand-accent" />
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter text-white">Queue Buffer</h2>
                  <p className="text-brand-accent text-xs font-bold tracking-widest uppercase opacity-60">{queue.length} TRACK{queue.length !== 1 ? 'S' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => setIsViewingFullQueue(false)}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <div className="flex flex-col gap-2">
                {!isContentReady ? (
                  <div className="h-40 flex flex-col items-center justify-center gap-3 text-center opacity-40">
                    <Loader2 size={26} className="animate-spin text-brand-accent/60" />
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">Preparing Queue</div>
                  </div>
                ) : queue.map((track, idx) => {
                  const warmupId = resolveWarmupTrackId(track);
                  const isDownloaded = warmupId ? downloadedTracks.includes(warmupId) : downloadedTracks.includes(track.id);
                  return (
                    <motion.div
                      key={`${track.id}-${idx}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggedQueueIndex(idx);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(idx));
                      }}
                      onDragEnd={() => setDraggedQueueIndex(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const droppedIndex = Number(e.dataTransfer.getData('text/plain'));
                        reorderQueueByDrag(idx, Number.isInteger(droppedIndex) ? droppedIndex : draggedQueueIndex);
                      }}
                      className={`performance-list-item group glass-card p-4 flex items-center gap-4 rounded-xl transition-all cursor-move border ${draggedQueueIndex === idx ? 'bg-brand-accent/15 border-brand-accent/45' : idx === 0 ? 'bg-brand-accent/10 border-brand-accent/30 shadow-[0_0_20px_rgba(0,255,191,0.2)]' : 'bg-white/5 border-white/10 hover:border-brand-accent/20'}`}
                    >
                      <div className="text-brand-accent font-black text-sm w-6">{idx + 1}</div>
                      <img src={getProxyUrl(track.thumbnail)} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-black truncate uppercase tracking-widest">{track.title}</div>
                        <div className="text-[10px] font-bold text-white/40 truncate uppercase mt-1">{track.author}</div>
                      </div>
                      {isDownloaded && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-red-500 border border-red-500/50 px-2 py-0.5 rounded-full">READY</span>
                      )}
                      {idx !== 0 && (
                        <button
                          onClick={() => {
                            const newQueue = [...queue];
                            const [removed] = newQueue.splice(idx, 1);
                            newQueue.splice(idx - 1, 0, removed);
                            setQueue(newQueue);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:text-brand-accent transition-all"
                          title="Move up"
                        >
                          <ChevronLeft size={14} />
                        </button>
                      )}
                      {idx !== queue.length - 1 && (
                        <button
                          onClick={() => {
                            const newQueue = [...queue];
                            const [removed] = newQueue.splice(idx, 1);
                            newQueue.splice(idx + 1, 0, removed);
                            setQueue(newQueue);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:text-brand-accent transition-all"
                          title="Move down"
                        >
                          <ChevronRight size={14} />
                        </button>
                      )}
                      {idx !== 0 && (
                        <button
                          onClick={async () => {
                            const confirmed = await requestDestructiveConfirmation({
                              title: 'Remove track from queue?',
                              message: `Aether will remove "${track?.title || 'this track'}" from the queue.`,
                              detail: 'The track is not removed from vaults, favorites, or downloads.',
                              confirmLabel: 'Remove Track',
                            });
                            if (confirmed) setQueue(queue.filter((_, i) => i !== idx));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all"
                          title="Remove"
                        >
                          <Trash2 size={14} className="text-red-500/40 hover:text-red-500" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export const FullPlaylistOverlay = memo(function FullPlaylistOverlay({
  openName,
  playlists,
  isContentReady,
  getProxyUrl,
  closeHeaderSurfaces,
  handleAdd,
  handleRemoveFromPlaylist,
  seekActivePlaybackTo,
  setIsPlaying,
  setIsViewingFullPlaylist,
  setQueue,
}) {
  const tracks = playlists[openName] || [];

  return (
    <AnimatePresence>
      {openName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-brand-dark/90 backdrop-blur-[20px]" onClick={() => setIsViewingFullPlaylist(null)} />
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="w-full max-w-2xl max-h-[80vh] glass-card bg-brand-dark/60 border-brand-accent/20 rounded-3xl flex flex-col overflow-hidden relative z-10"
          >
            <div className="flex items-center justify-between p-6 border-b border-brand-accent/10">
              <div className="flex items-center gap-3">
                <ListMusic size={20} className="text-brand-accent" />
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter text-white">Vault: {openName}</h2>
                  <div className="flex gap-2 items-center">
                    <p className="text-brand-accent text-xs font-bold tracking-widest uppercase opacity-60">{tracks.length} TRACK{tracks.length !== 1 ? 'S' : ''}</p>
                    <button
                      onClick={() => {
                        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                        setQueue(shuffled);
                        seekActivePlaybackTo(0);
                        setIsPlaying(true);
                        setIsViewingFullPlaylist(null);
                        closeHeaderSurfaces();
                      }}
                      className="px-2 py-0.5 rounded border border-brand-accent/30 text-brand-accent text-[9px] hover:bg-brand-accent/20 transition-all font-black uppercase flex items-center gap-1"
                    >
                      <Shuffle size={10} /> Play Shuffled
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsViewingFullPlaylist(null)}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <div className="flex flex-col gap-2">
                {!isContentReady ? (
                  <div className="h-40 flex flex-col items-center justify-center gap-3 text-center opacity-40">
                    <Loader2 size={26} className="animate-spin text-brand-accent/60" />
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">Preparing Vault</div>
                  </div>
                ) : tracks.map((track, idx) => (
                  <motion.div
                    key={`${openName}-${track.id}-${idx}`}
                    className="performance-list-item group glass-card p-4 flex items-center gap-4 rounded-xl transition-all bg-white/5 border border-white/10 hover:border-brand-accent/30 hover:bg-brand-accent/5"
                  >
                    <div className="text-brand-accent font-black text-sm w-6">{idx + 1}</div>
                    <img src={getProxyUrl(track.thumbnail)} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-black truncate uppercase tracking-widest">{track.title}</div>
                      <div className="text-[10px] font-bold text-white/40 truncate uppercase mt-1">{track.author}</div>
                    </div>
                    <button
                      onClick={() => handleAdd(track)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-brand-accent/20 hover:bg-brand-accent/40 text-brand-accent transition-all"
                      title="Add to Queue"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveFromPlaylist(openName, idx)}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-500 transition-all"
                      title="Remove from Vault"
                    >
                      <Trash2 size={14} className="text-red-500/40 hover:text-red-500" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
