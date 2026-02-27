# Fat2FitXpress - Mobile Fitness App PRD

## Overview
Production-ready mobile fitness app for the Fat2FitXpress brand (https://fat2fitxpress.com/). Built with Expo React Native (frontend) and FastAPI + MongoDB (backend).

## Features

### 1. Authentication (JWT)
- Email/password signup and login
- JWT token-based auth with 72-hour expiry
- Secure password hashing with bcrypt

### 2. Fitness Calculators (6 total)
- **TDEE Calculator** - Total Daily Energy Expenditure with activity levels
- **BMI Calculator** - Body Mass Index with category classification
- **Body Fat % Calculator** - Estimate using BMI-based formula
- **Macros Calculator** - Protein/Carbs/Fat breakdown by goal
- **One Rep Max Calculator** - Epley formula estimation with percentages
- **Ideal Weight Calculator** - Devine formula by gender and height

### 3. Workout Plans
- 3 pre-built plans: Beginner (Full Body), Intermediate (PPL), Advanced (Power & Hypertrophy)
- Detailed exercises with sets, reps, weights, muscle groups, rest times, and notes
- Start workout from any day in any plan

### 4. Workout Logging
- Log sets, reps, and weight for each exercise
- Pre-filled with plan suggestions
- Complete workout history

### 5. Daily Weight Tracker
- Log daily weight entries
- Visual bar chart (last 14 entries)
- Full history with delete capability
- Auto-updates existing date entries

### 6. Water Intake Tracker
- Glass-based tracking (250ml per glass, 8 glass goal = 2L)
- Visual progress circle and glass grid
- Add/remove glasses with one tap
- Dashboard widget integration

### 7. Progress Photos
- Upload from gallery or take with camera
- Base64 storage in MongoDB
- Grid view with dates
- Delete capability

### 8. User Profile
- View and edit: name, height, weight, age, gender, fitness goal
- Profile data used across the app
- Secure logout with confirmation

## Tech Stack
- **Frontend**: Expo SDK 54, React Native, Expo Router (file-based routing), TypeScript
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, bcrypt
- **Database**: MongoDB
- **Auth**: JWT tokens stored in AsyncStorage
- **Design**: Dark fitness theme (#0A0A0A background, #FF3B30 primary red accent)

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| PUT | /api/profile | Update profile |
| GET | /api/dashboard | Dashboard data |
| GET/POST/DELETE | /api/weight-entries | Weight CRUD |
| GET | /api/water-intake?date= | Get water for date |
| POST | /api/water-intake/add | Add glass |
| POST | /api/water-intake/remove | Remove glass |
| GET | /api/workout-plans | All workout plans |
| GET | /api/workout-plans/{id} | Single plan |
| GET/POST | /api/workout-logs | Workout log CRUD |
| GET/POST/DELETE | /api/progress-photos | Photo CRUD |

## App Store Publishing Steps

### Apple App Store (iOS)
1. Create an Apple Developer Account ($99/year) at https://developer.apple.com
2. Run `npx expo prebuild --platform ios` to generate native project
3. Run `eas build --platform ios` (requires EAS CLI: `npm install -g eas-cli`)
4. Configure `eas.json` with your Apple credentials
5. Submit via `eas submit --platform ios` or upload through Xcode/Transporter
6. Complete App Store Connect listing (screenshots, description, privacy policy)
7. Submit for review (typically 24-48 hours)

### Google Play Store (Android)
1. Create a Google Play Developer Account ($25 one-time) at https://play.google.com/console
2. Run `npx expo prebuild --platform android` to generate native project
3. Run `eas build --platform android` for AAB bundle
4. Upload AAB to Google Play Console
5. Complete store listing (screenshots, description, content rating)
6. Submit for review (typically a few hours to 7 days)

### Common Steps
1. Create a privacy policy (required for both stores)
2. Prepare app screenshots (6.5" iPhone, 12.9" iPad, Phone/Tablet Android)
3. Write app description and keywords
4. Set up proper app icons (1024x1024 for iOS, 512x512 for Android)
5. Configure push notifications if needed
6. Set backend API URL to production server
