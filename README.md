# 🔬 Virtual Lab — Collaborative 2D Physics Sandbox

> A real-time, multi-user physics simulation platform built as an engineering capstone project. Virtual Lab provides a "Digital Twin" environment where students and engineers can build machines, test structural mechanics, and observe physics forces collaboratively in real time.

**Mentor:** PRAJIT R  

---

## ✨ Features

| Feature | Description |
|---|---|
| **Real-Time Physics** | Powered by Matter.js — rigid body dynamics, gravity, friction, restitution |
| **Multiplayer Sync** | Socket.io enables live multi-user rooms; all objects sync across clients in real time |
| **JWT Authentication** | Secure signup/login with bcrypt password hashing and JSON Web Token sessions |
| **Room System** | Create private experiment rooms with unique 6-character codes; share via link |
| **Physics Objects** | Spawn boxes and circles with configurable mass, friction, and restitution |
| **Connectors** | Springs, Ropes, Rigid Rods, Pivot points, and motorized gear systems |
| **Vector Visualization** | Toggle velocity vectors, gravity force arrows, and wireframe mode |
| **Live Analytics** | Real-time telemetry panel showing FPS, object velocity, and kinetic energy |
| **Material Properties** | Adjust restitution, friction, density, and constraint length via sliders |
| **Undo / Delete** | Ctrl+Z undo, Backspace/Delete key or UI button to remove selected objects |
| **MongoDB Persistence** | Save and load full simulation states (bodies + constraints) to the cloud |
| **My Experiments** | Per-user private experiment library — only you can see your saved rooms |
| **Access Control** | Lab is inaccessible without authentication; rooms are private by default |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite** — fast modern SPA framework
- **Matter.js** — 2D rigid body physics engine
- **Socket.io-client** — real-time WebSocket communication
- **TailwindCSS v4** — utility-first styling
- **React Router v6** — client-side routing
- **Lucide React** — icon library

### Backend
- **Node.js** + **Express** — REST API server
- **Socket.io** — WebSocket server for real-time sync
- **MongoDB** + **Mongoose** — cloud database via MongoDB Atlas
- **bcryptjs** — secure password hashing
- **jsonwebtoken** — JWT-based session authentication

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js v18+ and npm
- A MongoDB Atlas account (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/shivamshahktp/Virtual_lab.git
cd Virtual_lab
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/virtuallab
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5001
```

Start the backend server:

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend will start on **http://localhost:5001**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on **http://localhost:5173**

---

## 📁 Project Structure

```
Virtual_lab/
├── backend/
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── models/
│   │   ├── User.js           # User schema (username, email, hashed password)
│   │   └── Room.js           # Room schema (bodies, constraints, ownerId)
│   ├── routes/
│   │   ├── auth.js           # POST /api/auth/signup, /api/auth/login
│   │   └── rooms.js          # CRUD endpoints for rooms
│   └── server.js             # Express + Socket.io server entry point
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── PhysicsCanvas.jsx   # Core Matter.js simulation + vector overlays
│       │   ├── Toolbar.jsx         # Object placement and tool selector
│       │   ├── MaterialPicker.jsx  # Physics property sliders
│       │   ├── AnalyticsPanel.jsx  # Live telemetry dashboard
│       │   ├── Navbar.jsx          # Global navigation
│       │   └── Lobby.jsx           # Room creation / join UI
│       ├── context/
│       │   └── AuthContext.jsx     # Global JWT auth state (React Context)
│       ├── pages/
│       │   ├── Home.jsx            # Landing page
│       │   ├── LabRoom.jsx         # Main workspace (authenticated)
│       │   ├── SignUp.jsx          # Registration page
│       │   ├── SignIn.jsx          # Login page
│       │   ├── MyExperiments.jsx   # User's saved rooms dashboard
│       │   └── About.jsx           # Project info page
│       ├── socket.js               # Singleton Socket.io client
│       └── App.jsx                 # Route definitions
└── README.md
```

---

## 🔐 Authentication Flow

1. User registers at `/signup` — password is hashed with **bcrypt** (salt rounds: 10)
2. Server stores user in MongoDB and returns a **JWT token**
3. Token is persisted in `localStorage` and sent as `Authorization: Bearer <token>` on protected requests
4. **All lab routes** (`/room/:id`, `/my-experiments`) are protected — unauthenticated users are redirected to `/signin`
5. Room creation is server-side protected via JWT middleware

---

## 🤝 Real-Time Collaboration

Rooms use Socket.io with the following event flow:

| Event | Direction | Purpose |
|---|---|---|
| `join-room` | Client → Server | User joins a room namespace |
| `physics-update` | Client ↔ Server | Broadcast body positions at ~20fps |
| `add-body` | Client → Server | Sync newly spawned objects |
| `remove-body` | Client → Server | Sync object deletion |
| `add-constraint` | Client → Server | Sync new springs/ropes/rods |
| `remove-constraint` | Client → Server | Sync constraint deletion |
| `clear-canvas` | Client → Server | Sync full canvas reset |
| `user-joined` / `user-left` | Server → Client | Update online user count |

---

## 📸 Screenshots

> See the demo video for a full walkthrough of all features.

---

## 👥 Team

Developed by engineering students as part of a capstone project on interactive physics simulation and real-time collaborative systems.

**Mentor:** PRAJIT R

---

## 📄 License

This project is for educational purposes. All rights reserved.
