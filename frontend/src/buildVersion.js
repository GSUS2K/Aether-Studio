export const BUILD_VERSION = 'Utario';

const commitCount = Number(import.meta.env.VITE_COMMIT_COUNT);
export const UX_VERSION = `V${Number.isFinite(commitCount) && commitCount > 0 ? commitCount : 1}`;
