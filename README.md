# DrugFree India - Interactive Drug Abuse Reporting Platform

A mobile-optimized web application that allows citizens in India to report drug abuse incidents with photos, geolocation, and detailed descriptions. The platform provides authorities with real-time data visualization and mapping capabilities to address the growing drug abuse problem among youth.

## 🌟 Features

### For Citizens (Mobile-First Design)
- **📸 Photo Capture**: Take photos directly from mobile camera
- **📍 GPS Location**: Automatic geolocation with address reverse geocoding
- **📝 Detailed Reports**: Rich text descriptions with optional reporter information
- **🔒 Privacy**: Anonymous reporting option available
- **📱 Mobile Optimized**: Works seamlessly on all mobile devices
- **🔄 Offline Support**: Basic offline functionality with service worker

### For Authorities (Dashboard & Analytics)
- **🗺️ Interactive Map**: Real-time visualization of all reports
- **📊 Statistics Dashboard**: Counts by status (pending, investigating, resolved)
- **🎯 Heatmap View**: Identify high-concentration areas
- **📋 Report Management**: View detailed reports with photos and metadata
- **🔄 Real-time Updates**: Auto-refresh every 30 seconds
- **📱 Mobile Responsive**: Access dashboard on any device

### Technical Features
- **🔐 Secure**: Input validation and file size limits
- **⚡ Fast**: Optimized for slow internet connections
- **🌐 Multi-language Ready**: Internationalization support structure
- **📈 Scalable**: MongoDB with geospatial indexing
- **🔍 Searchable**: Location-based queries and filtering

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DrugfreeIndia
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your MongoDB connection string
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open `http://localhost:3000` in your browser
   - For mobile testing, use your computer's IP address

## 📱 Mobile Testing

### Local Network Testing
1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Access from mobile device:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```

### HTTPS for Camera Access
For camera functionality on mobile, you'll need HTTPS. Use ngrok for testing:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run dev

# In another terminal, create HTTPS tunnel
ngrok http 3000
```

## 🗄️ Database Setup

### MongoDB Local Installation
1. Download and install MongoDB Community Server
2. Start MongoDB service
3. Create database: `drugfree-india`

### MongoDB Atlas (Cloud)
1. Create free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string and add to `.env`

### Database Schema
```javascript
{
  description: String,        // Report description
  imageUrl: String,          // Path to uploaded image
  location: {
    type: "Point",
    coordinates: [lng, lat]  // GeoJSON format
  },
  address: String,           // Reverse geocoded address
  timestamp: Date,           // Report submission time
  status: String,            // pending/investigating/resolved
  reporterInfo: String       // Optional reporter name
}
```

## 🚀 Deployment

### Option 1: Render (Recommended for Free Tier)
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables in Render dashboard
6. Deploy!

### Option 2: Railway
1. Connect GitHub repository to Railway
2. Add environment variables
3. Deploy automatically

### Option 3: Fly.io
1. Install Fly CLI
2. Run `fly launch`
3. Set environment variables
4. Deploy with `fly deploy`

### Environment Variables for Production
```bash
MONGODB_URI=your-production-mongodb-uri
PORT=3000
NODE_ENV=production
```

## 📊 API Endpoints

### POST `/api/report`
Submit a new drug abuse report
```javascript
// FormData with:
{
  photo: File,           // Image file
  description: String,   // Report description
  latitude: Number,      // GPS latitude
  longitude: Number,     // GPS longitude
  address: String,       // Optional address
  reporterInfo: String   // Optional reporter name
}
```

### GET `/api/reports`
Get all reports
```javascript
// Response:
{
  success: true,
  reports: [{
    id: String,
    description: String,
    imageUrl: String,
    location: { coordinates: [lng, lat] },
    address: String,
    timestamp: Date,
    status: String,
    reporterInfo: String
  }]
}
```

### GET `/api/reports/nearby`
Get reports within radius
```javascript
// Query parameters:
{
  lat: Number,      // Latitude
  lng: Number,      // Longitude
  radius: Number    // Radius in meters (default: 5000)
}
```

## 🛠️ Development

### Project Structure
```
DrugfreeIndia/
├── public/                 # Frontend files
│   ├── index.html         # Main reporting page
│   ├── map.html           # Map visualization page
│   ├── styles.css         # Shared styles
│   ├── app.js            # Main app logic
│   └── map.js            # Map functionality
├── uploads/               # Image uploads (auto-created)
├── server.js             # Express server
├── package.json          # Dependencies
├── env.example           # Environment template
└── README.md            # This file
```

### Available Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
```

### Adding Features
1. **New API Endpoints**: Add to `server.js`
2. **Frontend Changes**: Modify files in `public/`
3. **Database Changes**: Update schema in `server.js`

## 🔒 Security Considerations

### Current Security Features
- File type validation (images only)
- File size limits (5MB)
- Input sanitization
- CORS configuration
- Rate limiting ready

### Recommended Additions
- User authentication
- API rate limiting
- Image compression
- Data encryption
- Admin dashboard
- Report verification system

## 📈 Analytics & Insights

The platform provides several data points for authorities:

### Geographic Analysis
- Hotspot identification
- Cluster analysis
- Geographic trends

### Temporal Analysis
- Time-based patterns
- Seasonal trends
- Response time metrics

### Status Tracking
- Report resolution rates
- Investigation timelines
- Success metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **OpenStreetMap** for map tiles
- **Leaflet.js** for interactive mapping
- **Font Awesome** for icons
- **Inter font** for typography

## 📞 Support

For support or questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Made with ❤️ for a DrugFree India** 