const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'pending'
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100
  },
  coverLetter: {
    type: String,
    maxlength: 2000
  },
  recruiterNotes: {
    type: String,
    maxlength: 1000
  },
  interviewScheduled: {
    type: Date
  },
  interviewNotes: {
    type: String,
    maxlength: 1000
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one application per user per job
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

// Index for status filtering
applicationSchema.index({ status: 1 });

// Index for job-based queries
applicationSchema.index({ job: 1, status: 1 });

// Index for applicant-based queries
applicationSchema.index({ applicant: 1 });

// Index for match score sorting
applicationSchema.index({ matchScore: -1 });

module.exports = mongoose.model('Application', applicationSchema);


