# Simplix Mobile App (Flutter)

Flutter mobile application for the Simplix Sales CRM system.

## Features

- 📱 Native mobile experience for iOS and Android
- 👥 Customer management
- 📦 Product catalog
- 💰 Sales tracking
- 🎨 Material Design UI

## Setup

### Prerequisites

- Flutter SDK (>= 3.0.0)
- Android Studio or Xcode for platform-specific development

### Installation

1. Install Flutter dependencies:
```bash
flutter pub get
```

2. Update API URL in `lib/services/api_service.dart` if needed

3. Run the app:

```bash
# For Android
flutter run -d android

# For iOS (macOS only)
flutter run -d ios

# For Web
flutter run -d chrome
```

## Project Structure

```
lib/
├── main.dart           # App entry point
├── models/             # Data models
├── screens/            # Screen widgets
└── services/           # API services
```

## API Connection

The app connects to the Simplix API at `http://localhost:3000/api` by default. Make sure the API server is running before using the app.

For physical devices, you'll need to update the API URL to your computer's IP address.
