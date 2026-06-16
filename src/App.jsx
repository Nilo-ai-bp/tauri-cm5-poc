import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import JsSIP from "jssip";
import {
  Camera,
  CheckCircle2,
  Headphones,
  LogOut,
  Mic,
  MonitorPlay,
  Phone,
  PhoneCall,
  PhoneOff,
  QrCode,
  RadioTower,
  RefreshCw,
  ScreenShare,
  Square,
  XCircle,
} from "lucide-react";
import { OperatorPoc } from "./operator/OperatorPoc.jsx";

const emptyDevices = {
  cameras: [],
  microphones: [],
  speakers: [],
};

const DEFAULT_ASTERISK_WSS = "wss://192.168.0.176:8089/ws";
const DEFAULT_TOTEM_ID = "totem-001";
const DEFAULT_TOTEM_PASSWORD = "totem001";
const DEFAULT_OPERATOR_EXTENSION = "op-002";

function now() {
  return new Date().toLocaleTimeString();
}

function deviceName(device, index, fallback) {
  return device.label || `${fallback} ${index + 1}`;
}

function sipDomainFromWss(wssUrl) {
  try {
    return new URL(wssUrl).hostname;
  } catch {
    return "192.168.0.176";
  }
}

export function App() {
  const [mode, setMode] = useState("totem");

  return (
    <main className="shell">
      <section className="modeBar" aria-label="POC mode">
        <button className={mode === "totem" ? "modeButton active" : "modeButton"} type="button" onClick={() => setMode("totem")}>
          <ScreenShare size={18} />
          Totem CM5
        </button>
        <button className={mode === "operator" ? "modeButton active" : "modeButton"} type="button" onClick={() => setMode("operator")}>
          <Headphones size={18} />
          Operator SIP
        </button>
      </section>
      <div className={mode === "totem" ? "modePane" : "modePane hidden"} aria-hidden={mode !== "totem"}>
        <TotemPoc />
      </div>
      <div className={mode === "operator" ? "modePane" : "modePane hidden"} aria-hidden={mode !== "operator"}>
        <OperatorPoc />
      </div>
    </main>
  );
}

