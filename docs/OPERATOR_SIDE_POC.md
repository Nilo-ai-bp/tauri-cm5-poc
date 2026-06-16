# Operator-Side Tauri POC

This adds a minimal local Operator-side Tauri screen next to the existing Totem-side CM5 screen.

It is local-only. It must not deploy files, SSH into machines, restart services, or modify Asterisk, Totem, Operator, RTX, or server configuration.

## Goal

Validate whether Tauri-based Totem and Operator frontends can register to the existing PRM Asterisk WebRTC service and place/receive a SIP/WebRTC call without changing the server.

## Existing Asterisk Assumptions

From the PRM System Overview:

| Item | Existing value |
| --- | --- |
| Asterisk host | `192.168.0.176` |
| WebRTC WSS | `wss://192.168.0.176:8089/ws` |
| Operator extension example | `op-002` |
| Operator password example | `op-002` |
| Totem extension example | `totem-001` |
| Totem password example | `totem001` |
| Dialplan context | `prm-calls` |
| Required WebRTC endpoint behavior | existing `bundle = yes`, `webrtc = yes`, DTLS, ICE, RTCP mux |

Do not change these settings for this POC.

## What The Operator POC Does

- Requests local operator camera and microphone.
- Registers as an existing operator SIP extension through the existing Asterisk WSS endpoint.
- Waits for an incoming SIP/WebRTC call.
- Lets the tester answer or hang up.
- Shows local operator preview and remote totem media.
- Logs browser/Tauri-side registration and call events.

## What The Totem SIP Panel Does

- Keeps the existing local camera/mic/WebRTC loopback/QR tests.
- Adds an optional `Existing Asterisk SIP` panel.
- Registers as `totem-001` by default.
- Calls `op-002` through the existing Asterisk dialplan by default.
- Reuses the same local/remote video panels as the loopback test.

## What It Does Not Do

- It does not connect to the PRM FastAPI operator WebSocket.
- It does not accept queue items.
- It does not create or change SIP users.
- It does not modify Asterisk config.
- It does not replace the current production Operator app.

## Expected Test Flow With Existing PRM System

1. Start this local Tauri POC.
2. Open the `Operator SIP` screen.
3. Keep Operator defaults unless testing a different existing extension:
   - `wss://192.168.0.176:8089/ws`
   - `op-002`
   - password `op-002`
4. Click `Start operator media`.
5. Click `Register`.
6. Open the `Totem CM5` screen.
7. Keep Totem SIP defaults unless testing a different existing extension:
   - `wss://192.168.0.176:8089/ws`
   - `totem-001`
   - password `totem001`
   - operator extension `op-002`
8. Click `Start camera and mic`.
9. Click `Register totem`.
10. Click `Call operator`.
11. When the incoming call appears on the Operator screen, click `Answer`.

The existing server/Asterisk flow should remain the source of truth for production. This POC only checks whether Tauri can behave as the Totem and Operator SIP/WebRTC endpoints against the current Asterisk configuration.

## Known Risk

The existing Electron clients can tolerate the self-signed Asterisk WSS certificate. Tauri/WebKitGTK may require the certificate to be trusted by the test machine before `wss://192.168.0.176:8089/ws` succeeds.

This POC should reveal that compatibility issue. Do not work around it by changing Asterisk config in this repository.
