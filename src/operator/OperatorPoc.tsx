import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import JsSIP from "jssip";
import { Camera, CheckCircle2, LogOut, Mic, PhoneCall, PhoneOff, RefreshCw, RadioTower, XCircle } from "lucide-react";

type DeviceInfo = {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
};

type TestStatus = "idle" | "running" | "ok" | "error";

type LogEntry = {
  time: string;
  message: string;
};

type IncomingSession = {
  answer: (options: Record<string, unknown>) => void;
  terminate: () => void;
  connection?: RTCPeerConnection;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

const DEFAULT_ASTERISK_WSS = "wss://192.168.0.176:8089/ws";
const DEFAULT_OPERATOR_ID = "op-002";
const DEFAULT_OPERATOR_PASSWORD = "op-002";

function now() {
  return new Date().toLocaleTimeString();
}

function deviceName(device: MediaDeviceInfo, index: number, fallback: string) {
  return device.label || `${fallback} ${index + 1}`;
}

function sipDomainFromWss(wssUrl: string) {
  try {
    return new URL(wssUrl).hostname;
  } catch {
    return "192.168.0.176";
  }
}

export function OperatorPoc() {
  const [asteriskWssUrl, setAsteriskWssUrl] = useState(DEFAULT_ASTERISK_WSS);
  const [operatorId, setOperatorId] = useState(DEFAULT_OPERATOR_ID);
  const [sipPassword, setSipPassword] = useState(DEFAULT_OPERATOR_PASSWORD);
  const [devices, setDevices] = useState<DeviceInfo>({ cameras: [], microphones: [] });
  const [cameraId, setCameraId] = useState("");
  const [microphoneId, setMicrophoneId] = useState("");
  const [mediaStatus, setMediaStatus] = useState<TestStatus>("idle");
  const [registrationStatus, setRegistrationStatus] = useState<TestStatus>("idle");
  const [callStatus, setCallStatus] = useState<TestStatus>("idle");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const uaRef = useRef<unknown>(null);
  const incomingSessionRef = useRef<IncomingSession | null>(null);

  const log = useCallback((message: string) => {
    setLogs((items) => [{ time: now(), message }, ...items].slice(0, 24));
  }, []);

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const enumerateDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    const nextDevices = {
      cameras: all.filter((device) => device.kind === "videoinput"),
      microphones: all.filter((device) => device.kind === "audioinput"),
    };

    setDevices(nextDevices);
    setCameraId((current) => current || nextDevices.cameras[0]?.deviceId || "");
    setMicrophoneId((current) => current || nextDevices.microphones[0]?.deviceId || "");
    log(`Detected ${nextDevices.cameras.length} camera(s), ${nextDevices.microphones.length} microphone(s).`);
  }, [log]);

  const requestMedia = useCallback(async () => {
    setError("");
    setMediaStatus("running");

    try {
      stopStream(localStreamRef.current);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneId ? { deviceId: { exact: microphoneId } } : true,
        video: cameraId
          ? {
              deviceId: { exact: cameraId },
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
      setMediaStatus("ok");
      log("Operator camera and microphone ready.");
      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to access operator camera or microphone.";
      setError(message);
      setMediaStatus("error");
      log(`Operator media failed: ${message}`);
      return null;
    }
  }, [cameraId, enumerateDevices, log, microphoneId, stopStream]);

  const bindSessionMedia = useCallback(
    (session: IncomingSession) => {
      const connection = session.connection;
      if (!connection) {
        return;
      }

      connection.addEventListener("track", (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
          log("Remote totem media attached.");
        }
      });
    },
    [log],
  );

  const registerOperator = useCallback(async () => {
    setError("");
    setRegistrationStatus("running");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("navigator.mediaDevices.getUserMedia is not available in this WebView.");
      }

      await requestMedia();

      const sipDomain = sipDomainFromWss(asteriskWssUrl);
      const socket = new JsSIP.WebSocketInterface(asteriskWssUrl.trim());
      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${operatorId.trim()}@${sipDomain}`,
        authorization_user: operatorId.trim(),
        password: sipPassword,
        display_name: "Tauri Operator POC",
        register: true,
        session_timers: false,
      });

      ua.on("connected", () => log("Connected to existing Asterisk WebSocket."));
      ua.on("disconnected", () => {
        setRegistrationStatus("idle");
        log("Asterisk WebSocket disconnected.");
      });
      ua.on("registered", () => {
        setRegistrationStatus("ok");
        log(`Registered as ${operatorId.trim()} on existing Asterisk.`);
      });
      ua.on("registrationFailed", (event: { cause?: string }) => {
        setRegistrationStatus("error");
        const message = event.cause || "SIP registration failed.";
        setError(message);
        log(`SIP registration failed: ${message}`);
      });
      ua.on("newRTCSession", (event: { originator: string; session: IncomingSession }) => {
        const { originator, session } = event;

        if (originator !== "remote") {
          return;
        }

        incomingSessionRef.current = session;
        setCallStatus("running");
        log("Incoming SIP/WebRTC call from totem.");

        session.on("peerconnection", () => bindSessionMedia(session));
        session.on("accepted", () => {
          bindSessionMedia(session);
          setCallStatus("ok");
          log("Operator call accepted.");
        });
        session.on("confirmed", () => {
          setCallStatus("ok");
          log("Operator call confirmed.");
        });
        session.on("ended", () => {
          incomingSessionRef.current = null;
          setCallStatus("idle");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          log("Operator call ended.");
        });
        session.on("failed", (_event: unknown) => {
          incomingSessionRef.current = null;
          setCallStatus("error");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          log("Operator call failed.");
        });
      });

      uaRef.current = ua;
      ua.start();
      log(`Starting SIP registration through ${asteriskWssUrl.trim()}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to register operator.";
      setError(message);
      setRegistrationStatus("error");
      log(`Operator registration failed: ${message}`);
    }
  }, [asteriskWssUrl, bindSessionMedia, log, operatorId, requestMedia, sipPassword]);

  const unregisterOperator = useCallback(() => {
    const ua = uaRef.current as { stop?: () => void } | null;
    ua?.stop?.();
    uaRef.current = null;
    setRegistrationStatus("idle");
    log("Operator registration stopped locally.");
  }, [log]);

  const answerCall = useCallback(async () => {
    const session = incomingSessionRef.current;
    if (!session) {
      log("No incoming call to answer.");
      return;
    }

    const stream = localStreamRef.current ?? (await requestMedia());
    if (!stream) {
      return;
    }

    session.answer({
      mediaStream: stream,
      mediaConstraints: { audio: true, video: true },
      pcConfig: { iceServers: [] },
    });
    bindSessionMedia(session);
    setCallStatus("ok");
    log("Answer sent to existing Asterisk call.");
  }, [bindSessionMedia, log, requestMedia]);

  const hangupCall = useCallback(() => {
    incomingSessionRef.current?.terminate();
    incomingSessionRef.current = null;
    setCallStatus("idle");
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    log("Operator call terminated locally.");
  }, [log]);

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
      incomingSessionRef.current?.terminate();
      const ua = uaRef.current as { stop?: () => void } | null;
      ua?.stop?.();
      stopStream(localStreamRef.current);
    };
  }, [enumerateDevices, log, stopStream]);

  return (
    <>
      <section className="topbar">
        <div>
          <p className="eyebrow">Operator-side Tauri validation</p>
          <h1>Existing Asterisk SIP/WebRTC POC</h1>
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

      <section className="notice">
        <RadioTower size={18} />
        <span>This screen only registers to the existing Asterisk server when Register is clicked. It does not change Asterisk config.</span>
      </section>

      <section className="grid">
        <Panel title="Existing Asterisk registration" icon={<RadioTower size={18} />} status={registrationStatus}>
          <div className="field">
            <label htmlFor="asterisk-wss">Asterisk WSS URL</label>
            <input id="asterisk-wss" value={asteriskWssUrl} onChange={(event) => setAsteriskWssUrl(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="operator-id">Operator SIP ID</label>
            <input id="operator-id" value={operatorId} onChange={(event) => setOperatorId(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="sip-password">SIP password</label>
            <input id="sip-password" type="password" value={sipPassword} onChange={(event) => setSipPassword(event.target.value)} />
          </div>

          <div className="actions">
            <button className="primaryButton" type="button" onClick={registerOperator}>
              <PhoneCall size={18} />
              Register
            </button>
            <button className="secondaryButton" type="button" onClick={unregisterOperator}>
              <LogOut size={16} />
              Unregister
            </button>
          </div>
        </Panel>

        <Panel title="Operator media" icon={<Camera size={18} />} status={mediaStatus}>
          <div className="field">
            <label htmlFor="operator-camera">Camera</label>
            <select id="operator-camera" value={cameraId} onChange={(event) => setCameraId(event.target.value)}>
              {devices.cameras.length === 0 ? <option value="">No camera detected</option> : null}
              {devices.cameras.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {deviceName(device, index, "Camera")}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="operator-microphone">Microphone</label>
            <select id="operator-microphone" value={microphoneId} onChange={(event) => setMicrophoneId(event.target.value)}>
              {devices.microphones.length === 0 ? <option value="">No microphone detected</option> : null}
              {devices.microphones.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {deviceName(device, index, "Microphone")}
                </option>
              ))}
            </select>
          </div>

          <button className="primaryButton" type="button" onClick={requestMedia}>
            <Mic size={18} />
            Start operator media
          </button>
        </Panel>

        <Panel title="Incoming call" icon={<PhoneCall size={18} />} status={callStatus}>
          <div className="videoGrid">
            <VideoFrame label="Operator local preview" ref={localVideoRef} muted />
            <VideoFrame label="Remote totem media" ref={remoteVideoRef} />
          </div>

          <div className="actions">
            <button className="primaryButton" type="button" onClick={answerCall} disabled={callStatus !== "running"}>
              <PhoneCall size={18} />
              Answer
            </button>
            <button className="secondaryButton" type="button" onClick={hangupCall}>
              <PhoneOff size={16} />
              Hang up
            </button>
          </div>
        </Panel>

        <Panel title="Operator log" icon={<CheckCircle2 size={18} />} status="idle">
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
}: {
  title: string;
  icon: ReactNode;
  status: TestStatus;
  children: ReactNode;
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

function StatusBadge({ status }: { status: TestStatus }) {
  return <span className={`status status-${status}`}>{status}</span>;
}

const VideoFrame = forwardRef<HTMLVideoElement, { label: string; muted?: boolean }>(({ label, muted }, ref) => (
  <figure className="videoFrame">
    <video ref={ref} autoPlay playsInline muted={muted} />
    <figcaption>{label}</figcaption>
  </figure>
));

VideoFrame.displayName = "VideoFrame";
