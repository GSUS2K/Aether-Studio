const fs = require('fs');
const path = require('path');
const https = require('https');
const { createGunzip } = require('zlib');
const { pipeline } = require('stream');

const root = path.join(__dirname, '..');
const binDir = path.join(root, 'desktop', 'bin');
const platform = process.platform;

const targets = (() => {
  if (platform === 'win32') {
    return [
      {
        label: 'yt-dlp',
        fileName: 'yt-dlp.exe',
        minBytes: 1024 * 1024,
        windowsExe: true,
        url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
      },
      {
        label: 'ffmpeg',
        fileName: 'ffmpeg.exe',
        minBytes: 5 * 1024 * 1024,
        windowsExe: true,
        url: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64.gz',
      },
    ];
  }

  if (platform === 'darwin') {
    return [
      {
        label: 'yt-dlp',
        fileName: 'yt-dlp_macos',
        minBytes: 1024 * 1024,
        url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
      },
      {
        label: 'ffmpeg (darwin x64)',
        fileName: 'ffmpeg_darwin_x64',
        minBytes: 5 * 1024 * 1024,
        url: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-x64.gz',
      },
      {
        label: 'ffmpeg (darwin arm64)',
        fileName: 'ffmpeg_darwin_arm64',
        minBytes: 5 * 1024 * 1024,
        url: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-arm64.gz',
      },
    ];
  }

  return [
    {
      label: 'yt-dlp',
      fileName: 'yt-dlp',
      minBytes: 1024 * 1024,
      url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
    },
    {
      label: 'ffmpeg',
      fileName: 'ffmpeg',
      minBytes: 5 * 1024 * 1024,
      url: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-linux-x64.gz',
    },
  ];
})();

const hasWindowsExeMagic = (filePath) => {
  let fd = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const magic = Buffer.alloc(2);
    fs.readSync(fd, magic, 0, 2, 0);
    return magic[0] === 0x4d && magic[1] === 0x5a;
  } catch {
    return false;
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch {}
    }
  }
};

const isValidBinary = (filePath, target) => {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size <= target.minBytes) return false;
    if (target.windowsExe && !hasWindowsExeMagic(filePath)) return false;
    return true;
  } catch {
    return false;
  }
};

const markExecutable = (filePath) => {
  if (platform === 'win32') return;
  try { fs.chmodSync(filePath, 0o755); } catch {}
};

const downloadWithRedirects = (url, filePath, redirects = 0, decompress = url.endsWith('.gz')) => new Promise((resolve, reject) => {
  if (redirects > 8) {
    reject(new Error('Too many redirects'));
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  const file = fs.createWriteStream(tmpPath);

  const cleanup = () => {
    try { file.close(); } catch {}
    try { fs.unlinkSync(tmpPath); } catch {}
  };

  const req = https.get(url, {
    headers: {
      'user-agent': 'Aether-Binary-Prep/1.0',
      accept: 'application/octet-stream,*/*',
    },
  }, (res) => {
    const status = res.statusCode || 0;
    const location = res.headers.location;

    if (status >= 300 && status < 400 && location) {
      cleanup();
      const nextUrl = location.startsWith('http') ? location : new URL(location, url).toString();
      res.resume();
      resolve(downloadWithRedirects(nextUrl, filePath, redirects + 1, decompress));
      return;
    }

    if (status < 200 || status >= 300) {
      cleanup();
      res.resume();
      reject(new Error(`Download failed with status ${status}`));
      return;
    }

    const streams = decompress
      ? [res, createGunzip(), file]
      : [res, file];

    pipeline(...streams, (err) => {
      if (err) {
        cleanup();
        reject(err);
        return;
      }
      file.close(() => {
        try {
          fs.renameSync(tmpPath, filePath);
          resolve(filePath);
        } catch (renameErr) {
          reject(renameErr);
        }
      });
    });
  });

  req.setTimeout(25000, () => req.destroy(new Error('Download timeout')));
  req.on('error', (err) => {
    cleanup();
    reject(err);
  });
  file.on('error', (err) => {
    cleanup();
    reject(err);
  });
});

const ensureBinary = async (target) => {
  const destination = path.join(binDir, target.fileName);
  if (isValidBinary(destination, target)) {
    markExecutable(destination);
    console.log(`[prepare-bundled-binaries] Using existing ${target.fileName}`);
    return;
  }

  console.log(`[prepare-bundled-binaries] Downloading ${target.fileName}...`);
  await downloadWithRedirects(target.url, destination);
  markExecutable(destination);

  if (!isValidBinary(destination, target)) {
    throw new Error(`Downloaded ${target.label} looks invalid: ${destination}`);
  }

  console.log(`[prepare-bundled-binaries] Ready: ${destination}`);
};

(async () => {
  fs.mkdirSync(binDir, { recursive: true });
  for (const target of targets) {
    await ensureBinary(target);
  }
})().catch((err) => {
  console.error('[prepare-bundled-binaries] Failed:', err?.message || err);
  process.exit(1);
});
