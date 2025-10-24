const express = require('express');
const Match = require('../models/Match');
const aiMatching = require('../services/aiMatching');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/matches/my-matches
// @desc    Get job matches for current user
// @access  Private
router.get('/my-matches', auth, async (req, res) => {
  try {
    const { status, minScore, limit = 20 } = req.query;

    const matches = await Match.getUserMatches(req.user._id, {
      status,
      minScore: minScore ? parseInt(minScore) : undefined,
      limit: parseInt(limit)
    });

    res.json({
      matches: matches.map(match => ({
        id: match._id,
        job: {
          id: match.job._id,
          title: match.job.title,
          company: match.job.company,
          location: match.job.location,
          jobType: match.job.jobType,
          compensation: match.job.compensation
        },
        matchScore: match.matchScore,
        breakdown: match.breakdown,
        aiInsights: match.aiInsights,
        status: match.status,
        createdAt: match.createdAt,
        lastUpdated: match.lastUpdated
      })),
      totalMatches: matches.length
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      message: 'Failed to fetch job matches',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/matches/generate
// @desc    Generate new job matches for user
// @access  Private
router.post('/generate', auth, async (req, res) => {
  try {
    const { minScore = 30, limit = 20 } = req.body;

    // Find job matches using AI
    const matches = await aiMatching.findJobMatches(req.user._id, {
      minScore: parseInt(minScore),
      limit: parseInt(limit)
    });

    // Save matches to database
    const savedMatches = [];
    for (const match of matches) {
      const savedMatch = await aiMatching.saveMatch(
        req.user._id,
        match.job._id,
        match.resume._id,
        { overallScore: match.matchScore },
        match.breakdown,
        match.insights
      );
      savedMatches.push(savedMatch);
    }

    res.json({
      message: 'Job matches generated successfully',
      matches: savedMatches.map(match => ({
        id: match._id,
        job: {
          id: match.job._id,
          title: match.job.title,
          company: match.job.company,
          location: match.job.location
        },
        matchScore: match.matchScore,
        breakdown: match.breakdown,
        aiInsights: match.aiInsights
      })),
      totalMatches: savedMatches.length
    });
  } catch (error) {
    console.error('Generate matches error:', error);
    res.status(500).json({
      message: 'Failed to generate job matches',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/matches/:id
// @desc    Get specific match details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const match = await Match.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('job', 'title company description location requirements compensation')
      .populate('resume', 'fileName extractedData');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.json({
      match: {
        id: match._id,
        job: match.job,
        resume: match.resume,
        matchScore: match.matchScore,
        breakdown: match.breakdown,
        aiInsights: match.aiInsights,
        status: match.status,
        userActions: match.userActions,
        createdAt: match.createdAt,
        lastUpdated: match.lastUpdated
      }
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      message: 'Failed to fetch match details',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/matches/:id/status
// @desc    Update match status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const match = await Match.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { 
        status,
        recruiterNotes: notes,
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.json({
      message: 'Match status updated successfully',
      match: {
        id: match._id,
        status: match.status,
        recruiterNotes: match.recruiterNotes,
        lastUpdated: match.lastUpdated
      }
    });
  } catch (error) {
    console.error('Update match status error:', error);
    res.status(500).json({
      message: 'Failed to update match status',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/matches/:id/action
// @desc    Add user action to match
// @access  Private
router.post('/:id/action', auth, async (req, res) => {
  try {
    const { action, notes } = req.body;

    const match = await Match.findOne({ _id: req.params.id, user: req.user._id });
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    await match.addAction(action, notes);

    res.json({
      message: 'Action recorded successfully',
      action: {
        action,
        notes,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Add match action error:', error);
    res.status(500).json({
      message: 'Failed to record action',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/matches/job/:jobId
// @desc    Get matches for a specific job (for recruiters)
// @access  Private
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const { minScore, limit = 20 } = req.query;

    const matches = await Match.getJobMatches(req.params.jobId, {
      minScore: minScore ? parseInt(minScore) : undefined,
      limit: parseInt(limit)
    });

    res.json({
      matches: matches.map(match => ({
        id: match._id,
        user: {
          id: match.user._id,
          firstName: match.user.firstName,
          lastName: match.user.lastName,
          email: match.user.email,
          profile: match.user.profile
        },
        resume: {
          id: match.resume._id,
          fileName: match.resume.fileName,
          extractedData: match.resume.extractedData
        },
        matchScore: match.matchScore,
        breakdown: match.breakdown,
        aiInsights: match.aiInsights,
        status: match.status,
        recruiterNotes: match.recruiterNotes,
        createdAt: match.createdAt
      })),
      totalMatches: matches.length
    });
  } catch (error) {
    console.error('Get job matches error:', error);
    res.status(500).json({
      message: 'Failed to fetch job matches',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router;
