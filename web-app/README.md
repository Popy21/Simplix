# Simplix Web/Mobile App

Cross-platform React Native application built with Expo for desktop, web, and mobile.

## Features

- 📱 Multi-platform support (iOS, Android, Web)
- 👥 Customer management
- 📦 Product catalog
- 💰 Sales tracking
- 🎨 Modern UI with navigation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update API URL in `src/services/api.ts` if needed

3. Run on different platforms:

### Web
```bash
npm run web
```

### iOS (macOS required)
```bash
npm run ios
```

### Android
```bash
npm run android
```

## Project Structure

```
src/
├── screens/         # Screen components
├── components/      # Reusable components
├── services/        # API services
├── types/           # TypeScript types
└── navigation/      # Navigation configuration
```

## API Connection

The app connects to the Simplix API at `http://localhost:3000/api` by default. Make sure the API server is running before using the app.
