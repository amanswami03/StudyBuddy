# StudyBuddy

A collaborative learning platform that connects students through study groups, real-time communication, and gamification features.

## Overview

StudyBuddy is a full-stack application designed to help students find study partners, form study groups, and collaborate effectively. The platform includes real-time messaging, study session tracking, points/ranking systems, and scheduled study sessions to enhance the learning experience.

## Features

- **Study Groups**: Create and join study groups with other students
- **Real-time Messaging**: WebSocket-based chat for group communication
- **User Profiles**: Customize profiles with bios and personal information
- **Study Sessions**: Track and schedule study sessions with timers
- **Gamification**: Points system and leaderboards to encourage participation
- **Notifications**: Real-time notifications for group activities and events
- **Resource Sharing**: Share study resources and materials with groups
- **Privacy Settings**: Control your profile visibility and group access
- **Join Requests**: Manage group membership requests

## Tech Stack

### Backend
- **Language**: Go
- **Database**: SQL (PostgreSQL)
- **Real-time Communication**: WebSocket
- **Architecture**: RESTful API with WebSocket support

### Frontend
- **Framework**: React with Vite
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Manager**: npm

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose

## Project Structure

```
StudyBuddy/
├── backend/                 # Go backend server
│   ├── cmd/studybuddy/     # Application entry point
│   ├── internal/
│   │   ├── api/            # API routes and handlers
│   │   ├── db/             # Database operations and migrations
│   │   ├── handlers/       # HTTP request handlers
│   │   ├── models/         # Data models
│   │   └── ws/             # WebSocket management
│   └── pkg/                # Shared packages
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── contexts/       # React context providers
│   │   ├── utils/          # Utility functions
│   │   └── pages/          # Page components
│   └── public/             # Static assets
└── docker-compose.yml      # Docker Compose configuration
```

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Go 1.16+ (for local backend development)
- Node.js 16+ (for local frontend development)

### Installation & Running

#### Using Docker Compose (Recommended)
```bash
docker-compose up --build
```

This will start both the backend and frontend services.

#### Local Development

**Backend:**
```bash
cd backend
go run cmd/studybuddy/main.go
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Database

The backend uses SQL for data persistence with the following main entities:
- Users (with profile information and privacy settings)
- Study Groups (with join requests)
- Study Sessions (with scheduling)
- Messages (real-time communication)
- Notifications
- Resources (study materials)
- Points & Rankings

Database migrations are stored in `backend/internal/db/` directory.

## API Endpoints

The backend provides RESTful endpoints for:
- Authentication (Auth handler)
- Groups management
- Study sessions
- User profiles
- Resources
- Points/Rankings
- Notifications
- File uploads

Real-time features are handled through WebSocket connections for messaging.

## Frontend Pages

- **HomePage**: Main landing page and group discovery
- **MainDashboard**: User's personal study dashboard
- **GroupDetail**: Detailed view of a study group
- **UserProfile**: User profile and statistics
- **Calendar**: Schedule and view upcoming sessions
- **SettingsPage**: User preferences and settings
- **Auth**: Login and registration

## Contributing

Contributions are welcome! Please follow the existing code structure and conventions.

## License

This project is provided as-is for educational purposes.
