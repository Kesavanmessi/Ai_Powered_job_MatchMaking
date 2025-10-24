const express = require('express');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        fullName: req.user.fullName,
        profile: req.user.profile,
        skills: req.user.skills,
        preferences: req.user.preferences,
        lastLogin: req.user.lastLogin,
        emailVerified: req.user.emailVerified,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { profile, skills, preferences } = req.body;
    const updates = {};

    if (profile) updates.profile = { ...req.user.profile, ...profile };
    if (skills) updates.skills = skills;
    if (preferences) updates.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        fullName: user.fullName,
        profile: user.profile,
        skills: user.skills,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const Match = require('../models/Match');
    const Resume = require('../models/Resume');
    const Job = require('../models/Job');

    // Get user's matches
    const matches = await Match.find({ user: req.user._id });
    const activeResumes = await Resume.countDocuments({ user: req.user._id, isActive: true });
    
    let stats = {
      totalMatches: matches.length,
      averageMatchScore: 0,
      topMatchScore: 0,
      activeResumes,
      totalResumes: await Resume.countDocuments({ user: req.user._id }),
      jobsApplied: 0,
      profileCompleteness: 0
    };

    if (matches.length > 0) {
      const scores = matches.map(m => m.matchScore);
      stats.averageMatchScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      stats.topMatchScore = Math.max(...scores);
      stats.jobsApplied = matches.filter(m => m.status === 'applied').length;
    }

    // Calculate profile completeness
    const profileFields = [
      req.user.profile?.phone,
      req.user.profile?.location,
      req.user.profile?.bio,
      req.user.profile?.linkedin,
      req.user.skills?.length > 0,
      req.user.preferences?.jobTypes?.length > 0
    ];
    
    const completedFields = profileFields.filter(Boolean).length;
    stats.profileCompleteness = Math.round((completedFields / profileFields.length) * 100);

    res.json({ stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      message: 'Failed to fetch user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/users/dashboard
// @desc    Get dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const Match = require('../models/Match');
    const Resume = require('../models/Resume');
    const Job = require('../models/Job');

    // Get recent matches
    const recentMatches = await Match.find({ user: req.user._id })
      .populate('job', 'title company location')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get top matches
    const topMatches = await Match.find({ user: req.user._id })
      .populate('job', 'title company location compensation')
      .sort({ matchScore: -1 })
      .limit(3);

    // Get active resume
    const activeResume = await Resume.getLatestForUser(req.user._id);

    // Get recommended jobs (simplified)
    const recommendedJobs = await Job.find({ status: 'active' })
      .populate('postedBy', 'firstName lastName company')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-embedding');

    // Get user stats
    const stats = {
      totalMatches: await Match.countDocuments({ user: req.user._id }),
      averageMatchScore: 0,
      activeResumes: await Resume.countDocuments({ user: req.user._id, isActive: true }),
      jobsApplied: await Match.countDocuments({ user: req.user._id, status: 'applied' })
    };

    const allMatches = await Match.find({ user: req.user._id });
    if (allMatches.length > 0) {
      const scores = allMatches.map(m => m.matchScore);
      stats.averageMatchScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    res.json({
      dashboard: {
        recentMatches: recentMatches.map(match => ({
          id: match._id,
          job: match.job,
          matchScore: match.matchScore,
          status: match.status,
          createdAt: match.createdAt
        })),
        topMatches: topMatches.map(match => ({
          id: match._id,
          job: match.job,
          matchScore: match.matchScore,
          breakdown: match.breakdown
        })),
        activeResume: activeResume ? {
          id: activeResume._id,
          fileName: activeResume.fileName,
          aiAnalysis: activeResume.aiAnalysis
        } : null,
        recommendedJobs: recommendedJobs.map(job => ({
          id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          jobType: job.jobType,
          compensation: job.compensation
        })),
        stats
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      message: 'Failed to fetch dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', auth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete account' });
    }

    // Verify password
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Delete user and related data
    await User.findByIdAndDelete(req.user._id);
    
    // Note: In production, you might want to soft delete and clean up related data
    // await Resume.deleteMany({ user: req.user._id });
    // await Match.deleteMany({ user: req.user._id });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router;