function TotemPoc() {
  const [devices, setDevices] = useState(emptyDevices);
  const [videoCameraId, setVideoCameraId] = useState("");
  const [scannerCameraId, setScannerCameraId] = useState("");
  const [microphoneId, setMicrophoneId] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [permissionStatus, setPermissionStatus] = useState("idle");
  const [callStatus, setCallStatus] = useState("idle");
  const [sipRegistrationStatus, setSipRegistrationStatus] = useState("idle");
  const [sipCallStatus, setSipCallStatus] = useState("idle");
  const [qrStatus, setQrStatus] = useState("idle");
  const [qrText, setQrText] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [asteriskWssUrl, setAsteriskWssUrl] = useState(DEFAULT_ASTERISK_WSS);
  const [totemSipId, setTotemSipId] = useState(DEFAULT_TOTEM_ID);
  const [totemSipPassword, setTotemSipPassword] = useState(DEFAULT_TOTEM_PASSWORD);
  const [operatorExtension, setOperatorExtension] = useState(DEFAULT_OPERATOR_EXTENSION);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const qrVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const qrControlsRef = useRef(null);
  const peersRef = useRef([]);
  const totemUaRef = useRef(null);
  const totemSipSessionRef = useRef(null);

  const log = useCallback((message) => {
    setLogs((items) => [{ time: now(), message }, ...items].slice(0, 20));
  }, []);

  const stopStream = useCallback((stream) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const enumerateDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    const nextDevices = {
      cameras: all.filter((device) => device.kind === "videoinput"),
      microphones: all.filter((device) => device.kind === "audioinput"),
      speakers: all.filter((device) => device.kind === "audiooutput"),
    };

    const preferredVideoCamera =
      nextDevices.cameras.find((device) => device.label.toLowerCase().includes("c922")) ?? nextDevices.cameras[0];
    const preferredScannerCamera =
      nextDevices.cameras.find((device) => device.label.toLowerCase().includes("c920")) ??
      nextDevices.cameras.find((device) => device.deviceId !== preferredVideoCamera?.deviceId) ??
      nextDevices.cameras[0];

    setDevices(nextDevices);
    setVideoCameraId((current) => current || preferredVideoCamera?.deviceId || "");
    setScannerCameraId((current) => current || preferredScannerCamera?.deviceId || "");
    setMicrophoneId((current) => current || nextDevices.microphones[0]?.deviceId || "");
    setSpeakerId((current) => current || nextDevices.speakers[0]?.deviceId || "");
    log(
      `Detected ${nextDevices.cameras.length} camera(s), ${nextDevices.microphones.length} microphone(s), ${nextDevices.speakers.length} output(s).`,
    );
  }, [log]);

  const requestMedia = useCallback(async () => {
    setError("");
    setPermissionStatus("running");

    try {
      stopStream(localStreamRef.current);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneId ? { deviceId: { exact: microphoneId } } : true,
        video: videoCameraId
          ? {
              deviceId: { exact: videoCameraId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      await enumerateDevices();
      setPermissionStatus("ok");
      log("Camera and microphone permission granted.");
      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to access camera or microphone.";
      setError(message);
      setPermissionStatus("error");
      log(`Media permission failed: ${message}`);
      return null;
    }
  }, [enumerateDevices, log, microphoneId, stopStream, videoCameraId]);

  const stopCall = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current = [];

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setCallStatus("idle");
    log("Loopback WebRTC call stopped.");
  }, [log]);

  const bindSipSessionMedia = useCallback(
    (session) => {
      const connection = session.connection;
      if (!connection) {
        return;
      }

      connection.addEventListener("track", (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
          log("Remote operator media attached from Asterisk call.");
        }
      });
    },
    [log],
  );

  const startLoopbackCall = useCallback(async () => {
    setError("");
    setCallStatus("running");

    try {
      if (!localStreamRef.current) {
        await requestMedia();
      }

      const stream = localStreamRef.current;
      if (!stream) {
        throw new Error("No local media stream is available.");
      }

      stopCall();
      setCallStatus("running");

      const caller = new RTCPeerConnection();
      const receiver = new RTCPeerConnection();
      peersRef.current = [caller, receiver];

      caller.onicecandidate = (event) => {
        if (event.candidate) {
          receiver.addIceCandidate(event.candidate);
        }
      };

      receiver.onicecandidate = (event) => {
        if (event.candidate) {
          caller.addIceCandidate(event.candidate);
        }
      };

      receiver.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      stream.getTracks().forEach((track) => caller.addTrack(track, stream));

      const offer = await caller.createOffer();
      await caller.setLocalDescription(offer);
      await receiver.setRemoteDescription(offer);

      const answer = await receiver.createAnswer();
      await receiver.setLocalDescription(answer);
      await caller.setRemoteDescription(answer);

      setCallStatus("ok");
      log("Local WebRTC loopback call connected.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start loopback call.";
      setError(message);
      setCallStatus("error");
      log(`WebRTC loopback failed: ${message}`);
    }
  }, [log, requestMedia, stopCall]);

  const registerTotemSip = useCallback(async () => {
    setError("");
    setSipRegistrationStatus("running");

    try {
      if (!localStreamRef.current) {
        await requestMedia();
      }

      const sipDomain = sipDomainFromWss(asteriskWssUrl);
      const socket = new JsSIP.WebSocketInterface(asteriskWssUrl.trim());
      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${totemSipId.trim()}@${sipDomain}`,
        authorization_user: totemSipId.trim(),
        password: totemSipPassword,
        display_name: "Tauri Totem POC",
        register: true,
        session_timers: false,
      });

      ua.on("connected", () => log("Totem connected to existing Asterisk WebSocket."));
      ua.on("disconnected", () => {
        setSipRegistrationStatus("idle");
        log("Totem Asterisk WebSocket disconnected.");
      });
      ua.on("registered", () => {
        setSipRegistrationStatus("ok");
        log(`Totem registered as ${totemSipId.trim()} on existing Asterisk.`);
      });
      ua.on("registrationFailed", (event) => {
        const message = event.cause || "Totem SIP registration failed.";
        setError(message);
        setSipRegistrationStatus("error");
        log(`Totem SIP registration failed: ${message}`);
      });
      ua.on("newRTCSession", (event) => {
        const session = event.session;
        totemSipSessionRef.current = session;
        bindSipSessionMedia(session);

        session.on("peerconnection", () => bindSipSessionMedia(session));
        session.on("accepted", () => {
          bindSipSessionMedia(session);
          setSipCallStatus("ok");
          log("Totem Asterisk call accepted.");
        });
        session.on("confirmed", () => {
          setSipCallStatus("ok");
          log("Totem Asterisk call confirmed.");
        });
        session.on("ended", () => {
          totemSipSessionRef.current = null;
          setSipCallStatus("idle");
          log("Totem Asterisk call ended.");
        });
        session.on("failed", () => {
          totemSipSessionRef.current = null;
          setSipCallStatus("error");
          log("Totem Asterisk call failed.");
        });
      });

      totemUaRef.current = ua;
      ua.start();
      log(`Starting Totem SIP registration through ${asteriskWssUrl.trim()}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to register Totem SIP endpoint.";
      setError(message);
      setSipRegistrationStatus("error");
      log(`Totem SIP registration failed: ${message}`);
    }
  }, [asteriskWssUrl, bindSipSessionMedia, log, requestMedia, totemSipId, totemSipPassword]);

  const unregisterTotemSip = useCallback(() => {
    const ua = totemUaRef.current;
    ua?.stop?.();
    totemUaRef.current = null;
    setSipRegistrationStatus("idle");
    log("Totem SIP registration stopped locally.");
  }, [log]);

  const callOperatorViaAsterisk = useCallback(async () => {
    const ua = totemUaRef.current;

    if (!ua?.call) {
      const message = "Register the Totem SIP endpoint before calling the operator.";
      setError(message);
      log(message);
      return;
    }

    const stream = localStreamRef.current ?? (await requestMedia());
    if (!stream) {
      return;
    }

    const sipDomain = sipDomainFromWss(asteriskWssUrl);
    const session = ua.call(`sip:${operatorExtension.trim()}@${sipDomain}`, {
      mediaStream: stream,
      mediaConstraints: { audio: true, video: true },
      pcConfig: { iceServers: [] },
    });

    totemSipSessionRef.current = session;
    bindSipSessionMedia(session);
    setSipCallStatus("running");
    log(`Calling ${operatorExtension.trim()} through existing Asterisk.`);
  }, [asteriskWssUrl, bindSipSessionMedia, log, operatorExtension, requestMedia]);

  const hangupTotemSipCall = useCallback(() => {
    totemSipSessionRef.current?.terminate();
    totemSipSessionRef.current = null;
    setSipCallStatus("idle");
    log("Totem Asterisk call terminated locally.");
  }, [log]);

  const stopQrScanner = useCallback(() => {
    qrControlsRef.current?.stop();
    qrControlsRef.current = null;

    if (qrVideoRef.current) {
      qrVideoRef.current.srcObject = null;
    }

    setQrStatus("idle");
    log("QR scanner stopped.");
  }, [log]);

  const startQrScanner = useCallback(async () => {
    setError("");
    setQrText("");
    setQrStatus("running");

    try {
      stopQrScanner();
      setQrStatus("running");

      const reader = new BrowserQRCodeReader();
      qrControlsRef.current = await reader.decodeFromVideoDevice(
        scannerCameraId || undefined,
        qrVideoRef.current ?? undefined,
        (result, scanError) => {
          if (result) {
            const text = result.getText();
            setQrText(text);
            setQrStatus("ok");
            log(`QR decoded: ${text}`);
          }

          if (scanError && scanError.name !== "NotFoundException") {
            log(`QR scan warning: ${scanError.message}`);
          }
        },
      );

      log("QR scanner started.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start QR scanner.";
      setError(message);
      setQrStatus("error");
      log(`QR scanner failed: ${message}`);
    }
  }, [log, scannerCameraId, stopQrScanner]);

  useEffect(() => {
    const remoteVideo = remoteVideoRef.current;
    const setSinkId = remoteVideo && typeof remoteVideo.setSinkId === "function" ? remoteVideo.setSinkId : null;

    if (!remoteVideo || !setSinkId || !speakerId) {
      return;
    }

    setSinkId
      .call(remoteVideo, speakerId)
      .then(() => log("Remote call output device updated."))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Speaker output selection is not supported.";
        log(`Speaker selection skipped: ${message}`);
      });
  }, [log, speakerId]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("navigator.mediaDevices.getUserMedia is not available in this WebView.");
      return;
    }

    enumerateDevices().catch((err) => {
      const message = err instanceof Error ? err.message : "Device enumeration failed.";
      setError(message);
      log(message);
    });

    return () => {
      stopQrScanner();
      stopCall();
      totemSipSessionRef.current?.terminate();
      const ua = totemUaRef.current;
      ua?.stop?.();
      stopStream(localStreamRef.current);
    };
  }, [enumerateDevices, log, stopCall, stopQrScanner, stopStream]);

  const callReady = permissionStatus === "ok" || Boolean(localStreamRef.current);

  return (
    <>
      <section className="topbar">
        <div>
          <p className="eyebrow">Raspberry Pi CM5 / Debian validation</p>
          <h1>Tauri WebRTC and QR scanner POC</h1>
        </div>
        <button className="iconButton" type="button" onClick={enumerateDevices} title="Refresh devices">
          <RefreshCw size={18} />
        </button>
      </section>

      {error ? (
        <section className="notice errorNotice">
          <XCircle size={18} />
          <span>{error}</span>
        </section>
      ) : null}

      <section className="grid">
        <Panel title="Media devices" icon={<Camera size={18} />} status={permissionStatus}>
          <div className="field">
            <label htmlFor="video-camera">Videocall camera</label>
            <select id="video-camera" value={videoCameraId} onChange={(event) => setVideoCameraId(event.target.value)}>
              {devices.cameras.length === 0 ? <option value="">No camera detected</option> : null}
              {devices.cameras.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {deviceName(device, index, "Camera")}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="scanner-camera">Scanner camera</label>
            <select id="scanner-camera" value={scannerCameraId} onChange={(event) => setScannerCameraId(event.target.value)}>
              {devices.cameras.length === 0 ? <option value="">No camera detected</option> : null}
              {devices.cameras.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {deviceName(device, index, "Camera")}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="microphone">Microphone</label>
            <select id="microphone" value={microphoneId} onChange={(event) => setMicrophoneId(event.target.value)}>
              {devices.microphones.length === 0 ? <option value="">No microphone detected</option> : null}
              {devices.microphones.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {deviceName(device, index, "Microphone")}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="speaker">Speaker</label>
            <select id="speaker" value={speakerId} onChange={(event) => setSpeakerId(event.target.value)}>
              {devices.speakers.length === 0 ? <option value="">Default output</option> : null}
              {devices.speakers.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {deviceName(device, index, "Speaker")}
                </option>
              ))}
            </select>
          </div>

          <button className="primaryButton" type="button" onClick={requestMedia}>
            <Mic size={18} />
            Start camera and mic
          </button>
        </Panel>

        <Panel title="WebRTC call" icon={<Phone size={18} />} status={callStatus}>
          <div className="videoGrid">
            <VideoFrame label="Local preview" ref={localVideoRef} muted />
            <VideoFrame label="Loopback remote" ref={remoteVideoRef} />
          </div>

          <div className="actions">
            <button className="primaryButton" type="button" onClick={startLoopbackCall} disabled={!callReady && permissionStatus === "running"}>
              <MonitorPlay size={18} />
              Start loopback call
            </button>
            <button className="secondaryButton" type="button" onClick={stopCall}>
              <Square size={16} />
              Stop
            </button>
          </div>
        </Panel>

        <Panel title="Existing Asterisk SIP" icon={<RadioTower size={18} />} status={sipRegistrationStatus}>
          <div className="field">
            <label htmlFor="totem-asterisk-wss">Asterisk WSS URL</label>
            <input id="totem-asterisk-wss" value={asteriskWssUrl} onChange={(event) => setAsteriskWssUrl(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="totem-sip-id">Totem SIP ID</label>
            <input id="totem-sip-id" value={totemSipId} onChange={(event) => setTotemSipId(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="totem-sip-password">Totem SIP password</label>
            <input
              id="totem-sip-password"
              type="password"
              value={totemSipPassword}
              onChange={(event) => setTotemSipPassword(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="operator-extension">Operator extension</label>
            <input id="operator-extension" value={operatorExtension} onChange={(event) => setOperatorExtension(event.target.value)} />
          </div>

          <div className="resultBox">
            <span>Call state</span>
            <strong>{sipCallStatus}</strong>
          </div>

          <div className="actions">
            <button className="primaryButton" type="button" onClick={registerTotemSip}>
              <RadioTower size={18} />
              Register totem
            </button>
            <button className="secondaryButton" type="button" onClick={unregisterTotemSip}>
              <LogOut size={16} />
              Unregister
            </button>
          </div>

          <div className="actions">
            <button className="primaryButton" type="button" onClick={callOperatorViaAsterisk} disabled={sipRegistrationStatus !== "ok"}>
              <PhoneCall size={18} />
              Call operator
            </button>
            <button className="secondaryButton" type="button" onClick={hangupTotemSipCall}>
              <PhoneOff size={16} />
              Hang up
            </button>
          </div>
        </Panel>

        <Panel title="QR scanner" icon={<QrCode size={18} />} status={qrStatus}>
          <VideoFrame label="Scanner camera" ref={qrVideoRef} muted />
          <div className="actions">
            <button className="primaryButton" type="button" onClick={startQrScanner}>
              <QrCode size={18} />
              Start scan
            </button>
            <button className="secondaryButton" type="button" onClick={stopQrScanner}>
              <Square size={16} />
              Stop
            </button>
          </div>
          <div className="resultBox">
            <span>Last QR result</span>
            <strong>{qrText || "Waiting for a QR code"}</strong>
          </div>
        </Panel>

        <Panel title="Test log" icon={<CheckCircle2 size={18} />} status="idle">
          <ol className="logList">
            {logs.length === 0 ? <li>No events yet.</li> : null}
            {logs.map((item) => (
              <li key={`${item.time}-${item.message}`}>
                <span>{item.time}</span>
                {item.message}
              </li>
            ))}
          </ol>
        </Panel>
      </section>
    </>
  );
}

function Panel({
  title,
  icon,
  status,
  children,
}) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div className="panelTitle">
          {icon}
          <h2>{title}</h2>
        </div>
        <StatusBadge status={status} />
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ status }) {
  return <span className={`status status-${status}`}>{status}</span>;
}

const VideoFrame = forwardRef(({ label, muted }, ref) => (
  <figure className="videoFrame">
    <video ref={ref} autoPlay playsInline muted={muted} />
    <figcaption>{label}</figcaption>
  </figure>
));

VideoFrame.displayName = "VideoFrame";
