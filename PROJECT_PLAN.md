# Tauri CM5 Proof of Concept - Project Plan

## Objective

Evaluate whether Tauri can replace Electron for the Totem and Operator applications running on Raspberry Pi CM5 and Debian Linux industrial touch PCs.

---

## Success Criteria

The proof of concept will be considered successful if:

* WebRTC video calls work correctly
* Camera access works
* Microphone access works
* Audio playback works
* Touchscreen interaction works
* Fullscreen kiosk mode works
* WebSocket communication works
* Scanner integration is feasible
* CPU and RAM usage are lower than Electron
* The application runs reliably on CM5

---

## Phase 1 - Research

### Goals

Research Tauri suitability for:

* Raspberry Pi CM5
* ARM64 Debian Linux
* WebRTC
* Camera and microphone access
* Audio handling
* Kiosk mode
* Hardware acceleration
* WebSocket communication

### Deliverable

Research report with findings and risks.

---

## Phase 2 - Environment Setup

### Goals

Prepare development environment:

* Rust
* Node.js
* Tauri CLI
* Linux dependencies

### Deliverable

Working Tauri development environment.

---

## Phase 3 - Basic Tauri Application

### Goals

Create a standalone Tauri application with:

* Fullscreen mode
* Touch-friendly UI
* Basic navigation

### Deliverable

Running Tauri application.

---

## Phase 4 - Media Validation

### Goals

Validate:

* Camera access
* Microphone access
* Audio playback
* WebRTC video calls

### Deliverable

Media test report.

---

## Phase 5 - Communication Validation

### Goals

Validate:

* WebSocket connectivity
* Backend communication
* Message exchange

### Deliverable

Communication test report.

---

## Phase 6 - Performance Benchmark

### Goals

Compare Tauri and Electron:

* RAM usage
* CPU usage
* Startup time
* Stability

### Deliverable

Benchmark report.

---

## Phase 7 - CM5 Deployment

### Goals

Deploy on Raspberry Pi CM5 and test:

* Touchscreen
* WebRTC
* Camera
* Audio
* Kiosk mode

### Deliverable

Deployment and validation report.

---

## Final Deliverables

* Source code repository
* Research report
* Benchmark report
* CM5 test report
* Recommendation: Tauri or Electron
