# PRM Reuse vs Rewrite For Tauri JavaScript POC

This file explains what can likely be reused from the current PRM Totem/Operator system and what must be rewritten or adapted if the CM5/Debian Tauri POC succeeds.

The current production Totem and Operator clients are mainly Electron renderer apps with JavaScript modules. This POC keeps the renderer in JavaScript/JSX so browser-side PRM logic can stay familiar, while the native shell is Tauri instead of Electron.

## Local POC Files

| File | Purpose |
| --- | --- |
| `src/App.jsx` | Minimal Tauri frontend for CM5 camera, microphone, WebRTC loopback, QR scanning, and Totem SIP test |
| `src/operator/OperatorPoc.jsx` | Minimal Operator-side SIP/WebRTC registration and incoming-call test |
| `src-tauri/tauri.conf.json` | Tauri desktop app config |
| `src-tauri/src/main.rs` | Minimal Rust launcher |

## High-Reuse PRM Areas

| Existing PRM Area | PRM Location From Overview | Reuse Potential | Notes |
| --- | --- | --- | --- |
| Renderer structure | `totem2/renderer/` and `clients/operator/src/renderer/` | High | JavaScript/browser logic can be adapted without a TypeScript rewrite |
| SIP/WebRTC assumptions | `features/sip.js`, operator SIP code | High | JsSIP + Asterisk WSS remain the important integration path |
| Camera selection | `renderer/core/cameras.js` | High | Keep C922/C920 label preference |
| QR scanner behavior | `renderer/features/scanner.js` plus server scanner | Medium | POC only checks browser decode; production may still need robust server/native decode |
| Backend APIs | FastAPI on server | High | This POC does not call them, but production contracts remain unchanged |
| AI/STT/TTS services | RTX + FastAPI services | High | These services stay outside the client POC |

## Needs Rewrite Or Tauri Adaptation

| Existing PRM Area | Why It Needs Work | Tauri Direction |
| --- | --- | --- |
| Electron main process | Tauri does not use Electron main/preload APIs | Replace with Tauri commands/plugins only where native access is needed |
| Electron IPC | `ipcRenderer`, preload bridges, Electron-only events will not exist | Replace with Tauri `invoke`, events, or pure browser APIs |
| Kiosk launch assumptions | Current app launches Electron under `cage` | Replace launch command with the Tauri binary under Debian/cage |
| Native file/config access | Electron may read files directly from Node/preload | Use Tauri Rust commands or pass config through controlled frontend APIs |
| GPIO button integration | Current flow uses system tools and IPC into Electron | Implement a small Tauri/Rust sidecar or command that watches GPIO and emits frontend events |

## Practical Decision

The POC should validate CM5 runtime behavior while keeping the renderer language close to PRM. If the WebView passes, the migration work is mostly shell/native integration rather than a frontend language rewrite.
