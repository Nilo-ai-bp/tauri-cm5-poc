# Tauri CM5 POC

Purpose:
Minimal Tauri proof of concept for Raspberry Pi CM5 and Debian Linux, using a PRM-style JavaScript renderer instead of TypeScript.

Goals:
- Test WebRTC
- Test camera
- Test microphone
- Test audio
- Test QR scanning
- Test existing Asterisk SIP/WebRTC registration
- Keep the renderer close to the current PRM JavaScript clients

Status:
Minimal POC

## Commands

```bash
npm install
npm run tauri:dev
```

Build a local Debian bundle on the CM5:

```bash
npm run tauri:build
```
