const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  youtubeUrl: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/.test(v);
      },
      message: 'Please provide a valid YouTube URL'
    }
  },
  thumbnail: {
    type: String,
    default: ''
  },
  topics: [{
    type: String,
    required: true,
    trim: true,
    lowercase: true
  }],
  skills: [{
    type: String,
    required: true,
    trim: true,
    lowercase: true
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  instructor: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ Fixed indexes (no parallel arrays)
videoSchema.index({ topics: 1 });
videoSchema.index({ skills: 1 });
videoSchema.index({ isActive: 1 });

// Text index for search
videoSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for YouTube video ID
videoSchema.virtual('videoId').get(function () {
  const url = this.youtubeUrl;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
});

// Virtual for embedded URL
videoSchema.virtual('embedUrl').get(function () {
  const videoId = this.videoId;
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
});

// Method to increment view count
videoSchema.methods.incrementView = function () {
  this.viewCount += 1;
  return this.save();
};

// Static method to get videos by topic
videoSchema.statics.getByTopic = function (topic) {
  return this.find({
    topics: { $in: [topic.toLowerCase()] },
    isActive: true
  }).sort({ isFeatured: -1, rating: -1, createdAt: -1 });
};

// Static method to get videos by skill
videoSchema.statics.getBySkill = function (skill) {
  return this.find({
    skills: { $in: [skill.toLowerCase()] },
    isActive: true
  }).sort({ isFeatured: -1, rating: -1, createdAt: -1 });
};

// Static method to search videos
videoSchema.statics.search = function (query) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { topics: { $in: [new RegExp(query, 'i')] } },
          { skills: { $in: [new RegExp(query, 'i')] } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      }
    ]
  }).sort({ isFeatured: -1, rating: -1, createdAt: -1 });
};

module.exports = mongoose.model('Video', videoSchema);
