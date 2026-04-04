const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : null;
};

const repo = getArg('--repo');
const tag = getArg('--tag');
const dmgDir = getArg('--dmg-dir');
const outFile = getArg('--out');

if (!repo || !tag || !dmgDir || !outFile) {
  console.error('Usage: node scripts/generate-homebrew-cask.cjs --repo <owner/repo> --tag <tag> --dmg-dir <dir> --out <file>');
  process.exit(1);
}

const version = String(tag).startsWith('v') ? String(tag).slice(1) : String(tag);

const files = fs
  .readdirSync(dmgDir)
  .filter((f) => f.toLowerCase().endsWith('.dmg'))
  .sort();

if (files.length === 0) {
  console.error(`No DMG files found in ${dmgDir}`);
  process.exit(1);
}

const hashFile = (filePath) => {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
};

const byArch = {
  arm64: null,
  x64: null,
  universal: null,
};

for (const file of files) {
  const lower = file.toLowerCase();
  const entry = {
    file,
    sha256: hashFile(path.join(dmgDir, file)),
    url: `https://github.com/${repo}/releases/download/${tag}/${file}`,
  };

  if (lower.includes('arm64') || lower.includes('aarch64')) {
    byArch.arm64 = entry;
  } else if (lower.includes('x64') || lower.includes('amd64')) {
    byArch.x64 = entry;
  } else {
    byArch.universal = entry;
  }
}

const lines = [];
lines.push('cask "aether" do');
lines.push(`  version "${version}"`);

if (byArch.arm64 && byArch.x64) {
  lines.push('  on_arm do');
  lines.push(`    sha256 "${byArch.arm64.sha256}"`);
  lines.push(`    url "${byArch.arm64.url}"`);
  lines.push('  end');
  lines.push('');
  lines.push('  on_intel do');
  lines.push(`    sha256 "${byArch.x64.sha256}"`);
  lines.push(`    url "${byArch.x64.url}"`);
  lines.push('  end');
} else {
  const chosen = byArch.arm64 || byArch.x64 || byArch.universal;
  lines.push(`  sha256 "${chosen.sha256}"`);
  lines.push(`  url "${chosen.url}"`);
}

lines.push('');
lines.push('  name "Aether"');
lines.push('  desc "Standalone Aether Desktop Application"');
lines.push(`  homepage "https://github.com/${repo}"`);
lines.push('');
lines.push('  app "Aether.app"');
lines.push('end');

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${lines.join('\n')}\n`, 'utf8');

console.log(`Wrote ${outFile}`);
