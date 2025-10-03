# Quick Start Guide - Simplix CRM

This guide will help you get the Simplix Sales CRM system up and running quickly.

## Prerequisites

- **Node.js** (v16 or higher) - for API and Web App
- **npm** or **yarn** - package manager
- **Flutter SDK** (optional) - for Flutter mobile app development

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Popy21/Simplix.git
cd Simplix
```

### 2. Set Up the API (Required)

The API is the backend that serves data to all client applications.

```bash
# Navigate to API directory
cd api

# Install dependencies
npm install

# Create environment file (optional - uses defaults if not created)
cp .env.example .env

# Start the development server
npm run dev
```

The API will start on `http://localhost:3000`

**Verify it's working:**
```bash
curl http://localhost:3000
# Should return: {"message":"Simplix Sales CRM API",...}
```

### 3. Set Up the Web/Mobile App (React Native)

Open a **new terminal window** (keep the API running):

```bash
# Navigate to web app directory
cd web-app

# Install dependencies
npm install

# Start the web app
npm run web
```

The app will open in your default browser. You can navigate between:
- Home (Dashboard)
- Customers
- Products
- Sales

**For iOS** (macOS only):
```bash
npm run ios
```

**For Android**:
```bash
npm run android
```

### 4. Set Up the Flutter Mobile App (Optional)

If you have Flutter installed:

```bash
# Navigate to mobile app directory
cd mobile-app

# Get dependencies
flutter pub get

# Run the app
flutter run
# Select your target device when prompted
```

## Testing the System

### 1. Create Sample Data via API

```bash
# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "phone": "555-0001",
    "company": "Tech Solutions Inc"
  }'

# Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Widget",
    "description": "High-quality widget for professionals",
    "price": 149.99,
    "stock": 50
  }'

# Create a sale
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "product_id": 1,
    "quantity": 3,
    "total_amount": 449.97,
    "status": "completed"
  }'
```

### 2. View Data in the Web App

1. Open the web app at the URL shown in the terminal (usually `http://localhost:19006`)
2. Click on "Customers" to see the customer you created
3. Click on "Products" to see the product
4. Click on "Sales" to see the sale transaction

## Common Issues & Solutions

### Issue: API won't start
**Solution**: Make sure port 3000 is not in use:
```bash
# On Linux/macOS
lsof -ti:3000 | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: Cannot connect to API from web app
**Solution**: 
1. Make sure the API is running on http://localhost:3000
2. Check the API URL in `web-app/src/services/api.ts`
3. For physical devices, update the URL to your computer's IP address

### Issue: Flutter app can't find packages
**Solution**:
```bash
flutter doctor
flutter pub get
```

### Issue: Database errors
**Solution**: The database is created automatically. If you want to reset it:
```bash
rm api/data/crm.db
# Restart the API - it will create a fresh database
```

## Next Steps

1. **Explore the API**: Check out `api/README.md` for detailed API documentation
2. **Customize the UI**: Modify the screens in `web-app/src/screens/`
3. **Add Features**: Extend the data models in `api/src/models/types.ts`
4. **Deploy**: See `ARCHITECTURE.md` for deployment guidance

## Development Tips

- **Hot Reload**: Both the API (nodemon) and web app (Expo) support hot reload
- **Database Browser**: Use a SQLite browser to view your data at `api/data/crm.db`
- **API Testing**: Use Postman or Thunder Client for easier API testing
- **React DevTools**: Install React DevTools browser extension for debugging

## Project Structure Overview

```
Simplix/
├── api/              # Backend API (Node.js + TypeScript)
│   ├── src/
│   │   ├── database/ # Database setup
│   │   ├── models/   # Data models
│   │   └── routes/   # API endpoints
│   └── data/         # SQLite database file
├── web-app/          # React Native Web/Mobile App
│   └── src/
│       ├── screens/  # App screens
│       ├── services/ # API client
│       └── types/    # TypeScript types
└── mobile-app/       # Flutter Mobile App
    └── lib/
        ├── models/   # Data models
        ├── screens/  # App screens
        └── services/ # API client
```

## Support

For issues or questions:
1. Check the README files in each directory
2. Review ARCHITECTURE.md for technical details
3. Open an issue on GitHub

---

**Happy Coding! 🚀**
