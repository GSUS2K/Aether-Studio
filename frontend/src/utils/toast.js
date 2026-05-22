export const inferToastTone = (message) => {
  const text = String(message || '').toLowerCase();
  if (/(failed|failure|error|invalid|unavailable|could not|blocked|denied)/.test(text)) return 'error';
  if (/(cancelled|canceled|skipped|warning|offline|missing|empty|not found|no playable)/.test(text)) return 'warning';
  return 'success';
};
