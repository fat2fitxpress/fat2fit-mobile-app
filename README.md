# Fat2FitXpress

Fat2FitXpress is a comprehensive fitness transformation tracking application designed to help users achieve their health goals. It provides a full-stack solution with a mobile-first approach, allowing users to track their progress, manage workouts, and monitor daily habits.

## 🚀 Features

- **Personalized Dashboard**: Real-time overview of your daily water intake, latest weight, and weekly workout progress.
- **Weight Tracker**: Log and track your weight history with visual charts to monitor your transformation.
- **Water Intake Logging**: Stay hydrated by tracking your daily water consumption against customizable goals.
- **Workout Management**:
  - Access predefined workout plans for different skill levels (Beginner, Intermediate, Advanced).
  - Log daily workout sessions with detailed exercise tracking (sets, reps, weight).
- **Transformation Photos**: Securely upload and store progress photos with notes to visually document your journey.
- **User Authentication**: Secure signup and login system with JWT-based session management.
- **Profile Management**: Customize your fitness profile, including height, weight, age, and personal fitness goals.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based)
- **Styling**: Native styling with responsive components.
- **State Management**: React Hooks and Context API.

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Motor](https://motor.readthedocs.io/) (Async driver)
- **Security**: JWT Authentication, Bcrypt password hashing.
- **API Documentation**: Automatic Swagger/OpenAPI docs.

## 📂 Project Structure

```text
fat2fit-mobile-app/
├── backend/            # FastAPI Backend
│   ├── server.py       # Main application and API routes
│   └── requirements.txt # Python dependencies
├── frontend/           # Expo React Native App
│   ├── app/            # Expo Router screens and layouts
│   ├── src/            # Components, constants, and utilities
│   └── package.json    # Javascript dependencies
└── README.md           # Project documentation
```

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- MongoDB (Running instance or Atlas URI)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example` (if available) or set the following:
   ```env
   MONGO_URL=your_mongodb_uri
   DB_NAME=fat2fit_db
   JWT_SECRET=your_secret_key
   ```
5. Start the server:
   ```bash
   uvicorn server:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npx expo start
   ```
4. Follow the terminal instructions to open the app on an Android Emulator, iOS Simulator, or via the Expo Go app.

## 🧪 Testing

- **Backend**: Run tests using `pytest` in the backend directory.
- **Frontend**: Use `npm run lint` for code quality checks.

---
Built with ❤️ for the Fitness Community.
