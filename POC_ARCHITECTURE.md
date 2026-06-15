# Tauri CM5 POC Architecture

## Objective

Validate that Tauri can support the two most critical features of the current system:

1. WebRTC
2. Camera QR Scanner

---

## Components

### Tauri Application

Frontend:
- HTML
- CSS
- JavaScript

Backend:
- Rust (Tauri)

---

## Module 1 - WebRTC Test

Functions:

- Open camera
- Open microphone
- Display local video
- Establish WebRTC connection
- Send audio/video stream

Success Criteria:

- Camera works
- Microphone works
- Audio works
- Video works

---

## Module 2 - QR Scanner Test

Functions:

- Open camera
- Read QR code
- Display decoded content

Success Criteria:

- QR detected
- QR decoded correctly
- Scan speed acceptable

---

## Test Platform

- Raspberry Pi CM5
- Debian Linux
- Industrial Touchscreen PC

---

## Final Validation

Compare:

- RAM usage
- CPU usage
- Startup time
- Stability

against Electron.
