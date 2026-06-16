# PRM Context For This POC

This local POC does not replicate the full PRM Totem/Operator application. It only validates the CM5/Debian migration blockers that matter before committing to Tauri.

The POC is local-only. It must not deploy to the totem, server, operator machines, senior reference machines, or RTX AI machine.

## Current Totem Assumptions

| Item | Current PRM Detail | POC Meaning |
| --- | --- | --- |
| Platform | Raspberry Pi CM5 running Debian Linux | This is the target platform for the decision |
| Display shell | Wayland kiosk through `cage` | Confirm WebKitGTK media APIs still work in kiosk conditions |
| Videocall camera | Logitech C922, top camera | Prefer camera label containing `c922` |
| Scanner camera | Logitech C920, bottom camera | Prefer camera label containing `c920` |
| Audio | C922 microphone is used for videocall/STT | Verify microphone permission and audio capture |
| WebRTC media | Current stack depends on Opus plus VP8/H264 through Asterisk/SIP.js | This POC first verifies browser-level WebRTC media primitives |
| QR risk | Production scanner has needed robust decode handling | This POC checks whether Tauri camera access is viable before porting scanner logic |

## Explicitly Out Of Scope

- No PRM server calls.
- No Asterisk or SIP registration.
- No queue/state-machine replication.
- No AI/STT/TTS/sign-language integration.
- No deployment to CM5 or production hosts.

## Decision Gate

Tauri remains a candidate only if the CM5 can pass:

- the app starts on Debian Linux on Raspberry Pi CM5
- both cameras are visible to the WebView
- the videocall camera can stream continuously
- microphone capture works without permission or device-lock issues
- local WebRTC loopback connects and renders remote media
- the scanner camera can decode QR codes repeatedly
- camera switching does not destabilize the WebView
