# Tauri CM5 POC Architecture

## Objective

Validate that Tauri can support the critical PRM client features on Raspberry Pi CM5 / Debian while keeping the renderer in JavaScript:

1. WebRTC media
2. Camera QR scanning
3. Existing Asterisk SIP/WebRTC registration

## Components

### Tauri Application

Renderer:
- HTML
- CSS
- JavaScript / JSX

Native shell:
- Rust / Tauri
- Minimal launcher only

## Module 1 - WebRTC Test

- Open camera
- Open microphone
- Display local video
- Establish WebRTC connection
- Send audio/video stream

## Module 2 - QR Scanner Test

- Open camera
- Read QR code
- Display decoded content

## Module 3 - Existing Asterisk SIP Test

- Register Totem endpoint
- Register Operator endpoint
- Place manual Totem-to-Operator call
- Answer or hang up locally

## Test Platform

- Raspberry Pi CM5
- Debian Linux
- Existing PRM Asterisk at `192.168.0.176`
