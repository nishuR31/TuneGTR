# 🎸 TunerGTR Pro

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-764ABC?style=for-the-badge&logo=react&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)

A high-performance, real-time guitar tuner application — **TuneGTR** — built with React Native and Expo. It features a highly responsive UI, advanced pitch detection algorithms, and robust tuning capabilities for both standard and alternative tunings.

## ✨ Features

- **Accurate Pitch Detection:** Uses an optimized YIN algorithm to capture frequencies in real-time with high precision.
- **Responsive Wave Visualizer:** A beautiful, buttery-smooth SVG waveform that reacts dynamically to the audio RMS (amplitude).
- **Responsive Layout:** Works flawlessly in both Portrait and Landscape orientations, elegantly adapting to mobile and tablet screens.
- **Directional Semantics:** Clear visual feedback indicating whether a string is flat (↑ TUNE UP) or sharp (↓ TUNE DOWN).
- **Extensive Tuning Support:** Built-in standard and alternative tuning presets, alongside full Capo support to transpose target frequencies.

## 🛠️ Architecture

This repository is structured as a **Monorepo** using Bun workspaces:

- `apps/mobile/`: The main React Native / Expo application containing the UI and business logic.
- `packages/tuner-core/`: A decoupled, pure TypeScript library that houses the core DSP (Digital Signal Processing) components, such as the `YinDetector` and `StabilityFilter`.
- `packages/music-core/`: A domain logic library for handling musical math, frequency conversion, and pitch classes.

## 🧠 Core Technologies

- **Frontend:** React Native, Expo (Audio, Linear Gradient, Haptics)
- **Animations:** React Native Reanimated, React Native SVG
- **State Management:** Zustand
- **Pitch Detection:** YIN Algorithm (implemented in standard TypeScript / Float32Array)
