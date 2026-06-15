# Research 01 - Tauri Architecture vs Electron

## Objective

Understand why Tauri may consume fewer resources than Electron on Raspberry Pi CM5 and Debian Linux industrial touch PCs.

## Questions

1. How does Electron work?
2. How does Tauri work?
3. Why is Electron heavier?
4. Why can Tauri be lighter?
5. What is the impact on CPU, RAM, GPU, and startup time?
6. What are the possible risks of using Tauri on Linux?

## Initial Conclusion

Tauri may reduce resource usage because it does not bundle Chromium and Node.js like Electron. Instead, it uses the system WebView. However, on Linux this means Tauri depends on WebKitGTK, so WebRTC, camera, microphone, and video call support must be tested carefully on CM5.
