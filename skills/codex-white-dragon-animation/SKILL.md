---
name: codex-white-dragon-animation
description: Install, diagnose, or maintain the non-official white-dragon startup launcher and video wallpaper for Windows Codex. Use for this animation package and its shortcuts, not generic Codex setup or other desktop themes.
---

# White-dragon Codex animation

This skill packages a Windows installation workflow, not an official GUI startup hook. Skill discovery/installation alone does not start programs or apply a wallpaper. Clicking the original official Codex icon remains unchanged. Explain this when the user expects Skill installation to replace the official startup screen.

The independent runtime is in `assets/runtime/`. It uses a validated signed official Codex executable and a temporary appearance layer via a verified loopback debugger. Do not alter app.asar, CSP, Electron security settings, execution policy, official icons, or running processes. Do not install an autostart watcher.

## Install

When the user requests installation, explain that using the launcher opens a local debugger in the authenticated app until the app fully exits; other same-machine programs may connect. A shortcut alone does not open this port. Preserve first-use interactive `YES` consent. v11 remembers consent only for the same Windows account, verified official app version and exact code binding; never preauthorize, ship or migrate another installation's consent file.

1. Confirm the user wants a separate **Codex · 白璃动画** shortcut and a stable runtime directory. Default runtime destination is `Documents/Codex/WhiteDragonCodex`; preserve their chosen path and original official icon.
2. Run `node scripts/setup.mjs --dry-run` to inspect the copy plan. Use `--destination=<absolute-directory>` for a selected destination.
3. With authorization to install, run the same command without `--dry-run`. It refuses an existing destination rather than overwriting user files. For an upgrade, inspect old configuration and obtain the user's desired handling first.
4. From the prepared runtime run `node launcher.mjs --probe` for a read-only package/signature/process check, then `node shortcut.mjs --install` to create the separate shortcut. If desktop writes or package discovery are sandbox-blocked, request only the necessary permission; do not bypass the sandbox or run as administrator.
5. Tell the user to save work, fully exit Codex including Mini/background, double-click the new desktop shortcut, and personally type `YES` on first use if they accept the local-debug risk. Changed account, official version or bound code requires renewed consent. Never kill/restart an active client. Do not claim native compatibility from a browser or simulated-host test.

Requires Windows, Node.js 22.3+ and PowerShell 7. The launcher reuses an existing bundled PowerShell 7 when present; otherwise `BAILI_POWERSHELL` can point to an installed `pwsh.exe`. No dependency download is required by this skill.

## Wallpaper and diagnosis

Runtime `config.json` defaults to 85% wallpaper strength and 60% panel opacity. `startup.mp4` is 3840×2160/60fps/16 seconds. On entering work, `handoff.mp4` fades the four background branding/loading groups and rules together over 1.5 seconds, once; `wallpaper.mp4` then loops a silent 16-second character-only background. Hair, iris and stars remain continuous. One video plays at a time; do not reintroduce two-face crossfades or a vertical wipe. Actual playback performance and client transparency depend on the current build and machine.

Use **白璃 · 设置** / `Ctrl+Alt+B` for intensity, panel opacity, pause, reduced motion, replay, music and restore. Codex text colors continue to follow its theme; keep input/code/dialog surfaces readable and do not remove all UI backgrounds indiscriminately. Prefer an actual client screenshot before adapting selectors; do not read chat text, credentials or project files for appearance diagnosis. The native app's own text is not part of the background branding fade.

The base character images are about 1672×940, enlarged for 4K composite output; this is not native 4K 3D or physical hair simulation. Do not promise new portrait detail by increasing canvas size. This public release includes a publisher-authorized music excerpt in `assets/startup-audio.m4a` and the startup film, not the full original track. Audio defaults to muted; the user can enable it in settings. Music and character rights are separate from the MIT source-code license. Do not add unrelated private music or original references without publishing authorization and applicable rights.

## Restore and distribution

`Restore.cmd` / **恢复原外观** removes the temporary layer, but **does not close the debugger port**. Fully exit Codex and reopen normally from the official icon to close it. `node shortcut.mjs --remove` removes only the project-owned matching shortcut and preserves official entries. Keep runtime files unless the user asks to remove them; do not delete a broad folder.

For GitHub publication, require a specified repository and visibility plus publishing authorization. Exclude `session.json`, `local-consent.json`, logs, diagnosis captures, shortcut backups, original user references, credentials and machine-specific paths. Preserve approved bundled media and third-party license/source notices, without relicensing them as MIT. Installing this skill from GitHub still requires its setup workflow; do not advertise it as a supported startup event or UI-theme API. Runtime details are in `assets/runtime/README.md`; install tests are in `tests/setup.test.mjs`.
