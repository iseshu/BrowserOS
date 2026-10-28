<div align="center">
<img width="693" height="415" alt="BrowserOS Supercharged: The Fast-Path AI Browser" src="https://github.com/user-attachments/assets/8129f9c8-e8f4-4afe-834a-91397121d833" />

<br></br>
<a href="https://github.com/iseshu/BrowserOS/releases/tag/v0.51.2-supercharged"><img src="https://img.shields.io/badge/Release-v0.51.2--supercharged-blue.svg?style=for-the-badge&logo=github" alt="Release" /></a>
<a href="https://github.com/iseshu/BrowserOS/releases/download/v0.51.2-supercharged/BrowserOS-Supercharged-Setup.exe"><img src="https://img.shields.io/badge/Download-Windows_.exe-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Windows Executable" /></a>
<a href="https://github.com/iseshu/BrowserOS/releases/download/v0.51.2-supercharged/BrowserOS-Supercharged-x86_64.AppImage"><img src="https://img.shields.io/badge/Download-Linux_.AppImage-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux AppImage" /></a>
<a href="https://github.com/iseshu/BrowserOS/releases/download/v0.51.2-supercharged/browseros-supercharged-extension.zip"><img src="https://img.shields.io/badge/Download-Chrome_Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Extension" /></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-555?style=for-the-badge" alt="AGPL-3.0" /></a>

<br></br>

# 🚀 BrowserOS Supercharged Edition
### Fast-Path Decision Models (15-50ms) · Live Engine Visualizer · Token & Cost Savings Dashboard

Free · Open Source · 100% Local Execution

</div>

---

## ⚡ 1-Click Standalone Downloads

No compilation, unzipping, or terminal scripts required. Just download and run:

