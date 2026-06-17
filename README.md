<div align="center">

<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/Microsoft%20Graph%20API-0078D4?style=for-the-badge&logo=microsoft&logoColor=white" />
<img src="https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" />

<br/>
<br/>

# 🎬 Cinesphere

**Your OneDrive. Your Cinema.**

A full-stack streaming platform powered by Microsoft OneDrive — browse, stream, and manage your personal media library with a Netflix-like experience, right from the browser.

[Features](#-features) • [Tech Stack](#️-tech-stack) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [API Reference](#-api-reference)

</div>

---

## 📌 Overview

Cinesphere (internally *MyDriveFlix*) transforms a Microsoft OneDrive folder into a fully-featured personal streaming service. It uses the **Microsoft Graph API** for secure cloud access, **FFmpeg** for real-time media processing, and a custom **React 19** frontend for a polished viewing experience — no third-party CDN, no subscription, just your files.

> **Key idea:** Your media lives in OneDrive. Cinesphere streams it intelligently — remuxing audio tracks, extracting subtitles, and serving everything through a clean, responsive UI.

---

## ✨ Features

### 🖥️ Frontend

| Feature | Description |
|---|---|
| **Dynamic Navigation** | Hierarchical browsing: `Root → Genre → Movie` or `Series → Season → Episode` |
| **Custom Video Player** | Native audio track switching and real-time subtitle rendering |
| **Global Search** | Hit `/` anywhere in the app to instantly search across your entire library |
| **Immersive UI** | Custom cursor, floating particle effects, and smooth `AnimateIn` animations |
| **Centralized State** | All API calls and app state managed through the `useLibrary` custom hook |

### ⚙️ Backend

| Feature | Description |
|---|---|
| **Secure Graph Auth** | OAuth2 Client Credentials flow — no user login required |
| **Smart Caching** | 5-minute in-memory cache (`_browseCache`) to minimize redundant Graph API calls |
| **Smart File Parsing** | Auto-detects videos, pairs them with cover images, and sorts episodes naturally (Episode 2 before Episode 10) |
| **Audio Remuxing** | Switches audio tracks on-the-fly using `-c copy` — no re-encoding, minimal CPU usage |
| **Subtitle Extraction** | Probes MKV/MP4 for embedded SRT/ASS subtitles, converts to WebVTT, and caches in memory |
| **Bulk Downloads** | Recursively zips and streams entire folder contents using `archiver` |

---

## 🛠️ Tech Stack

### Frontend
| | Tool |
|---|---|
| Framework | React 19 + Vite |
| Routing | react-router-dom |
| Styling | Vanilla CSS with custom animations & effects |
| Icons | react-icons |

### Backend
| | Tool |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Media Processing | fluent-ffmpeg, @ffmpeg-installer, @ffprobe-installer |
| Cloud Storage | Microsoft OneDrive via Microsoft Graph API |
| Utilities | archiver, node-fetch |

---

## 🏗️ Architecture

```
Cinesphere/
│
├── backend/
│   ├── graphClient.js       # Microsoft Graph API auth, browsing logic & caching
│   ├── server.js            # Express server — browse, stream, subtitles, download routes
│   └── package.json
│
└── Cinesphere/              # React Frontend (SPA)
    ├── src/
    │   ├── api/             # API integration layer
    │   ├── components/      # Cards, folders, video player, layout components
    │   ├── hooks/           # useLibrary — core state & API hook
    │   ├── styles/          # Global & component CSS
    │   ├── App.jsx          # Root component & routing
    │   └── main.jsx         # React entry point
    ├── vite.config.js
    └── package.json
```

### How It Works

```
Browser (React)
     │
     │  HTTP Requests
     ▼
Express Backend
     │
     ├── /api/browse   ──► Microsoft Graph API ──► OneDrive Folder
     │
     ├── /api/stream   ──► Graph API (raw file) ──► FFmpeg Remux ──► MP4 Stream
     │
     ├── /api/probe    ──► FFprobe ──► Track metadata (audio + subtitles)
     │
     ├── /api/subtitles──► FFmpeg Extract ──► WebVTT ──► Browser
     │
     └── /api/download ──► Archiver ──► ZIP Stream ──► Browser
```

---

## ⚙️ Environment Variables

Create a `.env` file inside `/backend`:

```env
# Microsoft Entra (Azure AD) Configuration
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret

# OneDrive Target
GRAPH_USER=user@yourdomain.com
GRAPH_FOLDER_PATH=MyStreamingLibrary

# Server
PORT=4000
FRONTEND_ORIGIN=https://your-frontend-url.netlify.app
```

| Variable | Description |
|---|---|
| `GRAPH_TENANT_ID` | Microsoft Entra (Azure AD) Tenant ID |
| `GRAPH_CLIENT_ID` | App Registration Client ID |
| `GRAPH_CLIENT_SECRET` | App Registration Client Secret |
| `GRAPH_USER` | Email/UPN of the OneDrive user hosting the content |
| `GRAPH_FOLDER_PATH` | Root folder path in OneDrive |
| `PORT` | Backend server port (default: `4000`) |
| `FRONTEND_ORIGIN` | Allowed CORS origin for the frontend |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** LTS or later
- A **Microsoft Entra (Azure AD)** App Registration with `Files.Read` Graph API permissions
- A **OneDrive** account with media organized under a root folder

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cinesphere.git
cd cinesphere
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # Fill in your credentials
npm start
```

### 3. Frontend Setup

```bash
cd Cinesphere
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:4000`.

---

## 📡 API Reference

Base URL: `http://localhost:4000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/browse?path=<path>` | Lists folders, videos, and poster images for a given OneDrive path |
| `GET` | `/api/stream?path=<path>&audio=<index>` | Streams a video, remuxing the specified audio track index |
| `GET` | `/api/probe?path=<path>` | Returns all available audio and subtitle track metadata (via FFprobe) |
| `GET` | `/api/subtitles?path=<path>&track=<index>` | Extracts a subtitle track and serves it as WebVTT |
| `GET` | `/api/download?path=<path>` | Streams a ZIP archive of all videos in the specified directory |

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m 'Add your feature'`
4. Push to the branch — `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  Built with ❤️ — turning OneDrive into your personal cinema.
</div>
