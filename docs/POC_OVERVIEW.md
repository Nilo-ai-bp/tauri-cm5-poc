# Tauri CM5 / Debian POC

Minimal proof of concept for validating Tauri on Raspberry Pi CM5 with Debian Linux, using a PRM-style JavaScript renderer. It includes Totem-side and Operator-side SIP/WebRTC screens for testing against the existing PRM Asterisk setup.

The target platform is the CM5 totem. Windows is only the current editing workstation for these local files.

No deployment is part of this POC. Do not copy files to PRM hosts, restart services, or change production devices from this repository.

## Scope

| Area | Test |
| --- | --- |
| WebRTC | Camera, microphone, audio, local video call |
| Totem SIP | Existing Asterisk WSS registration and call to operator |
| Operator SIP | Existing Asterisk WSS registration and incoming call answer |
| QR Scanner | Camera-based QR scanning |
| Platform | Raspberry Pi CM5 / Debian Linux, ARM64 |
| Goal | Verify critical PRM client features in a Tauri shell with JavaScript renderer code |

## Commands On CM5 / Debian

```bash
npm install
npm run tauri:dev
```

Build a local Debian bundle on the CM5:

```bash
npm run tauri:build
```

## What The POC Does

- Enumerates cameras, microphones, and audio outputs.
- Prefers the PRM camera layout when labels are available: C922 for videocall, C920 for scanner.
- Requests camera and microphone permissions.
- Shows local camera preview.
- Creates a local WebRTC loopback peer connection to verify audio/video WebRTC support inside the Tauri WebView.
- Provides an optional Totem-side SIP/WebRTC panel that can register as `totem-001` and call `op-002` through the existing Asterisk server.
- Starts a camera QR scanner using `@zxing/browser`.
- Provides an Operator-side SIP/WebRTC POC that can register to the existing Asterisk WSS endpoint when manually started.

See `docs/CM5_DEBIAN_TESTING.md` for Raspberry Pi CM5 / Debian setup and pass criteria.
See `docs/OPERATOR_SIDE_POC.md` for the Operator-side scope and existing Asterisk assumptions.
See `docs/EXISTING_ASTERISK_USAGE.md` for the exact existing Asterisk values used by both POC screens.
