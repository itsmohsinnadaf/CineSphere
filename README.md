# 🎬 Cinesphere

> Also internally referred to as **MyDriveFlix**

Cinesphere is a modern, full-stack streaming platform that uses **Microsoft OneDrive** (via the Microsoft Graph API) as its cloud storage and streaming backend. It pairs a sleek **React** frontend with a powerful **Node.js** backend capable of on-the-fly video remuxing, subtitle extraction, and bulk downloads — turning your OneDrive into a personal Netflix-style media server.

---

## ✨ Features

### Frontend (`/Cinesphere`)
- **Dynamic Navigation** — Browse from `Root Folders → Categories/Genres → Movies`, or `Series → Seasons → Episodes`.
- **Custom Video Player** — Built-in support for audio track switching and subtitle rendering.
- **Global Search** — Press `/` anywhere in the app to instantly jump to a movie, series, or video.
- **Modern UI** — Custom animations (`AnimateIn`), custom cursors, and floating particle effects.
- **Centralized State** — All core logic and API calls are managed through the `useLibrary` hook.

### Backend (`/backend`)
- **Microsoft Graph Integration** — Uses OAuth2 Client Credentials flow to securely access a OneDrive folder with no end-user login required.
- **Smart Caching** — A 5-minute in-memory cache (`_browseCache`) reduces redundant Graph API calls.
- **Smart File Parsing** — Auto-detects video files, pairs them with posters/cover images from the same folder, and intelligently sorts episodes (e.g., "Episode 2" before "Episode 10").
- **Audio Remuxing** — Switch audio tracks (e.g., English → Hindi) on the fly using `-c copy`, avoiding re-encoding for low CPU usage.
- **Audio-Only Streaming** — Preload alternate audio languages instantly.
- **Subtitle Extraction** — Probes MKV/MP4 files for embedded subtitles (SRT, ASS, etc.), converts them to WebVTT, and caches the results.
- **Bulk Downloads** — Recursively zips and streams an entire folder's video contents via `archiver`.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + Vite |
| Routing | react-router-dom |
| Styling/UI | Vanilla CSS (custom animations, effects), react-icons |
| Backend Framework | Express.js |
| Media Processing | fluent-ffmpeg, @ffmpeg-installer/ffmpeg, @ffprobe-installer/ffprobe |
| Storage Backend | Microsoft OneDrive (Microsoft Graph API) |
| Utilities | archiver, node-fetch |

---

## 📁 Project Structure

```
Cinesphere/
├── backend/
│   ├── graphClient.js      # Handles all Microsoft Graph API logic, auth, and caching
│   ├── server.js           # Express API with routes for browse, stream, subtitles, download
│   └── package.json        # Node dependencies (ffmpeg, archiver, etc.)
│
└── Cinesphere/             # Frontend Application
    ├── src/
    │   ├── api/            # API integration functions
    │   ├── components/     # UI Components (cards, folders, player, common layout)
    │   ├── hooks/          # Custom React hooks (useLibrary for state management)
    │   ├── styles/         # CSS stylesheets
    │   ├── App.jsx         # Main application component & routing logic
    │   └── main.jsx        # React entry point
    ├── vite.config.js      # Vite build configuration
    └── package.json        # Frontend dependencies (React 19)
```

---

## ⚙️ Environment Variables

Create a `.env` file inside `/backend` with the following variables:

| Variable | Description |
|---|---|
| `GRAPH_TENANT_ID` | Microsoft Entra (Azure AD) Tenant ID |
| `GRAPH_CLIENT_ID` | App Registration Client ID |
| `GRAPH_CLIENT_SECRET` | App Registration Client Secret |
| `GRAPH_USER` | Email/UPN of the OneDrive user hosting the content |
| `GRAPH_FOLDER_PATH` | Root folder in the OneDrive (e.g., `MyStreamingLibrary`) |
| `PORT` | Server port (defaults to `4000`) |
| `FRONTEND_ORIGIN` | Allowed CORS origin (e.g., production Netlify URL) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS recommended)
- A Microsoft Entra (Azure AD) App Registration with Microsoft Graph API permissions
- A OneDrive account with your media library organized in a root folder

### Backend Setup
```bash
cd backend
npm install
# Create and configure your .env file (see above)
npm start
```

### Frontend Setup
```bash
cd Cinesphere
npm install
npm run dev
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/browse?path=...` | Fetches folders, videos, and posters for a given OneDrive path |
| `GET` | `/api/stream?path=...&audio=1` | Streams the video while remuxing a specific audio track index |
| `GET` | `/api/probe?path=...` | Returns a JSON list of all available audio and text-based subtitle tracks in a video container (via ffprobe) |
| `GET` | `/api/subtitles?path=...&track=0` | Extracts a subtitle track and returns it as a WebVTT file |
| `GET` | `/api/download?path=...` | Generates and streams a ZIP file of all videos inside a directory tree |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to open a pull request or issue to discuss any changes.
