const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  company: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    website: String,
    logo: String,
    size: String,
    industry: String
  },
  location: {
    city: String,
    state: String,
    country: String,
    remote: {
      type: Boolean,
      default: false
    },
    hybrid: {
      type: Boolean,
      default: false
    }
  },
  requirements: {
    skills: [{
      name: String,
      level: {
        type: String,
        enum: ['required', 'preferred', 'nice-to-have'],
        default: 'required'
      },
      importance: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
      }
    }],
    experience: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        enum: ['years', 'months'],
        default: 'years'
      }
    },
    education: {
      degree: String,
      field: String,
      required: {
        type: Boolean,
        default: false
      }
    }
  },
  compensation: {
    salary: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly'
      }
    },
    benefits: [String],
    equity: String
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
    default: 'full-time'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'closed', 'draft'],
    default: 'active'
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applications: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
      default: 'pending'
    },
    matchScore: Number,
    notes: String
  }],
  embedding: [Number], // Vector embedding for semantic search
  tags: [String],
  views: {
    type: Number,
    default: 0
  },
  applicationsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for text search
jobSchema.index({
  title: 'text',
  description: 'text',
  'company.name': 'text',
  tags: 'text'
});

// Index for location and remote work
jobSchema.index({
  'location.city': 1,
  'location.remote': 1
});

// Index for embedding similarity search
jobSchema.index({ embedding: '2dsphere' });

// Virtual for application count
jobSchema.virtual('applicationCount').get(function() {
  return this.applications.length;
});

// Method to calculate match score
jobSchema.methods.calculateMatchScore = function(userSkills, userExperience) {
  // This will be implemented with AI matching logic
  return 0;
};

module.exports = mongoose.model('Job', jobSchema);
