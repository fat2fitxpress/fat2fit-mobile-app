# Fat2FitXpress Backend

This is the FastAPI backend for the Fat2FitXpress application. It manages user authentication, profile data, workout logs, and transformation photos.

## 🚀 Features
- **FastAPI**: High-performance, async Python web framework.
- **Google OIDC**: Token verification for secure one-tap login.
- **AWS S3 Integration**: Secure photo storage with pre-signed URLs for privacy.
- **MongoDB**: Schema-less storage for weight logs and workouts.
- **JWT Auth**: Standard session management for email/password users.

## 🛠️ Requirements
- Python 3.12+
- MongoDB instance (Local or Atlas)
- AWS S3 Bucket (Optional for development, required for photos)

## 🏁 Setup
1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure .env**:
   Create a `.env` file with:
   ```env
   MONGO_URL=your_mongodb_uri
   DB_NAME=fat2fit_db
   JWT_SECRET=your_secret_key
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_S3_BUCKET_NAME=your_bucket_name
   GOOGLE_CLIENT_IDS=android_id,web_id,ios_id
   ```
   *Note: `GOOGLE_CLIENT_IDS` must include all IDs (Android, Web/Expo, iOS) for token verification.*

3. **Start Server**:
   ```bash
   uvicorn main:app --reload
   ```

## 🧪 Testing
Run tests using pytest:
```bash
pytest
```

## 📂 Structure
- `main.py`: Main entry point and all API routes.
- `requirements.txt`: Python package list.
- `tests/`: Automated test suites.
