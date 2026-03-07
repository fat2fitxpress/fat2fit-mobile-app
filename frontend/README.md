# Fat2FitXpress Frontend

This is the mobile frontend of the Fat2FitXpress application, built with **React Native** and **Expo**.

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file in this directory and add:
   ```env
   EXPO_PUBLIC_BACKEND_URL=your_backend_url
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your_google_android_id
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your_google_ios_id
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your_google_web_id (Used for Expo Go)
   ```

3. **Start the App**:
   ```bash
   npx expo start
   ```

## 📱 Mobile Development

- **Android Emulator**: Press `a` in the terminal.
- **iOS Simulator**: Press `i` in the terminal (Mac only).
- **Expo Go**: Scan the QR code with the Expo Go app on your physical device.

## ⚒️ Android Production Build

We support both EAS Cloud and Local Gradle builds.

### Local Build (Prerequisites)
- **JDK 17** (Specifically version 17).
- **Android SDK** configured in `android/local.properties`.

For detailed build and signing instructions, please refer to the **[Main Project README](../README.md)**.

## 🧪 Testing
For detailed instructions on local development and environment setup, see **[local_testing_guide.md](../local_testing_guide.md)**.

## 📂 Architecture

- `app/`: Expo Router screens and file-based navigation (including Tabs).
- `src/components/`: Reusable UI components.
- `src/utils/`: API wrappers (`api.ts` uses `SecureStore` for token security).
- `src/context/`: Authentication (`AuthContext.tsx` handles Email and Google OIDC).

---
Built with ❤️ by Shailendra Yadav
