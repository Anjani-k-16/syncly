# Syncly — Real-Time Chat App

A production-grade real-time messaging application.

## Live Demo 
https://syncly-frontend.onrender.com 
## Click "Try as Guest" to explore without signing up!

## Tech Stack

- **Backend:** Node.js, Fastify, Socket.IO, PostgreSQL, Redis
- **Frontend:** React, Vite, TailwindCSS, Zustand
- **Infrastructure:** Docker Compose, Cloudinary, Resend

## Features

- Real-time messaging with Socket.IO
- AES-256-GCM message encryption
- JWT authentication with refresh token rotation
- Friend request system with email notifications
- Email OTP verification on registration
- Message reactions, replies, starring and selection
- Image/file uploads, GIF support, emoji and sticker packs
- In-app camera capture for photos
- Typing indicators and read receipts ✓✓
- Group channels and direct messages
- User profiles with avatar upload
- Forgot password with email reset
- Redis pub/sub for horizontal scaling
- Docker Compose setup

## Setup

1. Clone the repo
```bash
git clone https://github.com/Anjani-k-16/syncly.git
cd syncly
```

2. Create your `.env` file and fill in credentials
```env
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
ENCRYPTION_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GMAIL_USER=
GMAIL_APP_PASSWORD=
FRONTEND_URL=http://localhost:3000
```

3. Run with Docker
```bash
docker-compose up --build
```

4. Open http://localhost:3000
