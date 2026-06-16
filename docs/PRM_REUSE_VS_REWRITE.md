# PRM Reuse vs Rewrite For Tauri CM5 POC

This file explains what can likely be reused from the current PRM Totem system and what must be rewritten or adapted if the CM5/Debian Tauri POC succeeds.

The current production Totem is mainly an Electron renderer app with JavaScript modules, plus Python/server services outside the totem. Tauri still uses a web frontend, so much of the browser-side JavaScript logic can be reused, but Electron-specific APIs must be replaced.

## New POC Location

The new local POC lives here:

```text
c:\Users\utentepc\Desktop\tauri-cm5-poc
```

Main files:

| File | Purpose |
| --- | --- |
| `src/App.tsx` | Minimal Tauri frontend for CM5 camera, microphone, WebRTC loopback, and QR scanning |
| `src/styles.css` | POC UI styles |
| `src-tauri/tauri.conf.json` | Tauri desktop app config |
| `src-tauri/src/main.rs` | Minimal Rust launcher |
| `docs/CM5_DEBIAN_TESTING.md` | CM5/Debian test procedure |
| `docs/PRM_CONTEXT.md` | PRM assumptions used by this POC |

## Can Mostly Reuse

| Existing PRM Area | Current Location | Reuse Level | Notes |
| --- | --- | --- | --- |
| WebSocket protocol | `totem2/renderer/core/ws.js` | High | Message names and reconnect behavior can be reused. Replace any Electron-only storage/logging calls. |
| State machine logic | `totem2/renderer/core/machine.js` | High | XState v5 can run in Tauri frontend. Keep states/events, adapt side effects. |
| UI business flow | `totem2/renderer/app.js` | Medium | Flow logic is reusable, but DOM wiring should be cleaned up or moved into framework components if using React. |
| SIP/WebRTC concepts | `totem2/renderer/features/sip.js` | Medium | Browser WebRTC APIs are still available, but SIP.js must be tested inside WebKitGTK on CM5. |
| Camera selection rules | `totem2/renderer/core/cameras.js` | High | C922 videocall and C920 scanner label matching can be reused. |
| QR result handling | `totem2/renderer/features/scanner.js` | Medium | The app-side start/stop/result flow is reusable. Camera frame capture/decode may need changes. |
| Avatar/sign UI concepts | `totem2/renderer/avatar/avatar-ui.js` | Medium | UI concept can be reused later, but it is out of scope for this minimal POC. |
| Sign request protocol | `totem2/renderer/avatar/sign-request.js` | High later | HTTP call to RTX AI can stay similar when avatar features are ported. |
| Server APIs | FastAPI on server | High | The Tauri totem should speak to the same backend contracts if migration proceeds. |
| AI/STT/TTS services | RTX + FastAPI services | High | These services do not need to move into Tauri. |

## Needs Rewrite Or Tauri Adaptation

| Existing PRM Area | Why It Needs Work | Tauri Direction |
| --- | --- | --- |
| Electron main process | Tauri does not use Electron main/preload APIs | Replace with Tauri commands/plugins only where native access is needed. |
| Electron IPC | `ipcRenderer`, preload bridges, Electron-only events will not exist | Replace with Tauri `invoke`, events, or pure browser APIs. |
| Kiosk launch assumptions | Current app launches Electron under `cage` | Replace launch command with the Tauri binary under Debian/cage. |
| Native file/config access | Electron may read files directly from Node/preload | Use Tauri Rust commands or pass config through controlled frontend APIs. |
| GPIO button integration | Current flow uses system tools and IPC into Electron | Implement a small Tauri/Rust sidecar or command that watches GPIO and emits frontend events. |
| PulseAudio/device setup scripts | Existing scripts are external to app | Keep as system setup where possible; only add Tauri logic for detection/reporting. |
| QR decode pipeline | Browser QR decode may be weaker than current production server pipeline | POC tests browser decode first. If weak on CM5, move decode to Rust/native or keep server-side decode. |
| Insertable Streams STT audio tap | WebKitGTK support must be verified | If unsupported, use MediaRecorder/WebM chunks or a native audio capture path. |
| Electron security flags | Electron `webSecurity=false` behavior does not map directly | Handle certs/CSP/Tauri security explicitly. |
| Auto-update/distribution | Current operator distribution is Electron/NSIS | For CM5 totem, use Debian packaging/systemd deployment later, not in this POC. |

## POC Decision Before Migration

Do not start rewriting the full Totem app until this local CM5/Debian POC proves:

- Tauri WebView can access both C922 and C920 cameras.
- Microphone capture works reliably.
- WebRTC loopback works inside WebKitGTK on CM5.
- QR scanning can decode reliably from the scanner camera.
- Camera switching does not lock devices or crash the WebView.

If any of those fail, the migration plan changes before touching the full PRM app.

## Recommended Migration Order If POC Passes

1. Port camera/device detection.
2. Port WebSocket client and state machine.
3. Port SIP/WebRTC call setup.
4. Port QR scanner start/stop/result flow.
5. Add GPIO event bridge.
6. Add subtitle/STT hooks.
7. Add avatar/sign-language UI.
8. Package for CM5/Debian kiosk startup.
