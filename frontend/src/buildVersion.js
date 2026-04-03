const shortHash = (import.meta.env.VITE_BUILD_VERSION || 'local').slice(0, 8);
export const BUILD_VERSION = `BUILD-${shortHash}`;
