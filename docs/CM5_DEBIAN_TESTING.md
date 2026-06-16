# Raspberry Pi CM5 / Debian Test Notes

This is the primary test path for the project. The POC validates whether Tauri's Linux WebView on Raspberry Pi CM5 / Debian can support the critical PRM client features while the renderer stays in JavaScript:

- camera access through `navigator.mediaDevices.getUserMedia`
- microphone access and local audio/video capture
- WebRTC peer connection setup
- existing Asterisk SIP/WebRTC registration through JsSIP
- camera-based QR decoding

This is a local validation project only. Do not copy files to PRM production machines, restart services, or deploy anything from this repository.

Windows is not the target platform for the decision. It is only where the files may be edited before they are tested locally on CM5/Debian.

## Debian packages

Install the normal Tauri Linux build/runtime dependencies plus camera utilities:

```bash
sudo apt update
sudo apt install -y \
  build-essential curl file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
  webkit2gtk-4.1 libwebkit2gtk-4.1-dev \
  pipewire wireplumber libspa-0.2-bluetooth \
  v4l-utils
```

Some Debian images still package WebKitGTK under `webkit2gtk-4.0`. If `webkit2gtk-4.1` is unavailable, install the matching Tauri-supported WebKitGTK package for that image.

## Hardware checks

```bash
v4l2-ctl --list-devices
v4l2-ctl --all
pactl info
pactl list short sources
```

Expected PRM camera layout:

| Camera | Expected role | Preferred label |
| --- | --- | --- |
| Logitech C922 Pro Stream | Videocall and microphone | `c922` |
| Logitech C920 HD Pro | QR scanner | `c920` |

## Run On CM5

```bash
npm install
npm run tauri:dev
```

## Pass criteria

- The app runs on Raspberry Pi CM5 / Debian, not just a Windows development machine.
- Media devices are listed after permission is granted.
- Local camera preview is visible.
- Microphone permission is granted without WebView errors.
- The loopback WebRTC call shows the local stream in the remote video panel.
- Existing Asterisk SIP registration succeeds where the current PRM credentials are valid.
- QR scanner decodes a QR code through the selected camera.

## Notes

- Camera labels can be blank until the first successful permission grant.
- QR scanning and the local preview may compete for the same camera on some Linux camera stacks. Stop one test before starting the other if the device reports that it is busy.
- If `navigator.mediaDevices` is unavailable, the WebKitGTK build or sandbox permissions are the first thing to inspect.
