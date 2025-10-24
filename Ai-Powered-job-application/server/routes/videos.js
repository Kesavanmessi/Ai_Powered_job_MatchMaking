const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   GET /api/videos
// @desc    Get all videos with optional filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      topic, 
      skill, 
      difficulty, 
      search, 
      page = 1, 
      limit = 10,
      featured 
    } = req.query;

    let query = { isActive: true };

    // Apply filters
    if (topic) {
      query.topics = { $in: [topic.toLowerCase()] };
    }

    if (skill) {
      query.skills = { $in: [skill.toLowerCase()] };
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { topics: { $in: [new RegExp(search, 'i')] } },
        { skills: { $in: [new RegExp(search, 'i')] } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const videos = await Video.find(query)
      .populate('addedBy', 'firstName lastName')
      .sort({ isFeatured: -1, rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Video.countDocuments(query);

    res.json({
      videos,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/videos/:id
// @desc    Get single video
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('addedBy', 'firstName lastName');

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Increment view count
    await video.incrementView();

    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/videos
// @desc    Create new video (Admin only)
// @access  Private (Admin)
router.post('/', 
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('youtubeUrl').isURL().withMessage('Valid YouTube URL is required'),
  body('topics').isArray({ min: 1 }).withMessage('At least one topic is required'),
  body('skills').isArray({ min: 1 }).withMessage('At least one skill is required'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  body('instructor').notEmpty().withMessage('Instructor name is required'),
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      youtubeUrl,
      topics,
      skills,
      difficulty = 'beginner',
      duration,
      instructor,
      tags = [],
      isFeatured = false
    } = req.body;

    // Extract video ID for thumbnail
    const videoId = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId[1]}/maxresdefault.jpg` : '';

    const video = new Video({
      title,
      description,
      youtubeUrl,
      thumbnail,
      topics: topics.map(t => t.toLowerCase()),
      skills: skills.map(s => s.toLowerCase()),
      difficulty,
      duration,
      instructor,
      tags: tags.map(t => t.toLowerCase()),
      isFeatured,
      addedBy: req.user.id
    });

    await video.save();
    await video.populate('addedBy', 'firstName lastName');

    res.status(201).json(video);
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/videos/:id
// @desc    Update video (Admin only)
// @access  Private (Admin)
router.put('/:id', 
  auth,
  body('title').optional().notEmpty(),
  body('description').optional().notEmpty(),
  body('youtubeUrl').optional().isURL(),
  body('topics').optional().isArray({ min: 1 }),
  body('skills').optional().isArray({ min: 1 }),
  body('duration').optional().isNumeric(),
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const updateData = { ...req.body };

    // Update thumbnail if YouTube URL changed
    if (updateData.youtubeUrl) {
      const videoId = updateData.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      updateData.thumbnail = videoId ? `https://img.youtube.com/vi/${videoId[1]}/maxresdefault.jpg` : '';
    }

    // Convert arrays to lowercase
    if (updateData.topics) {
      updateData.topics = updateData.topics.map(t => t.toLowerCase());
    }
    if (updateData.skills) {
      updateData.skills = updateData.skills.map(s => s.toLowerCase());
    }
    if (updateData.tags) {
      updateData.tags = updateData.tags.map(t => t.toLowerCase());
    }

    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('addedBy', 'firstName lastName');

    res.json(updatedVideo);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/videos/:id
// @desc    Delete video (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/videos/topics/list
// @desc    Get all unique topics
// @access  Public
router.get('/topics/list', async (req, res) => {
  try {
    const topics = await Video.distinct('topics', { isActive: true });
    res.json(topics.sort());
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/videos/skills/list
// @desc    Get all unique skills
// @access  Public
router.get('/skills/list', async (req, res) => {
  try {
    const skills = await Video.distinct('skills', { isActive: true });
    res.json(skills.sort());
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/videos/:id/rate
// @desc    Rate a video
// @access  Private
router.post('/:id/rate', 
  auth,
  body('rating').isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Update rating (simple average for now)
    const newRating = (video.rating + req.body.rating) / 2;
    video.rating = Math.round(newRating * 10) / 10; // Round to 1 decimal place

    await video.save();
    res.json({ message: 'Rating updated successfully', rating: video.rating });
  } catch (error) {
    console.error('Error rating video:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

