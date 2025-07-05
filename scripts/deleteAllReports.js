const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mb5327:FQGKfyusGK14vCYe@drugfreeindia.az3rc74.mongodb.net/?retryWrites=true&w=majority&appName=DrugFreeIndia';

// Define the Report schema (copied from server.js)
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

async function deleteAllReports() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    const result = await Report.deleteMany({});
    console.log(`Deleted ${result.deletedCount} reports.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error deleting reports:', err);
    process.exit(1);
  }
}

deleteAllReports(); 