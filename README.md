# Aegis-AO Rentals - Car Rental Application

A modern, full-stack car rental application built with React and Node.js, integrating with the existing Aegis-AO API.

## Features

- 🚗 **Vehicle Browsing**: Browse and search through a wide selection of vehicles
- 📅 **Booking System**: Easy reservation and booking management
- 👤 **User Authentication**: Secure user registration and login
- 💳 **Payment Integration**: Stripe payment processing
- 📱 **Responsive Design**: Modern, mobile-friendly interface
- 🔧 **Admin Dashboard**: Vehicle and booking management
- 🌐 **API Integration**: Connects to existing Aegis-AO API endpoints

## Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **React Hook Form** - Form handling
- **React Toastify** - Notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Axios** - HTTP client for API calls
- **JWT** - Authentication tokens
- **Stripe** - Payment processing
- **Nodemailer** - Email notifications

## Project Structure

```
aegis-ao-rental-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API services
│   │   └── App.js          # Main app component
│   └── public/             # Static assets
├── server/                 # Node.js backend
│   ├── routes/             # API route handlers
│   ├── middleware/         # Custom middleware
│   ├── config/             # Configuration files
│   └── index.js            # Server entry point
└── package.json            # Root package.json
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Access to Aegis-AO API endpoints

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aegis-ao-rental-app
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   
   **Backend (.env)**
   ```bash
   cd server
   cp .env.example .env
   ```
   
   Edit `server/.env` with your configuration:
   ```env
   API_BASE_URL=https://aegis-ao-rentals-e8ach0ekd2h0hqa2.canadacentral-01.azurewebsites.net
   API_KEY=your_api_key_here
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   ```

   **Frontend (.env)**
   ```bash
   cd client
   cp .env.example .env
   ```
   
   Edit `client/.env` with your configuration:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   ```
   
   **BlinkID License Keys** (Optional - for license scanning):
   
   The easiest way to sync BlinkID license keys is to use the sync script:
   ```bash
   npm run sync-licenses
   ```
   
   This reads keys from `MicroBlink/*.key` files (ios.key, android.key, in-browser.key) in the project directory and updates all `.env` files automatically. The keys are part of the project and will be deployed with the application.
   See `scripts/README.md` for more details.

4. **Start the application**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5000) and frontend development server (port 3000).

### Individual Commands

- **Start backend only**: `npm run server`
- **Start frontend only**: `npm run client`
- **Build for production**: `npm run build`
- **Sync BlinkID license keys**: `npm run sync-licenses` (reads from `MicroBlink/*.key` files)

## API Integration

The application integrates with the existing Aegis-AO API at:
`https://aegis-ao-rentals-e8ach0ekd2h0hqa2.canadacentral-01.azurewebsites.net`

### Available Endpoints

- **Authentication**: `/api/auth/*`
- **Vehicles**: `/api/vehicles/*`
- **Reservations**: `/api/reservations/*`
- **Customers**: `/api/customers/*`
- **Payments**: `/api/payments/*`
- **Admin**: `/api/admin/*`

## Features Overview

### User Features
- **Browse Vehicles**: Search and filter vehicles by category, make, price, location
- **Vehicle Details**: View detailed vehicle information with images and features
- **Booking System**: Select dates and locations for vehicle rental
- **User Profile**: Manage personal information and driver's license details
- **My Bookings**: View and manage existing reservations
- **Authentication**: Secure login and registration

### Admin Features
- **Dashboard**: Overview of vehicles, reservations, and customers
- **Vehicle Management**: Add, edit, and manage vehicle inventory
- **Reservation Management**: View and manage all bookings
- **Customer Management**: View customer information
- **Analytics**: Revenue and usage statistics

## Development

### Code Structure

- **Components**: Reusable UI components in `client/src/components/`
- **Pages**: Route components in `client/src/pages/`
- **Services**: API integration in `client/src/services/`
- **Context**: Global state management in `client/src/context/`
- **Routes**: Backend API routes in `server/routes/`
- **Middleware**: Authentication and validation in `server/middleware/`

### Styling

The application uses Tailwind CSS for styling with custom components and utilities defined in `client/src/index.css`.

### State Management

- **React Context**: Global authentication state
- **React Query**: Server state management and caching
- **Local State**: Component-level state with React hooks

## Deployment

### Backend Deployment

1. Set environment variables in production
2. Install dependencies: `npm install`
3. Start the server: `npm start`

### Frontend Deployment

1. Build the application: `npm run build`
2. Deploy the `build` folder to your hosting service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
