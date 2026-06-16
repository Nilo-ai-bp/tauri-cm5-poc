# Research 01 - Tauri Shell With PRM JavaScript Renderer

## Objective

Use Tauri as the native shell while keeping the renderer close to the current PRM JavaScript client architecture.

## Questions

1. Can Tauri on CM5 access the same cameras and microphone used by PRM?
2. Can JsSIP register to the existing PRM Asterisk WSS endpoint from the Tauri WebView?
3. Can a minimal JavaScript renderer handle local WebRTC loopback and SIP media?
4. Can browser-side QR scanning work with the C920 scanner camera?
5. What kiosk and Debian package assumptions are still needed?

## Initial Conclusion

The POC should keep the native shell minimal and keep most client logic in JavaScript, matching the current PRM renderer modules as closely as possible.
