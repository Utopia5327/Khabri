const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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

// Multer configuration for image uploads
const storage = multer.diskStorage({
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
  storage: storage,
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
  },
  reporterInfo: {
    type: String,
    default: 'Anonymous'
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

// POST /api/report - Submit a new report
app.post('/api/report', upload.single('photo'), async (req, res) => {
  try {
    const { description, latitude, longitude, address, reporterInfo } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    if (!description || !latitude || !longitude) {
      return res.status(400).json({ error: 'Description, latitude, and longitude are required' });
    }

    const report = new Report({
      description,
      imageUrl: `/uploads/${req.file.filename}`,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      address: address || '',
      reporterInfo: reporterInfo || 'Anonymous'
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

// GET /api/reports - Get all reports
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
        status: report.status,
        reporterInfo: report.reporterInfo
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
}); 