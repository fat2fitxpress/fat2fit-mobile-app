# Fat2FitXpress

Fat2FitXpress is a comprehensive fitness transformation tracking application designed to help users achieve their health goals. It provides a full-stack solution with a mobile-first approach, allowing users to track their progress, manage workouts, and monitor daily habits.

## 🚀 Features

- **Personalized Dashboard**: Real-time overview of your daily water intake, latest weight, and weekly workout progress.
- **Weight Tracker**: Log and track your weight history with visual charts to monitor your transformation.
- **Water Intake Logging**: Stay hydrated by tracking your daily water consumption against customizable goals.
- **Workout Management**:
  - Access predefined workout plans for different skill levels (Beginner, Intermediate, Advanced).
  - Log daily workout sessions with detailed exercise tracking (sets, reps, weight).
- **Transformation Photos**: Securely upload and store progress photos with notes to visually document your journey (Powered by AWS S3).
- **Google OIDC Login**: Simplified authentication with "Continue with Google" support.
- **Security Hardening**:
  - **SecureStore**: Frontend tokens are stored in hardware-backed storage.
  - **Signed URLs**: Progress photos are served via short-lived AWS S3 signed URLs.
  - **CORS Policies**: Restricted backend access to authorized origins only.
- **User Authentication**: Secure signup and login system with JWT-based session management.
- **Profile Management**: Customize your fitness profile, including height, weight, age, and personal fitness goals.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Auth**: [Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/) (Google OIDC)
- **Security**: [Secure Store](https://docs.expo.dev/versions/latest/sdk/secure-store/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Cloud**: [Boto3](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html) (AWS S3)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Motor](https://motor.readthedocs.io/)
- **Security**: JWT, Google Token Verification, Bcrypt.
- **API Documentation**: Automatic Swagger/OpenAPI docs.

## 📂 Project Structure

```text
fat2fit-mobile-app/
├── backend/            # FastAPI Backend
│   ├── main.py         # Main application and API routes
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
- Python (v3.12+)
- MongoDB (Running instance or Atlas URI)
- JDK 17 (Required for Android builds)

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
   > [!TIP]
   > For the best experience on Windows, ensure you are using Python 3.12. If `pip install` fails on `jq`, it can be safely ignored as it is no longer a critical dependency.

4. Create a `.env` file and set the following:
   ```env
   MONGO_URL=your_mongodb_uri
   DB_NAME=fat2fitxpress
   JWT_SECRET=your_secret_key
   GOOGLE_CLIENT_IDS=android_id,web_id,ios_id
   ```
5. Start the server:
   ```bash
   python -m uvicorn main:app --reload
   ```

The application requires several environment variables for security and feature enablement.

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://...` |
| `DB_NAME` | MongoDB database name | `fat2fit_db` |
| `JWT_SECRET` | Secret key for JWT signing | `your_long_random_secret` |
| `AWS_ACCESS_KEY_ID` | AWS IAM User Access Key | `AKI...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM User Secret Key | `SECRET` |
| `AWS_S3_BUCKET_NAME` | S3 Bucket name for photos | `fat2fit-photos` |
| `GOOGLE_CLIENT_IDS` | OIDC Client IDs (comma-separated) | `id1,id2` |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_BACKEND_URL` | Base URL of your FastAPI backend | `http://10.0.2.2:8000` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` | Google Client ID for Android | `...android...com` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` | Google Client ID for iOS | `...ios...com` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` | Google Client ID for Web/Expo Go | `...web...com` |

> [!NOTE]
> For EAS Cloud builds, add this secret via `eas secret:create --name EXPO_PUBLIC_BACKEND_URL --value <YOUR_URL>`.

## 🏁 Getting Started (Frontend)
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

## ⚒️ Android Build

### Option 1: EAS Cloud Build
```bash
eas build --platform android --profile production
```

### Option 2: Local Gradle Build
1. Ensure **JDK 17** is installed and set as `JAVA_HOME`.
2. Generate native files: `npx expo prebuild`
3. Configure your keystore in `android/gradle.properties`.
4. Run build:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## 🛠️ Troubleshooting

- **JDK Version Error**: If you see `Unsupported class file major version`, ensure you are using **JDK 17**.
- **SDK Not Found**: Create a `frontend/android/local.properties` file with: `sdk.dir=C\:\\Users\\<USER>\\AppData\\Local\\Android\\Sdk`
- **GitHub Account Switching**: Use `git config --local user.name "Name"` and `git config --local user.email "email"` to set a project-specific identity.

## 🧪 Testing

- **Backend**: Run tests using `pytest` in the backend directory.
- **Frontend**: Use `npm run lint` for code quality checks.

## 📚 Related Documentation

- [OIDC Setup Guide](./oidc_setup_guide.md): Detailed walkthrough for Google OAuth configuration.
- [Local Testing Guide](./local_testing_guide.md): Comprehensive guide for setting up your local environment and emulator networking.

---
Built with ❤️ for the Fitness Community.
