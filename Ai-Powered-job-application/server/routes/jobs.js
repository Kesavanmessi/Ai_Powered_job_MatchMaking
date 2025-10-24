  const express = require('express');
  const Job = require('../models/Job');
  const Match = require('../models/Match');
  const aiMatching = require('../services/aiMatching');
  const { auth, authorize } = require('../middleware/auth');

  const router = express.Router();

  // @route   POST /api/jobs
  // @desc    Create a new job posting
  // @access  Private (Recruiters only)
  router.post('/', auth, authorize('recruiter'), async (req, res) => {
    try {
      const jobData = {
        ...req.body,
        postedBy: req.user._id
      };

      // Generate embedding for job description
      const jobText = `${jobData.title} ${jobData.description} ${jobData.requirements.skills.map(s => s.name).join(' ')}`;
      const embedding = await aiMatching.generateEmbedding(jobText);
      jobData.embedding = embedding;

      const job = new Job(jobData);
      await job.save();

      res.status(201).json({
        message: 'Job posted successfully',
        job: {
          id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          jobType: job.jobType,
          status: job.status,
          createdAt: job.createdAt
        }
      });
    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({
        message: 'Failed to create job posting',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  });

  // @route   GET /api/jobs
  // @desc    Get all jobs with optional filters
  // @access  Public
  router.get('/', async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        location,
        jobType,
        remote,
        minSalary,
        maxSalary,
        skills,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const query = { status: 'active' };

      // Text search
      if (search) {
        query.$text = { $search: search };
      }

      // Location filter
      if (location) {
        query['location.city'] = new RegExp(location, 'i');
      }

      // Remote work filter
      if (remote === 'true') {
        query['location.remote'] = true;
      }

      // Job type filter
      if (jobType) {
        query.jobType = jobType;
      }

      // Salary range filter
      if (minSalary || maxSalary) {
        query['compensation.salary'] = {};
        if (minSalary) query['compensation.salary'].$gte = parseInt(minSalary);
        if (maxSalary) query['compensation.salary'].$lte = parseInt(maxSalary);
      }

      // Skills filter
      if (skills) {
        const skillArray = skills.split(',').map(s => s.trim());
        query['requirements.skills.name'] = { $in: skillArray };
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const jobs = await Job.find(query)
        .populate('postedBy', 'firstName lastName company')
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-embedding');

      const totalJobs = await Job.countDocuments(query);

      res.json({
        jobs: jobs.map(job => ({
          id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          jobType: job.jobType,
          compensation: job.compensation,
          requirements: {
            skills: job.requirements.skills,
            experience: job.requirements.experience
          },
          postedBy: job.postedBy,
          views: job.views,
          applicationsCount: job.applicationsCount,
          createdAt: job.createdAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalJobs / limit),
          totalJobs,
          hasNext: page * limit < totalJobs,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Get jobs error:', error);
      res.status(500).json({
        message: 'Failed to fetch jobs',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  });

  // @route   GET /api/jobs/search
  // @desc    Semantic search for jobs
  // @access  Private
  router.post('/search', auth, async (req, res) => {
    try {
      const { query, limit = 20 } = req.body;

      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }

      // Generate embedding for search query
      const queryEmbedding = await aiMatching.generateEmbedding(query);

      // Find jobs using vector similarity (simplified - in production use proper vector DB)
      const jobs = await Job.find({ status: 'active' })
        .populate('postedBy', 'firstName lastName company')
        .limit(100); // Get more jobs for similarity calculation

      const jobsWithSimilarity = jobs.map(job => {
        if (job.embedding && job.embedding.length > 0) {
          const similarity = aiMatching.cosineSimilarity(queryEmbedding, job.embedding);
          return { job, similarity };
        }
        return { job, similarity: 0 };
      });

      // Sort by similarity and limit results
      const sortedJobs = jobsWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .filter(item => item.similarity > 0.3); // Minimum similarity threshold

      res.json({
        jobs: sortedJobs.map(item => ({
          id: item.job._id,
          title: item.job.title,
          company: item.job.company,
          location: item.job.location,
          jobType: item.job.jobType,
          compensation: item.job.compensation,
          requirements: {
            skills: item.job.requirements.skills,
            experience: item.job.requirements.experience
          },
          similarity: item.similarity,
          postedBy: item.job.postedBy,
          createdAt: item.job.createdAt
        })),
        query,
        totalResults: sortedJobs.length
      });
    } catch (error) {
      console.error('Job search error:', error);
      res.status(500).json({
        message: 'Failed to search jobs',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  });

  // @route   GET /api/jobs/my-jobs
  // @desc    Get jobs posted by current user
  // @access  Private (Recruiters only)
  router.get('/my-jobs', auth, authorize('recruiter', 'admin'), async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const query = { postedBy: req.user._id };
      if (status) query.status = status;

      const jobs = await Job.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-embedding');

      const totalJobs = await Job.countDocuments(query);

      res.json({
        jobs: jobs.map(job => ({
          id: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          jobType: job.jobType,
          status: job.status,
          views: job.views,
          applicationsCount: job.applicationsCount,
          createdAt: job.createdAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalJobs / limit),
          totalJobs,
          hasNext: page * limit < totalJobs,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Get my jobs error:', error);
      res.status(500).json({
        message: 'Failed to fetch your jobs',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  });

  // @route   GET /api/jobs/:id
  // @desc    Get job by ID
  // @access  Public
  router.get('/:id', async (req, res) => {
    try {
      const job = await Job.findById(req.params.id)
        .populate('postedBy', 'firstName lastName company profile')
        .select('-embedding');

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Increment view count
      job.views += 1;
      await job.save();

      res.json({
        job: {
          id: job._id,
          title: job.title,
          description: job.description,
          company: job.company,
          location: job.location,
          jobType: job.jobType,
          requirements: job.requirements,
          compensation: job.compensation,
          postedBy: job.postedBy,
          views: job.views,
          applicationsCount: job.applicationsCount,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        }
      });
    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({
        message: 'Failed to fetch job',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  });

  // @route   PUT /api/jobs/:id
  // @desc    Update job posting
  // @access  Private (Job owner or admin)
  router.put('/:id', auth, async (req, res) => {
    try {
      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Check if user owns the job or is admin
      if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this job' });
      }

      const updateData = { ...req.body };

      // Regenerate embedding if description or requirements changed
      if (updateData.description || updateData.requirements) {
        const jobText = `${updateData.title || job.title} ${updateData.description || job.description} ${(updateData.requirements?.skills || job.requirements.skills).map(s => s.name).join(' ')}`;
        updateData.embedding = await aiMatching.generateEmbedding(jobText);
      }

      const updatedJob = await Job.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).populate('postedBy', 'firstName lastName company');

      res.json({
        message: 'Job updated successfully',
        job: {
          id: updatedJob._id,
          title: updatedJob.title,
          company: updatedJob.company,
          location: updatedJob.location,
          jobType: updatedJob.jobType,
          status: updatedJob.status,
          updatedAt: updatedJob.updatedAt
        }
      });
    } catch (error) {
      console.error('Update job error:', error);
      res.status(500).json({
        message: 'Failed to update job',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  });

  // @route   DELETE /api/jobs/:id
  // @desc    Delete job posting
  // @access  Private (Job owner or admin)
  router.delete('/:id', auth, async (req, res) => {
    try {
      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Check if user owns the job or is admin
      if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this job' });
      }

      await Job.findByIdAndDelete(req.params.id);

      res.json({ message: 'Job deleted successfully' });
    } catch (error) {
      console.error('Delete job error:', error);
      res.status(500).json({
        message: 'Failed to delete job',
        error: process.env.NODE_ENV === 'development' ? error.message : {}
      });
    }
  });

  module.exports = router;
