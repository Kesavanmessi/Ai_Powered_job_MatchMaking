const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: false // Optional when using Cloudinary
  },
  fileSize: Number,
  mimeType: String,
  parsedText: {
    type: String,
    required: true
  },
  extractedData: {
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      location: String,
      linkedin: String,
      github: String,
      website: String
    },
    summary: String,
    experience: [{
      company: String,
      position: String,
      duration: String,
      description: String,
      startDate: Date,
      endDate: Date,
      current: Boolean
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      graduationYear: Number,
      gpa: String
    }],
    skills: [{
      name: String,
      category: String,
      level: String,
      yearsOfExperience: Number
    }],
    certifications: [{
      name: String,
      issuer: String,
      date: Date,
      expiryDate: Date
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      url: String,
      startDate: Date,
      endDate: Date
    }],
    languages: [{
      name: String,
      proficiency: String
    }]
  },
  embedding: [Number], // Vector embedding for semantic matching
  skillsEmbedding: [Number], // Separate embedding for skills matching
  aiAnalysis: {
    strengths: [String],
    weaknesses: [String],
    improvementSuggestions: [String],
    skillGaps: [String],
    overallScore: Number,
    lastAnalyzed: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    filePath: String,
    uploadedAt: Date,
    version: Number
  }]
}, {
  timestamps: true
});

// Index for user resumes
resumeSchema.index({ user: 1, isActive: 1 });

// Index for embedding similarity search
resumeSchema.index({ embedding: '2dsphere' });
resumeSchema.index({ skillsEmbedding: '2dsphere' });

// Method to get latest resume for user
resumeSchema.statics.getLatestForUser = function(userId) {
  return this.findOne({ user: userId, isActive: true })
    .sort({ createdAt: -1 });
};

// Method to archive old resume
resumeSchema.methods.archive = function() {
  this.isActive = false;
  return this.save();
};

// Method to create new version
resumeSchema.methods.createNewVersion = function(newFilePath, newFileName) {
  this.previousVersions.push({
    filePath: this.filePath,
    uploadedAt: this.createdAt,
    version: this.version
  });
  
  this.filePath = newFilePath;
  this.fileName = newFileName;
  this.version += 1;
  
  return this.save();
};

module.exports = mongoose.model('Resume', resumeSchema);
