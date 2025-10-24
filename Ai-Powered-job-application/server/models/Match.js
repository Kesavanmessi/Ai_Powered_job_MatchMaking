const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  breakdown: {
    skillsMatch: {
      score: Number,
      matchedSkills: [String],
      missingSkills: [String],
      extraSkills: [String]
    },
    experienceMatch: {
      score: Number,
      required: Number,
      actual: Number,
      gap: Number
    },
    educationMatch: {
      score: Number,
      required: Boolean,
      hasRequired: Boolean
    },
    locationMatch: {
      score: Number,
      isRemote: Boolean,
      locationMatch: Boolean
    },
    overallCompatibility: Number
  },
  aiInsights: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    interviewTips: [String],
    skillGaps: [{
      skill: String,
      importance: Number,
      currentLevel: String,
      requiredLevel: String,
      learningPath: String
    }]
  },
  status: {
    type: String,
    enum: ['new', 'viewed', 'applied', 'shortlisted', 'rejected', 'hired'],
    default: 'new'
  },
  userActions: [{
    action: {
      type: String,
      enum: ['viewed', 'applied', 'saved', 'shared']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  recruiterNotes: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for user-job uniqueness
matchSchema.index({ user: 1, job: 1 }, { unique: true });

// Index for match score sorting
matchSchema.index({ matchScore: -1 });

// Index for status filtering
matchSchema.index({ status: 1 });

// Method to update match score
matchSchema.methods.updateScore = function(newScore, breakdown, insights) {
  this.matchScore = newScore;
  this.breakdown = breakdown;
  this.aiInsights = insights;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to add user action
matchSchema.methods.addAction = function(action, notes = '') {
  this.userActions.push({
    action,
    notes,
    timestamp: new Date()
  });
  return this.save();
};

// Static method to get matches for user
matchSchema.statics.getUserMatches = function(userId, options = {}) {
  const query = { user: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.minScore) {
    query.matchScore = { $gte: options.minScore };
  }
  
  return this.find(query)
    .populate('job', 'title company description location compensation')
    .populate('resume', 'fileName extractedData.skills')
    .sort({ matchScore: -1, createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to get top matches for job
matchSchema.statics.getJobMatches = function(jobId, options = {}) {
  const query = { job: jobId };
  
  if (options.minScore) {
    query.matchScore = { $gte: options.minScore };
  }
  
  return this.find(query)
    .populate('user', 'firstName lastName email profile')
    .populate('resume', 'fileName extractedData')
    .sort({ matchScore: -1 })
    .limit(options.limit || 20);
};

module.exports = mongoose.model('Match', matchSchema);
