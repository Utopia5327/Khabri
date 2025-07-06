const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE || 'google-cloud-key.json'
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'drugfree-india-uploads';
const bucket = storage.bucket(bucketName);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/drugfree-india', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Multer configuration for temporary local storage
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: localStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Function to upload file to Google Cloud Storage
async function uploadToGCS(filePath, fileName) {
  try {
    const options = {
      destination: fileName,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    };

    await bucket.upload(filePath, options);
    
    // Get the public URL (bucket must be configured for public access)
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    
    // Clean up local file
    fs.unlinkSync(filePath);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to GCS:', error);
    // Clean up local file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
}

// Report Schema
const reportSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  address: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved'],
    default: 'pending'
  }
});

reportSchema.index({ location: '2dsphere' });

const Report = mongoose.model('Report', reportSchema);

// Routes

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the map page
app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'map.html'));
});

function isLocationInIndia(lat, lng) {
    return lat >= 6 && lat <= 37 && lng >= 68 && lng <= 97;
}

// POST /api/report - Submit a new report
app.post('/api/report', upload.single('photo'), async (req, res) => {
  try {
    const { description, latitude, longitude, address } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    if (!description || !latitude || !longitude) {
      return res.status(400).json({ error: 'Description, latitude, and longitude are required' });
    }

    // TEMPORARILY DISABLED FOR SCREEN RECORDING
    // if (!isLocationInIndia(parseFloat(latitude), parseFloat(longitude))) {
    //   return res.status(400).json({ error: 'Reporting is only allowed within India.' });
    // }

    // Upload to Google Cloud Storage
    let imageUrl;
    try {
      imageUrl = await uploadToGCS(req.file.path, req.file.filename);
    } catch (uploadError) {
      console.error('GCS upload failed:', uploadError);
      return res.status(500).json({ error: 'Failed to upload image to cloud storage' });
    }

    const report = new Report({
      description,
      imageUrl,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      address: address || ''
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report: {
        id: report._id,
        description: report.description,
        imageUrl: report.imageUrl,
        location: report.location,
        timestamp: report.timestamp
      }
    });

  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// GET /api/reports - Get all reports (for admin use only)
app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find()
      .sort({ timestamp: -1 })
      .limit(1000); // Limit to prevent overwhelming response

    res.json({
      success: true,
      reports: reports.map(report => ({
        id: report._id,
        description: report.description,
        imageUrl: report.imageUrl,
        location: report.location,
        address: report.address,
        timestamp: report.timestamp,
        status: report.status
      }))
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /api/reports/nearby - Get reports within a certain radius
app.get('/api/reports/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // radius in meters, default 5km
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    }).sort({ timestamp: -1 });

    res.json({
      success: true,
      reports: reports.map(report => ({
        id: report._id,
        description: report.description,
        imageUrl: report.imageUrl,
        location: report.location,
        address: report.address,
        timestamp: report.timestamp,
        status: report.status
      }))
    });

  } catch (error) {
    console.error('Error fetching nearby reports:', error);
    res.status(500).json({ error: 'Failed to fetch nearby reports' });
  }
});

// GET /api/heatmap - Get heat map data (public endpoint)
app.get('/api/heatmap', async (req, res) => {
  try {
    const reports = await Report.find({}, 'location timestamp status');
    
    // Group reports by location (rounded to 3 decimal places for clustering)
    const locationGroups = {};
    
    reports.forEach(report => {
      const coords = report.location.coordinates;
      const lat = Math.round(coords[1] * 1000) / 1000;
      const lng = Math.round(coords[0] * 1000) / 1000;
      const key = `${lat},${lng}`;
      
      if (!locationGroups[key]) {
        locationGroups[key] = {
          lat: coords[1],
          lng: coords[0],
          count: 0,
          recent: 0, // reports in last 30 days
          statuses: { pending: 0, investigating: 0, resolved: 0 }
        };
      }
      
      locationGroups[key].count++;
      locationGroups[key].statuses[report.status]++;
      
      // Check if report is recent (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (new Date(report.timestamp) > thirtyDaysAgo) {
        locationGroups[key].recent++;
      }
    });
    
    // Convert to array and calculate intensity
    const heatmapData = Object.values(locationGroups).map(group => ({
      lat: group.lat,
      lng: group.lng,
      count: group.count,
      recent: group.recent,
      intensity: Math.min(group.count * 0.3 + group.recent * 0.7, 10), // Weight recent reports more heavily
      statuses: group.statuses
    }));
    
    res.json({
      success: true,
      data: heatmapData,
      totalReports: reports.length,
      totalLocations: heatmapData.length
    });

  } catch (error) {
    console.error('Error fetching heat map data:', error);
    res.status(500).json({ error: 'Failed to fetch heat map data' });
  }
});

// GET /api/stats - Get public statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const investigatingReports = await Report.countDocuments({ status: 'investigating' });
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });
    
    // Get reports from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReports = await Report.countDocuments({ timestamp: { $gte: thirtyDaysAgo } });
    
    res.json({
      success: true,
      stats: {
        total: totalReports,
        pending: pendingReports,
        investigating: investigatingReports,
        resolved: resolvedReports,
        recent: recentReports
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// DELETE /api/reports/cleanup - Remove reports with local URLs (for cleanup)
app.delete('/api/reports/cleanup', async (req, res) => {
  try {
    // Find and delete reports that have local URLs (starting with /uploads/)
    const result = await Report.deleteMany({
      imageUrl: { $regex: '^/uploads/' }
    });

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} reports with local URLs`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error cleaning up reports:', error);
    res.status(500).json({ error: 'Failed to clean up reports' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
    }
  }
  console.error(error);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the application`);
  console.log(`Google Cloud Storage bucket: ${bucketName}`);
}); 