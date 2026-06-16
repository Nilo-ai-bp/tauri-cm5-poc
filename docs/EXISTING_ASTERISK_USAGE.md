# Existing Asterisk Usage For Tauri POCs

This POC must use the existing PRM Asterisk setup as-is.

Do not edit Asterisk config, add SIP users, reload Asterisk, restart services, SSH into servers, or deploy files from this repository.

## Existing Server

| Item | Value |
| --- | --- |
| Asterisk host | `192.168.0.176` |
| WebRTC WSS URL | `wss://192.168.0.176:8089/ws` |
| HTTP WS port from overview | `8088` |
| HTTPS/WSS port from overview | `8089` |
| RTP range from overview | `10000-10500` |

## Existing WebRTC Requirements

The PRM overview says the existing Asterisk WebRTC endpoints depend on:

- `webrtc = yes`
- `bundle = yes`
- `rtcp_mux = yes`
- `ice_support = yes`
- DTLS media encryption
- Opus audio
- VP8/H264 video support

The POC assumes those already exist and does not change them.

## Totem POC Defaults

| Field | Default |
| --- | --- |
| Totem SIP ID | `totem-001` |
| Totem SIP password | `totem001` |
| Asterisk WSS | `wss://192.168.0.176:8089/ws` |
| Target operator | `op-002` |

The Totem-side SIP panel registers as the existing totem endpoint and can manually call the operator extension through the existing `prm-calls` dialplan.

## Operator POC Defaults

| Field | Default |
| --- | --- |
| Operator SIP ID | `op-002` |
| Operator SIP password | `op-002` |
| Asterisk WSS | `wss://192.168.0.176:8089/ws` |

The Operator-side POC registers as the existing operator endpoint and waits for incoming SIP/WebRTC calls.

## Minimal Test Shape

1. Register Operator POC as `op-002`.
2. Register Totem POC as `totem-001`.
3. From Totem POC, call `op-002`.
4. From Operator POC, answer the incoming call.
5. Confirm local and remote audio/video appear.

The mode switch keeps both POC screens mounted so registration can stay active while switching between Totem and Operator views.

## Certificate Risk

The existing Asterisk WSS endpoint may use a self-signed certificate. If Tauri/WebKitGTK rejects the WSS connection, the test has found a migration issue. Do not solve that by changing Asterisk from this POC.
