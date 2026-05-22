import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';
import { ShortcutHint } from './AetherUi';

export const CommandPalette = memo(function CommandPalette({
  open,
  onClose,
  commands,
  shortcutLabel,
  showShortcutHints = true,
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      setQuery('');
      setActiveIndex(0);
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const filteredCommands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const available = (commands || []).filter((command) => !command.hidden && !command.disabled);
    if (!needle) return available;
    return available.filter((command) => {
      const haystack = `${command.title || ''} ${command.detail || ''} ${command.keywords || ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [commands, query]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setActiveIndex(0));
    return () => window.cancelAnimationFrame(id);
  }, [query]);

  const runCommand = useCallback((command) => {
    if (!command || command.disabled) return;
    command.run?.();
    onClose?.();
  }, [onClose]);

  const onKeyDown = useCallback((event) => {
    if (event.isComposing || composingRef.current) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((idx) => Math.min(filteredCommands.length - 1, idx + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((idx) => Math.max(0, idx - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(filteredCommands[activeIndex]);
    }
  }, [activeIndex, filteredCommands, onClose, runCommand]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="aether-command-palette"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[535] flex items-start justify-center bg-black/76 px-4 pt-[12vh] backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.985 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl overflow-hidden rounded-[1.7rem] border border-brand-accent/22 bg-[#070b0f]/96 shadow-[0_28px_100px_rgba(0,0,0,0.62)]"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
        >
          <div className="border-b border-white/10 bg-black/28 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-brand-accent/75">Aether Command</div>
                <div className="mt-1 text-lg font-black uppercase tracking-tight text-white">Command Palette</div>
              </div>
              <ShortcutHint label={shortcutLabel} title="Command palette shortcut" visible={showShortcutHints} />
            </div>
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent/70" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={() => { composingRef.current = false; }}
                placeholder="Search commands..."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-4 text-sm font-bold text-white outline-none transition-colors placeholder:text-white/30 focus:border-brand-accent/45 focus:bg-brand-accent/[0.045]"
              />
            </div>
          </div>

          <div className="custom-scrollbar-heavy max-h-[min(54vh,440px)] overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-6 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">No commands found</div>
                <div className="mt-2 text-xs text-white/38">Try “library”, “feedback”, “gesture”, or “search”.</div>
              </div>
            ) : filteredCommands.map((command, index) => {
              const Icon = command.icon || Sparkles;
              const active = index === activeIndex;
              return (
                <button
                  key={command.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runCommand(command)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${active ? 'border-brand-accent/35 bg-brand-accent/12 text-brand-accent' : 'border-transparent text-white/68 hover:border-white/10 hover:bg-white/[0.035] hover:text-white'}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${active ? 'border-brand-accent/35 bg-brand-accent/12' : 'border-white/10 bg-white/[0.035]'}`}>
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black uppercase tracking-[0.08em]">{command.title}</div>
                    {command.detail && <div className="mt-0.5 truncate text-[11px] font-semibold text-white/38">{command.detail}</div>}
                  </div>
                  {command.shortcut && <ShortcutHint label={command.shortcut} className="hidden sm:inline-flex" visible={showShortcutHints} />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/22 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/32">
            <span>Enter to run</span>
            <span>Esc to close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
});
