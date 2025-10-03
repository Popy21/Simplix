# Simplix Sales CRM - Project Overview

## Architecture

This project implements a complete multi-platform Sales CRM system with the following architecture:

```
┌─────────────────────────────────────────────────┐
│                 Client Layer                     │
├─────────────┬──────────────┬────────────────────┤
│  Web App    │  Mobile App  │  Flutter Mobile   │
│  (Expo/RN)  │  (Expo/RN)  │  (iOS/Android)    │
└─────────────┴──────────────┴────────────────────┘
                      ▼
            ┌──────────────────┐
            │   REST API       │
            │  (TypeScript)    │
            └──────────────────┘
                      ▼
            ┌──────────────────┐
            │   SQLite DB      │
            └──────────────────┘
```

## Components

### 1. TypeScript API (Backend)
**Location**: `/api`

**Technology Stack**:
- Node.js + Express.js
- TypeScript
- SQLite3
- CORS

**Features**:
- RESTful API endpoints
- CRUD operations for Customers, Products, and Sales
- Automatic database initialization
- TypeScript types for type safety

**Key Files**:
- `src/index.ts` - Main server entry point
- `src/database/db.ts` - Database initialization and connection
- `src/routes/` - API route handlers
- `src/models/types.ts` - TypeScript interfaces

**Database Schema**:
- `customers` - Customer information
- `products` - Product catalog with pricing and stock
- `sales` - Sales transactions with foreign keys to customers and products

### 2. React Native Web/Mobile App
**Location**: `/web-app`

**Technology Stack**:
- React Native
- Expo (for web support)
- React Navigation
- TypeScript
- Axios

**Features**:
- Cross-platform (iOS, Android, Web)
- Navigation between screens
- API integration
- Modern Material-inspired UI

**Key Screens**:
- Home - Dashboard with menu navigation
- Customers - List and manage customers
- Products - Product catalog view
- Sales - Sales transaction history

### 3. Flutter Mobile App
**Location**: `/mobile-app`

**Technology Stack**:
- Flutter SDK
- Material Design
- HTTP client for API calls
- Dart

**Features**:
- Native mobile experience
- Material Design UI
- API integration
- iOS and Android support

**Key Screens**:
- Home - Menu navigation
- Customers - Customer list
- Products - Product catalog
- Sales - Sales history

## Data Models

### Customer
```typescript
{
  id: number (auto-increment)
  name: string (required)
  email: string
  phone: string
  company: string
  address: string
  created_at: datetime
  updated_at: datetime
}
```

### Product
```typescript
{
  id: number (auto-increment)
  name: string (required)
  description: string
  price: number (required)
  stock: number (default: 0)
  created_at: datetime
  updated_at: datetime
}
```

### Sale
```typescript
{
  id: number (auto-increment)
  customer_id: number (foreign key)
  product_id: number (foreign key)
  quantity: number (required)
  total_amount: number (required)
  status: string (pending/completed/cancelled)
  sale_date: datetime
  notes: string
}
```

## API Endpoints

### Customers API
- `GET /api/customers` - Retrieve all customers
- `GET /api/customers/:id` - Retrieve single customer
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Products API
- `GET /api/products` - Retrieve all products
- `GET /api/products/:id` - Retrieve single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sales API
- `GET /api/sales` - Retrieve all sales (with joined customer/product data)
- `GET /api/sales/:id` - Retrieve single sale
- `POST /api/sales` - Create new sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

## Development Workflow

### Starting the API Server
```bash
cd api
npm install
npm run dev
```
Server runs on `http://localhost:3000`

### Running Web App
```bash
cd web-app
npm install
npm run web    # For web browser
npm run ios    # For iOS (macOS only)
npm run android # For Android
```

### Running Flutter App
```bash
cd mobile-app
flutter pub get
flutter run
```

## Environment Configuration

### API (.env)
```
PORT=3000
NODE_ENV=development
```

### Web App
Update `API_BASE_URL` in `src/services/api.ts` if needed

### Mobile App
Update `baseUrl` in `lib/services/api_service.dart` if needed

## Future Enhancements

Potential areas for expansion:
1. User authentication and authorization
2. Advanced analytics and reporting
3. Data export functionality (CSV, PDF)
4. Email notifications
5. Multi-currency support
6. Inventory management
7. Invoice generation
8. Payment processing integration
9. Customer communication history
10. Advanced search and filtering

## Testing

The API can be tested using:
- cURL commands
- Postman
- The web or mobile apps

Example:
```bash
# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'

# Get all customers
curl http://localhost:3000/api/customers
```

## Deployment Considerations

### API
- Can be deployed to any Node.js hosting (Heroku, AWS, DigitalOcean, etc.)
- SQLite database file needs persistent storage
- Consider PostgreSQL/MySQL for production

### Web App
- Deploy via Expo's hosting
- Build as static site for any web hosting
- iOS/Android apps via App Store/Play Store

### Mobile App
- Build and deploy to App Store (iOS)
- Build and deploy to Play Store (Android)

## License

MIT License - See LICENSE file for details
