export const BUILD_VERSION = 'Utario';

export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2026.5.5';

const commitCount = Number(import.meta.env.VITE_COMMIT_COUNT);
export const UX_VERSION = `V${Number.isFinite(commitCount) && commitCount > 0 ? commitCount : 1}`;