| Platform | Format | Direct Download | Notes |
|:---|:---:|:---:|:---|
| **🪟 Windows** | Standalone `.exe` | [**Download Setup.exe**](https://github.com/iseshu/BrowserOS/releases/download/v0.51.2-supercharged/BrowserOS-Supercharged-Setup.exe) `(138 MB)` | Auto-installs BrowserOS, sets up desktop shortcut with official icon, and launches preloaded with the supercharged engine. |
| **🐧 Linux** | Standalone `.AppImage` | [**Download .AppImage**](https://github.com/iseshu/BrowserOS/releases/download/v0.51.2-supercharged/BrowserOS-Supercharged-x86_64.AppImage) `(217 MB)` | Single portable executable for Ubuntu, Fedora, Arch, Debian, Mint. Double-click to run! |
| **🌐 Any Browser** | Chromium Extension | [**Download Extension .zip**](https://github.com/iseshu/BrowserOS/releases/download/v0.51.2-supercharged/browseros-supercharged-extension.zip) `(6.6 MB)` | Works directly in **Google Chrome, Microsoft Edge, Brave, Arc, and Opera**. |

> Full portable directories and tarballs are also available on the [Releases Page](https://github.com/iseshu/BrowserOS/releases/tag/v0.51.2-supercharged).

---

## 🌟 What's New in the Supercharged Edition?

### 1. ⚡ Dual-Engine Micro-Actions (15-50ms Fast Path)
Traditional browser agents send entire page DOMs back to heavy LLMs (Claude 3.5 Sonnet / GPT-4o) for every minor click or keystroke, resulting in 2–5 second delays and rapid token consumption.

BrowserOS Supercharged routes execution through specialized **Decision Models** (such as Cloudflare Clef or TypeSafe Jev) for low-entropy micro-actions:
- **15–50ms latency** per action instead of 2,000–5,000ms.
- **Smart DOM Pruning**: Cleans script tags, SVGs, styles, and invisible elements before passing to models.
- **Action Memory Cache**: Instant 0ms replay for repeated navigation patterns.

### 2. 👁️ Live "While Doing" Engine Visualizer
Always know which engine is controlling your browser in real-time:
- **`⚡ Decision Model (Clef-flash)`**: Displayed with live execution timer for ultra-fast deterministic actions.
- **`🤖 LLM Planner`**: Displayed when high-level planning and reasoning are active.
- Real-time action counter in sidepanel header and running status banner.

### 3. 💰 Cost & Token Savings Analytics (`/settings/savings`)
Track your ROI directly inside BrowserOS Settings:
- **Estimated Dollars Saved**: Calculated against blended LLM pricing ($12/M tokens).
- **Prompt Tokens Pruned**: Measures DOM optimization efficiency.
- **Completion Tokens Saved**: Direct savings from fast-path micro-actions.
- **Self-Healing Recoveries**: Count of automated element rescues.

### 4. 🎯 Live Element Spotlight & Ghost Cursor
See exactly what your agent is focusing on:
- **Amber Glow Spotlight**: Highlights elements targeted for click interactions.
- **Sky-Blue Glow Spotlight**: Highlights input fields during typing and form filling.
- **Animated Ghost Cursor**: Smoothly moves across the page to show physical action locations.

### 5. 🍪 Autonomous Cookie & GDPR Blaster
No more stalled runs. BrowserOS automatically detects and clicks through OneTrust, Cookiebot, and standard European cookie banners the moment pages load.

### 6. 📜 1-Click Export to Playwright Scripts
Turn any agent session into an automated test script. Click the `<Code2 />` button on any completed session to generate clean, typed TypeScript Playwright code ready for your CI/CD pipeline.

### 7. 🛡️ Self-Healing DOM Engine
Dynamic Single Page Applications (React, Vue, Next.js) constantly detach and re-render DOM nodes. Our self-healing engine automatically:
- Scrolls detached elements into the viewport.
- Recovers invalid node references by recalculating geometry bounding boxes.

---

## 🚀 Quick Start Guide

### Option A: Using the Standalone Executable (Recommended)

#### On Windows:
1. Download [`BrowserOS-Supercharged-Setup.exe`](https://github.com/iseshu/BrowserOS/releases/download/v0.51.2-supercharged/BrowserOS-Supercharged-Setup.exe).
2. Double-click to launch. It will ensure BrowserOS is ready, configure the official icon, and start with all supercharged extensions enabled.

#### On Linux:
1. Download [`BrowserOS-Supercharged-x86_64.AppImage`](https://github.com/iseshu/BrowserOS/releases/download/v0.51.2-supercharged/BrowserOS-Supercharged-x86_64.AppImage).
2. Mark executable and run:
   ```bash
   chmod +x BrowserOS-Supercharged-x86_64.AppImage
   ./BrowserOS-Supercharged-x86_64.AppImage
   ```

---

### Option B: Using in Your Existing Browser (Chrome, Edge, Brave, Arc)

If you already use Chrome or Edge and don't want a separate browser:
1. Download and extract [`browseros-supercharged-extension.zip`](https://github.com/iseshu/BrowserOS/releases/download/v0.51.2-supercharged/browseros-supercharged-extension.zip).
2. Open your browser and navigate to:
   - **Chrome / Brave:** `chrome://extensions`
   - **Edge:** `edge://extensions`
3. Turn on the **Developer mode** toggle (top right).
4. Click **Load unpacked** (top left) and select the extracted folder.
5. The BrowserOS icon will appear in your browser toolbar!

---

## 🛠️ Architecture & Developer Monorepo

```
BrowserOS/
├── packages/browseros/              # Chromium fork + build system (Python)
│   ├── chromium_patches/            # Patches applied to Chromium source
│   ├── build/                       # Build CLI and modules
│   └── resources/                   # High-res icons, entitlements, signing
│
└── packages/browseros-agent/        # Agent platform (TypeScript / Rust / Bun)
    ├── apps/
    │   ├── app/                     # BrowserOS Extension UI (WXT + React)
    │   │   ├── modules/savings/     # 💰 Token & Cost Savings Tracker
    │   │   ├── screens/savings-dashboard/ # 📊 Analytics Dashboard UI
    │   │   └── screens/decision-settings/ # ⚙️ Decision Model Target Config
    │   ├── server/                  # BrowserOS MCP Server + Agent Loop (Bun)
    │   │   └── src/lib/clients/decision/ # ⚡ Decision Client & DOM Pruner
    │   └── claw-server/             # Neo Backend: MCP endpoint (Rust)
    │
    └── packages/                    # Shared TypeScript packages
        ├── browser-core/            # Primitives: Spotlight Cursor & Input
        ├── browser-mcp/             # MCP Tools: decide.ts, extract.ts, act.ts
        └── shared/                  # Decision schemas & contracts
```

### Running Tests Locally
```bash
cd packages/browseros-agent
bun test
```

### Building the Extension
```bash
cd packages/browseros-agent/apps/app
bun run build:dev
```

---

## ⚖️ License & Acknowledgments

- **License:** Open source under the [AGPL-3.0 License](LICENSE).
- **Upstream:** Based on [BrowserOS by browseros-ai](https://github.com/browseros-ai/BrowserOS).
- **Uncompressed Chromium Patches:** Built upon [ungoogled-chromium](https://github.com/ungoogled-software/ungoogled-chromium) and the Chromium Project.
