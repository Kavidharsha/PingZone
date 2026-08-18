# 💬 PingZone

PingZone is a full-stack real-time chat application built with React, Node.js, Express, MongoDB, and Socket.IO.

It provides secure user authentication, real-time private and public conversations, online/offline presence, typing indicators, unread message notifications, message deletion, and an AI-powered Gemini chat lounge.

---

## 🚀 Features

### 🔐 Authentication
- User registration and login
- Password hashing with bcrypt
- JWT-based authentication
- Protected API routes
- Session persistence

### 💬 Real-Time Chat
- Public chat channels
- Private one-to-one conversations
- Real-time messaging with Socket.IO
- Messages stored in MongoDB
- Message deletion
- Automatic message loading
- Auto-scroll to latest messages

### 🟢 User Presence
- Real online/offline status
- Socket.IO connection tracking
- Presence updates across connected users

### ✍️ Typing Indicator
- Shows when another user is typing
- Automatically disappears when typing stops

### 🔔 Unread Messages
- Unread message badges
- Unread count updates in real time
- Badge clears when the conversation is opened

### 🔎 User Search
- Search users by name
- Quickly start private conversations

### 🤖 Gemini AI Lounge
- AI-powered chat using Google's Gemini API
- Ask questions directly inside PingZone
- Separate AI conversation interface
- Gemini API key kept on the backend

### 📱 Responsive UI
- Desktop-friendly interface
- Mobile responsive layout
- Mobile sidebar navigation
- Optimized chat experience for smaller screens

---

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- React Router
- Socket.IO Client
- CSS

### Backend
- Node.js
- Express.js
- Socket.IO

### Database
- MongoDB
- Mongoose

### Authentication & Security
- bcrypt
- JSON Web Tokens (JWT)
- Protected API routes
- Environment variables

### AI
- Google Gemini API
- `@google/genai`

---

## 🏗️ Project Architecture

```text
                    ┌─────────────────┐
                    │   React / Vite  │
                    │    Frontend     │
                    └────────┬────────┘
                             │
                    REST API │ Socket.IO
                             │
                    ┌────────▼────────┐
                    │ Node + Express  │
                    │    Backend      │
                    └───────┬─┬───────┘
                            │ │
                 ┌──────────┘ └──────────┐
                 │                       │
          ┌──────▼──────┐        ┌──────▼──────┐
          │   MongoDB   │        │ Gemini API  │
          │   Database  │        │     AI      │
          └─────────────┘        └─────────────┘
