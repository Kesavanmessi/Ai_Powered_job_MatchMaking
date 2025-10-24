const express = require('express');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const Resume = require('../models/Resume');
const Match = require('../models/Match');
const aiMatching = require('../services/aiMatching');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/applications
// @desc    Apply for a job
// @access  Private (Job seekers only)
router.post('/', auth, authorize('job_seeker'), async (req, res) => {
  try {
    const { jobId, coverLetter } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status !== 'active') {
      return res.status(400).json({ message: 'Job is not accepting applications' });
    }

    // Check if user already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: req.user._id
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied for this job' });
    }

    // Get user's latest resume
    const resume = await Resume.findOne({ user: req.user._id, isActive: true });
    if (!resume) {
      return res.status(400).json({ message: 'Please upload a resume before applying' });
    }

    // Calculate match score
    const matchScore = await aiMatching.calculateJobMatchScore(resume, job);

    // Create application
    const application = new Application({
      job: jobId,
      applicant: req.user._id,
      resume: resume._id,
      coverLetter,
      matchScore: matchScore.overallScore
    });

    await application.save();

    // Update job applications count
    job.applicationsCount += 1;
    await job.save();

    // Create or update match record
    await Match.findOneAndUpdate(
      { user: req.user._id, job: jobId },
      {
        user: req.user._id,
        job: jobId,
        resume: resume._id,
        matchScore: matchScore.overallScore,
        status: 'applied'
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      message: 'Application submitted successfully',
      application: {
        id: application._id,
        job: jobId,
        status: application.status,
        matchScore: application.matchScore,
        appliedAt: application.appliedAt
      }
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({
      message: 'Failed to submit application',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/applications/job/:jobId
// @desc    Get applications for a specific job (recruiters only)
// @access  Private (Job owner or admin)
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, sortBy = 'matchScore', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

    // Check if job exists and user has permission
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if user owns the job or is admin
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view applications for this job' });
    }

    const query = { job: jobId };
    if (status) query.status = status;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const applications = await Application.find(query)
      .populate('applicant', 'firstName lastName email profile')
      .populate('resume', 'fileName originalName extractedData')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalApplications = await Application.countDocuments(query);

    res.json({
      applications: applications.map(app => ({
        id: app._id,
        applicant: {
          id: app.applicant._id,
          name: `${app.applicant.firstName} ${app.applicant.lastName}`,
          email: app.applicant.email,
          profile: app.applicant.profile
        },
        resume: {
          id: app.resume._id,
          fileName: app.resume.fileName,
          originalName: app.resume.originalName,
          extractedData: app.resume.extractedData
        },
        status: app.status,
        matchScore: app.matchScore,
        coverLetter: app.coverLetter,
        recruiterNotes: app.recruiterNotes,
        appliedAt: app.appliedAt,
        reviewedAt: app.reviewedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalApplications / limit),
        totalApplications,
        hasNext: page * limit < totalApplications,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      message: 'Failed to fetch applications',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/applications/my-applications
// @desc    Get current user's applications
// @access  Private
router.get('/my-applications', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { applicant: req.user._id };
    if (status) query.status = status;

    const applications = await Application.find(query)
      .populate('job', 'title company location jobType status')
      .sort({ appliedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalApplications = await Application.countDocuments(query);

    res.json({
      applications: applications.map(app => ({
        id: app._id,
        job: {
          id: app.job._id,
          title: app.job.title,
          company: app.job.company,
          location: app.job.location,
          jobType: app.job.jobType,
          status: app.job.status
        },
        status: app.status,
        matchScore: app.matchScore,
        appliedAt: app.appliedAt,
        reviewedAt: app.reviewedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalApplications / limit),
        totalApplications,
        hasNext: page * limit < totalApplications,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get my applications error:', error);
    res.status(500).json({
      message: 'Failed to fetch your applications',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/applications/:id/status
// @desc    Update application status (recruiters only)
// @access  Private (Job owner or admin)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, recruiterNotes, interviewScheduled, interviewNotes } = req.body;

    const application = await Application.findById(id)
      .populate('job', 'postedBy');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if user owns the job or is admin
    if (application.job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    const updateData = { status };
    if (recruiterNotes) updateData.recruiterNotes = recruiterNotes;
    if (interviewScheduled) updateData.interviewScheduled = interviewScheduled;
    if (interviewNotes) updateData.interviewNotes = interviewNotes;
    if (status === 'reviewed') updateData.reviewedAt = new Date();
    updateData.lastUpdated = new Date();

    const updatedApplication = await Application.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('applicant', 'firstName lastName email');

    res.json({
      message: 'Application status updated successfully',
      application: {
        id: updatedApplication._id,
        status: updatedApplication.status,
        recruiterNotes: updatedApplication.recruiterNotes,
        interviewScheduled: updatedApplication.interviewScheduled,
        interviewNotes: updatedApplication.interviewNotes,
        lastUpdated: updatedApplication.lastUpdated
      }
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      message: 'Failed to update application status',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/applications/:id
// @desc    Get application details
// @access  Private (Application owner, job owner, or admin)
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title company location jobType postedBy')
      .populate('applicant', 'firstName lastName email profile')
      .populate('resume', 'fileName originalName extractedData');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check if user has permission to view this application
    const isApplicant = application.applicant._id.toString() === req.user._id.toString();
    const isJobOwner = application.job.postedBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isApplicant && !isJobOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this application' });
    }

    res.json({
      application: {
        id: application._id,
        job: {
          id: application.job._id,
          title: application.job.title,
          company: application.job.company,
          location: application.job.location,
          jobType: application.job.jobType
        },
        applicant: {
          id: application.applicant._id,
          name: `${application.applicant.firstName} ${application.applicant.lastName}`,
          email: application.applicant.email,
          profile: application.applicant.profile
        },
        resume: {
          id: application.resume._id,
          fileName: application.resume.fileName,
          originalName: application.resume.originalName,
          extractedData: application.resume.extractedData
        },
        status: application.status,
        matchScore: application.matchScore,
        coverLetter: application.coverLetter,
        recruiterNotes: application.recruiterNotes,
        interviewScheduled: application.interviewScheduled,
        interviewNotes: application.interviewNotes,
        appliedAt: application.appliedAt,
        reviewedAt: application.reviewedAt,
        lastUpdated: application.lastUpdated
      }
    });
  } catch (error) {
    console.error('Get application details error:', error);
    res.status(500).json({
      message: 'Failed to fetch application details',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router;


