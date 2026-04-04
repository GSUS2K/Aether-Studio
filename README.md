# Aether

Aether is a desktop music app with a local backend, lyrics, queue handling, offline playback, and a visual aura mode. The idea is simple: download it, open it, and start listening.

## What Aether includes

- Desktop app for macOS, Windows, and Linux
- Local backend for search, playback, lyrics, and queue control
- Aura mode visualizer with beat-reactive effects
- Offline playback helpers and media downloads
- Discord Rich Presence support

## Download

The easiest way to get Aether is from the GitHub Releases page.

Download the asset that matches your platform:

- **macOS Intel and Apple Silicon**: `.dmg`
- **Windows**: `.exe`
- **Linux**: `.AppImage`

If you already opened a release tag, that tag is the packaged version you should download.

## Install on macOS

1. Download the `.dmg` from Releases.
2. Open the disk image.
3. Drag Aether into your Applications folder.
4. Launch Aether from Applications.
5. If macOS blocks the first open, right-click the app and choose **Open**.

The release build is made for both Intel Macs and Apple Silicon Macs.

## Install on Windows

1. Download the `.exe` installer from Releases.
2. Run the installer.
3. Follow the setup prompts.
4. Open Aether from the Start menu or desktop shortcut.

## Install on Linux

1. Download the `.AppImage` from Releases.
2. Make it executable if needed:

```bash
chmod +x Aether-*.AppImage
```

1. Run it:

```bash
./Aether-*.AppImage
```

If your desktop asks how to open it, choose the AppImage launcher or run it from the terminal.

## Homebrew install

If you have Homebrew, you can install Aether with:

```bash
brew tap GSUS2K/tap
brew install --cask aether
```

## Run from source

If you want to run Aether from the codebase instead of a release build, install Node.js first, then run:

```bash
npm install
npm start
```

That starts the desktop app with its local backend.

## Build locally

Useful commands from `package.json`:

```bash
npm run package
```

Creates a local macOS app build.

```bash
npm run dist
```

Builds a macOS distributable.

```bash
npm run dist:win
```

Builds the Windows installer.

```bash
npm run dist:all
```

Builds macOS and Windows installers.

## How to use Aether

1. Open the app.
2. Search for a track or browse your queue.
3. Choose something to play.
4. Use the transport controls to play, pause, skip, or go back.
5. Open lyrics and adjust sync if needed.
6. Turn on aura mode if you want the more animated visual experience.

## Troubleshooting

- If playback feels broken, restart the app first.
- If macOS says the app is from an unidentified developer, use **Open** once from the right-click menu.
- If a download is missing, make sure you picked the asset for the right platform.
- If you are using the web frontend, it can point to a separate API base URL.

## Notes

- Aether uses a local backend while the desktop app is running.
- Some features depend on bundled media tools.
- Release builds are created from tag pushes.

## Version

Current app version: `12.11.1-SOVEREIGN`

## License

Aether is licensed under the MIT License. See [LICENSE](LICENSE) for the full text.
