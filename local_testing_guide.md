# Fat2FitXpress Local Testing Guide

To test the application locally, you need to run both the FastAPI backend and the Expo frontend.

## 1. Backend Setup (FastAPI)

1.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```
2.  **Create a virtual environment** (if you haven't already):
    ```bash
    python -m venv venv
    ```
3.  **Activate the virtual environment**:
    - **Windows (PowerShell)**: `.\venv\Scripts\Activate.ps1`
    - **Windows (CMD)**: `venv\Scripts\activate`
4.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
5.  **Ensure MongoDB is running**: The backend connects to `mongodb://localhost:27017/`.
6.  **Start the server**:
    ```bash
    uvicorn main:app --reload
    ```
    Your backend will be available at `http://localhost:8000`. You can view the API documentation at `http://localhost:8000/docs`.

---

## 2. Frontend Setup (Expo)

1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure Environment Variables**:
    Open `frontend/.env` and update `EXPO_PUBLIC_BACKEND_URL` based on how you are testing:

    | Testing Method | Backend URL |
    | :--- | :--- |
    | **Android Emulator** | `http://10.0.2.2:8000` |
    | **iOS Simulator** | `http://127.0.0.1:8000` |
    | **Physical Device (Expo Go)** | `http://10.0.0.161:8000` |

    > [!NOTE]
    > Your current local network IP is `10.0.0.161`.

4.  **Start the Expo server**:
    ```bash
    npx expo start
    ```
5.  **Run the app**:
    - Press `a` for Android.
    - Press `i` for iOS.
    - Scan the QR code with the Expo Go app on your physical device.

---

## Troubleshooting

- **Connection Refused**: Ensure the backend is running and you used the correct URL in `frontend/.env`.
- **MongoDB Error**: Ensure MongoDB is running locally on port 27017.
- **Network Timeout**: If using a physical device, ensure both your computer and your phone are on the same Wi-Fi network.
