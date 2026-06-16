# Tauri CM5 Proof of Concept - Project Plan

## Objective

Create a minimal Tauri POC that keeps the renderer in the same JavaScript language style as the current PRM Totem and Operator apps.

The POC validates only the core runtime risks on Raspberry Pi CM5 / Debian Linux: media devices, WebRTC, QR scanning, touchscreen-friendly UI, and existing Asterisk SIP/WebRTC behavior.

## Success Criteria

The proof of concept is successful if:

- WebRTC video calls work correctly
- Camera access works
- Microphone access works
- Audio playback works
- Touchscreen interaction works
- Fullscreen/kiosk launch remains feasible
- Existing Asterisk SIP/WebRTC registration works
- Scanner integration is feasible
- The application runs reliably on CM5

## Phase 1 - Minimal Tauri Shell

- Tauri v2 native shell
- Vite JavaScript renderer
- Touch-friendly UI

## Phase 2 - Media Validation

- Camera access
- Microphone access
- Audio playback
- WebRTC loopback call

## Phase 3 - Existing Asterisk Validation

- Totem SIP registration
- Operator SIP registration
- Manual Totem-to-Operator call

## Phase 4 - QR Scanner Validation

- Scanner camera selection
- QR decode test
- Repeated scan stability

## Final Deliverables

- Source code repository
- CM5 test notes
- Minimal recommendation for reusing PRM JavaScript renderer code in Tauri
