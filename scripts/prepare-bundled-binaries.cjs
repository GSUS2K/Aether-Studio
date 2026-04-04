const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const binDir = path.join(root, 'desktop', 'bin');
const platform = process.platform;

const target = (() => {
  if (platform === 'win32') {
    return {
      fileName: 'yt-dlp.exe',
      url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    };
  }

  if (platform === 'darwin') {
    return {
      fileName: 'yt-dlp_macos',
      url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos',
    };
  }

  return {
    fileName: 'yt-dlp',
    url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
  };
})();

const destination = path.join(binDir, target.fileName);

const isValidBinary = (filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() && stat.size > 1024 * 1024;
  } catch {
    return false;
  }
};

const downloadWithRedirects = (url, filePath, redirects = 0) => new Promise((resolve, reject) => {
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
      resolve(downloadWithRedirects(nextUrl, filePath, redirects + 1));
      return;
    }

    if (status < 200 || status >= 300) {
      cleanup();
      res.resume();
      reject(new Error(`Download failed with status ${status}`));
      return;
    }

    res.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        try {
          fs.renameSync(tmpPath, filePath);
          resolve(filePath);
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  req.setTimeout(20000, () => req.destroy(new Error('Download timeout')));
  req.on('error', (err) => {
    cleanup();
    reject(err);
  });
  file.on('error', (err) => {
    cleanup();
    reject(err);
  });
});

(async () => {
  fs.mkdirSync(binDir, { recursive: true });

  if (isValidBinary(destination)) {
    if (platform !== 'win32') {
      try { fs.chmodSync(destination, 0o755); } catch {}
    }
    console.log(`[prepare-bundled-binaries] Using existing ${target.fileName}`);
    return;
  }

  console.log(`[prepare-bundled-binaries] Downloading ${target.fileName}...`);
  await downloadWithRedirects(target.url, destination);

  if (platform !== 'win32') {
    try { fs.chmodSync(destination, 0o755); } catch {}
  }

  if (!isValidBinary(destination)) {
    throw new Error(`Downloaded binary looks invalid: ${destination}`);
  }

  console.log(`[prepare-bundled-binaries] Ready: ${destination}`);
})().catch((err) => {
  console.error('[prepare-bundled-binaries] Failed:', err?.message || err);
  process.exit(1);
});
