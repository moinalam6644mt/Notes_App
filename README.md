# 📝 Notes Sync App – Web + Mobile + Sync Backend

A cross-platform **notes app** built with **Next.js** for web, **React Native (Expo)** for mobile, and a **MockAPI-based sync backend**, supporting full **offline-first** functionality with two-way sync.

---

## 📁 Project Structure

```
/web         → Web app (Next.js)
/mobile      → Mobile app (React Native + Expo)
/mock-api    → Shared MockAPI endpoint
README.md    → Setup, architecture, and deliverables
```

---

## 🚀 Setup & Run Instructions

### ✅ Prerequisites

- Node.js: `v18.x` recommended
- npm: `v9+` or Yarn: `v1.22+`
- Git or unzip downloaded code

---

### 📁 Web App (`/web`)

```bash
cd web
npm install
npm run dev
# Visit http://localhost:3000
```

---

### 📱 Mobile App (`/mobile`)

```bash
cd mobile
npm install
npx expo start
# Scan QR code with Expo Go (Android/iOS)
```

> If running on a physical device, ensure your mobile and PC are on the same network.

---

### 🌐 Mock API (`/mock-api`)

Using [MockAPI.io](https://mockapi.io):

```
https://68852bc3f52d34140f694e84.mockapi.io/api/v1/notes/notes
```

✅ Used by **both platforms**  
✅ Supports GET, POST, PUT, DELETE  
✅ No backend server needed

---

## 🧠 Architecture Overview

### ⚙️ State Flow

- Notes are stored in app state + local storage (IndexedDB on web, AsyncStorage on mobile).
- On sync:
  - Local unsynced notes are sent to MockAPI.
  - Remote notes are fetched and merged locally.
- Sync status is tracked per note (`synced` / `local`).

### 🔄 Sync Strategy

- **Two-way sync** on demand or auto (polling).
- Conflict resolution: *"Last write wins"* (based on `updatedAt` timestamp).
- Notes have a `syncStatus` flag for tracking.

### 🗃️ Data Schema

```json
{
  "id": "string",
  "title": "string",
  "body": "string",
  "createdAt": "ISODate",
  "updatedAt": "ISODate",
  "syncStatus": "synced" | "local"
}
```

---

## 📴 Offline Strategy

- Web: Uses `localStorage` or `IndexedDB`
- Mobile: Uses `AsyncStorage`
- UI shows:
  - ✅ `Synced`
  - 🟠 `Local`
- Sync happens manually (via a Sync button) or automatically when back online.
- Fetch requests queued and retried if offline.

---

## ⚖️ Trade-Offs & Improvements

### ✅ What Works
- Stable offline support on both platforms
- Fully shared API
- Conflict-safe sync
- Clean UI/UX for status indicators

### ⚠️ Trade-offs
- No login/auth → any device sees all notes
- MockAPI limits flexibility (e.g., no push sync)
- Basic merge strategy (last write wins)

### 🧠 Improvements (with time)
- Add user authentication
- Migrate to custom Express/Mongo backend
- Real-time sync (WebSockets or Firebase)
- Rich text formatting, tagging

---

## 🛠️ Tech Stack

| Area         | Stack                     |
|--------------|---------------------------|
| Web App      | Next.js, React, Bootstrap |
| Mobile App   | React Native, Expo, AsyncStorage |
| Sync Backend | [MockAPI.io](https://mockapi.io) |
| Icons        | Lucide, Feather, VectorIcons |
| Storage      | localStorage / IndexedDB / AsyncStorage |

### Versions

```bash
Node: v18.17.1
npm: v9.8.1
Yarn (if used): v1.22.x
```

---

## 🎬 Demo Video

🖼️ **[Screen Recording - 5 min](#)** (Upload to Drive / Loom / GitHub and replace link)

Covers:

- Creating a note on Web while offline
- Reconnecting & syncing → visible on mobile
- Offline edit on mobile → synced back to web

---

## ⏱️ Time Log

| Task                | Hours |
|---------------------|-------|
| Initial Setup       | 1.5   |
| Web App Dev         | 3.0   |
| Mobile App Dev      | 3.0   |
| Sync Logic & Storage| 2.5   |
| Debugging & Testing | 2.0   |
| UI Polish           | 1.0   |
| Docs + Recording    | 1.0   |
| **Total**           | **14 hours** |

---

## ✅ Deliverables Checklist

- [x] `/web` – Next.js app
- [x] `/mobile` – Expo/React Native app
- [x] `/mock-api` – Common backend (MockAPI)
- [x] `README.md` – Full setup, architecture, tradeoffs
- [x] Screen recording of offline & sync behavior
- [x] Time log