# Fair Marketplace

A comprehensive web application for managing recurring city fairs (Winter and Spring) with interactive Mapbox-powered maps, 360° panoramic tours, vendor application and booking system, and multi-language support.

## Overview

Fair Marketplace is designed for:
- **Fair Organizers (Admin)**: Manage fairs, review vendor applications, configure map objects, and track bookings
- **Vendors**: Apply for vendor house spaces, manage bookings, and showcase products
- **Visitors**: Browse interactive maps, explore 360° tours, and discover vendors

## Features

### Core Functionality
- **Interactive Maps**: Mapbox GL JS integration with vendor houses and facilities
- **360° Panoramic Tours**: Photo Sphere Viewer for immersive vendor house exploration
- **Vendor Application System**: Complete workflow from application to booking
- **Multi-role Access**: Admin, Vendor, and Visitor roles with proper access control
- **Multi-language Support**: Full Azerbaijani and English translations

### For Admins
- Create and manage Winter and Spring fairs
- Add vendor houses and facilities to the map
- Upload 360° panoramas and images via Cloudinary
- Review, approve, or reject vendor applications
- Export application data (CSV/PDF)
- Manage admin accounts and view activity logs
- Edit About Us page content

### For Vendors
- Browse interactive map with availability indicators
- View 360° tours of vendor houses
- Submit applications with logo and product images
- Track application status
- Manage approved bookings
- Edit company profile

### For Visitors
- Anonymous map browsing
- Explore 360° panoramic tours
- Filter by product category
- View facility information
- Countdown timer to next fair

## Technology Stack

### Frontend
- **React 18+** with TypeScript
- **Mapbox GL JS** for interactive maps
- **Photo Sphere Viewer** for 360° panoramas
- **CSS** with responsive design
- Snowflake animations and animated train element

### Backend
- **Node.js** with Express/Fastify
- **PostgreSQL 15+** with PostGIS extension
- **Prisma ORM** for database management
- **Google OAuth** authentication
- **Cloudinary** for image storage

## Prerequisites

- Node.js 18+
- PostgreSQL 15+ with PostGIS extension
- Mapbox API access token
- Google OAuth credentials
- Cloudinary account

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fair-marketplace
   ```

2. **Run the setup script**
   ```bash
   chmod +x init.sh
   ./init.sh
   ```

3. **Configure environment variables**

   Edit the `.env` file with your actual credentials:
   - Database connection URL
   - Google OAuth credentials
   - Cloudinary credentials
   - Mapbox token
   - Email service configuration

4. **Start the development servers**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `FIRST_ADMIN_EMAIL` | Initial admin account email |
| `FIRST_ADMIN_PASSWORD` | Initial admin account password |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `CLOUDINARY_URL` | Cloudinary configuration URL |
| `MAPBOX_TOKEN` | Mapbox API access token |
| `JWT_SECRET` | Secret for JWT token signing |
| `EMAIL_*` | Email service configuration |

## Project Structure

```
fair-marketplace/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React context providers
│   │   ├── services/      # API service functions
│   │   ├── i18n/          # Internationalization files
│   │   └── styles/        # CSS styles
│   └── public/            # Static assets
├── backend/                # Node.js backend application
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API route definitions
│   │   ├── middleware/    # Custom middleware
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   └── prisma/            # Database schema and migrations
├── init.sh                 # Development setup script
├── .env                    # Environment variables (gitignored)
└── README.md              # This file
```

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts (admin, vendor, visitor)
- `vendor_profiles` - Vendor company information
- `vendor_product_images` - Product image gallery
- `fairs` - Fair events (Winter, Spring)
- `vendor_houses` - Map locations for vendors
- `facilities` - Restaurants, cafes, restrooms, etc.
- `applications` - Vendor applications for houses
- `bookings` - Approved vendor bookings
- `admin_logs` - Admin activity audit trail
- `about_us_content` - Editable About Us content

## API Endpoints

### Public
- `GET /api/public/map` - Get map data with houses and facilities
- `GET /api/public/fairs/active` - Get current active fair
- `GET /api/public/about-us` - Get About Us content

### Vendor (Authenticated)
- `POST /api/vendor/applications` - Submit application
- `GET /api/vendor/bookings` - View bookings
- `PATCH /api/vendor/profile` - Update profile

### Admin (Authenticated)
- `POST /api/admin/fairs` - Create fair
- `PATCH /api/admin/applications/:id/approve` - Approve application
- `POST /api/admin/vendor-houses` - Add vendor house
- Full CRUD for all entities

## Demo 360° Panorama

The application includes a demo 360° panorama feature that provides a fallback for vendor houses without their own panoramic images.

### Demo Photo Location
- `frontend/public/fevvareler.jpg` - Demo 360° equirectangular panorama image

### How It Works
- All vendor houses show a "View 360°" button, even without a custom panorama URL
- If no custom panorama is set, the demo image is used as a fallback
- "(Demo)" indicator is shown when using the fallback image

### Replacing the Demo Panorama
Two options:
1. **Via Admin Panel**: Admin => Map Management => Upload 360° panorama for a vendor house
2. **Manual Replacement**: Replace `frontend/public/fevvareler.jpg` with your 360° equirectangular image (same filename)

### Setting Demo for Database
Run the seed script to set the demo panorama on vendor house H-102:
```bash
cd backend
node prisma/seed-demo-panorama.js
```

### Requirements for Custom Panoramas
- Format: JPEG or PNG
- Aspect ratio: 2:1 (equirectangular projection)
- Recommended resolution: 4096x2048 or higher

## Development

### Running Tests
```bash
npm run test
```

### Database Migrations
```bash
cd backend
npx prisma migrate dev --name <migration-name>
```

### Generate Prisma Client
```bash
cd backend
npx prisma generate
```

## Deployment

1. Set up production PostgreSQL with PostGIS
2. Configure production environment variables
3. Set up Cloudinary production account
4. Configure Google OAuth production credentials
5. Build the applications:
   ```bash
   npm run build
   ```
6. Start production servers:
   ```bash
   npm start
   ```

## License

[License Type] - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For questions or issues, please open a GitHub issue.
