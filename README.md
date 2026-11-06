# 🎁 Lucky Draw System

A comprehensive full-stack application for managing events, participants, and executing lucky draws seamlessly.

## 🚀 Current Progress

The backend foundation and database schema are successfully implemented and ready.

- [x] **PostgreSQL Setup**: Database configured and running.
- [x] **Database Schema**: Structured with 7 core tables.
- [x] **Backend API Complete**: Core endpoints are fully functional.
  - [x] Authentication (JWT-based authentication for secure access)
  - [x] Event Management (CRUD operations for events)
  - [x] Participant Registration (API for user registration and validation)
  - [x] Prize Management (Manage prizes for events)
  - [x] Core Draw Logic (Randomized winner selection logic)
- [x] **Version Control**: Git and GitHub repository initialized for collaboration.

## 🛠️ Tech Stack

### Backend
- **Node.js**: JavaScript runtime for building the server-side application.
- **Express.js**: Web framework for creating RESTful APIs.
- **PostgreSQL**: Relational database for storing event, participant, and prize data.
- **Sequelize**: ORM for database modeling and migrations.
- **JWT**: Secure token-based authentication for user sessions.
- **Nodemailer**: Email service integration for notifications.

### Frontend (Upcoming)
- **React**: JavaScript library for building user interfaces.
- **Vite**: Fast build tool for modern web development.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Axios**: HTTP client for API communication.

### Deployment
- **Microsoft Azure**: Cloud platform for hosting the full-stack application.
- **Docker**: Containerization for consistent deployment environments.

### Tools & Utilities
- **Git**: Version control for source code management.
- **ESLint & Prettier**: Code quality and formatting tools.
- **Postman**: API testing and documentation.

## 📋 Next Plan (Roadmap)

Upcoming features, frontend implementation, and deployment:

1. **Email Notification** 📧
   - Integration with Nodemailer + Gmail to send automated emails (e.g., registration confirmation, winner announcements).

2. **Frontend Application (React + Vite + Tailwind CSS)** 💻
   - **Admin Dashboard**: Interface for admins to manage events, prizes, and view participants.
   - **Participant Registration Page**: Public-facing registration form for users to join the lucky draw.
   - **Event Screen**: A live screen featuring dynamic draw animations for the actual event.

3. **Deployment** ☁️
   - Full-stack application deployment to Microsoft Azure.
   - CI/CD pipeline setup for automated builds and deployments.

4. **Additional Features**:
   - **Analytics Dashboard**: Insights into participant data and event performance.
   - **Multi-language Support**: Localization for broader audience reach.
   - **Mobile Responsiveness**: Ensure the frontend is fully responsive across devices.

---
*Built with ❤️ for the Lucky Draw System*
