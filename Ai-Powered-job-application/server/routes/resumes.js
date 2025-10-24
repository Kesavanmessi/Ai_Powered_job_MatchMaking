const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Resume = require('../models/Resume');
const resumeParser = require('../services/resumeParser');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/resumes';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `resume-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// @route   POST /api/resumes/upload
// @desc    Upload and parse resume
// @access  Private
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Archive existing active resume
    const existingResume = await Resume.findOne({ user: req.user._id, isActive: true });
    if (existingResume) {
      await existingResume.archive();
    }

    // Parse the uploaded resume
    const parseResult = await resumeParser.parseResume(req.file.path, req.file.mimetype);
    
    // Perform AI analysis
    const aiAnalysis = await resumeParser.analyzeResumeWithAI(parseResult.extractedData);

    // Create new resume record
    const resume = new Resume({
      user: req.user._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      parsedText: parseResult.parsedText,
      extractedData: parseResult.extractedData,
      embedding: parseResult.embedding,
      skillsEmbedding: parseResult.skillsEmbedding,
      aiAnalysis: {
        ...aiAnalysis,
        lastAnalyzed: new Date()
      }
    });

    await resume.save();

    res.status(201).json({
      message: 'Resume uploaded and parsed successfully',
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        originalName: resume.originalName,
        extractedData: resume.extractedData,
        aiAnalysis: resume.aiAnalysis,
        createdAt: resume.createdAt
      }
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    
    // Clean up uploaded file if parsing failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      message: 'Failed to upload and parse resume',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/resumes/my-resumes
// @desc    Get user's resumes
// @access  Private
router.get('/my-resumes', auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-embedding -skillsEmbedding');

    res.json({
      resumes: resumes.map(resume => ({
        id: resume._id,
        fileName: resume.fileName,
        originalName: resume.originalName,
        fileSize: resume.fileSize,
        extractedData: resume.extractedData,
        aiAnalysis: resume.aiAnalysis,
        isActive: resume.isActive,
        version: resume.version,
        createdAt: resume.createdAt
      }))
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({
      message: 'Failed to fetch resumes',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/resumes/active
// @desc    Get user's active resume
// @access  Private
router.get('/active', auth, async (req, res) => {
  try {
    const resume = await Resume.getLatestForUser(req.user._id);
    
    if (!resume) {
      return res.status(404).json({ message: 'No active resume found' });
    }

    res.json({
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        originalName: resume.originalName,
        extractedData: resume.extractedData,
        aiAnalysis: resume.aiAnalysis,
        version: resume.version,
        createdAt: resume.createdAt
      }
    });
  } catch (error) {
    console.error('Get active resume error:', error);
    res.status(500).json({
      message: 'Failed to fetch active resume',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   PUT /api/resumes/:id/activate
// @desc    Activate a specific resume
// @access  Private
router.put('/:id/activate', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Deactivate all resumes for user
    await Resume.updateMany(
      { user: req.user._id },
      { isActive: false }
    );

    // Activate the selected resume
    const resume = await Resume.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { isActive: true },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({
      message: 'Resume activated successfully',
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        isActive: resume.isActive
      }
    });
  } catch (error) {
    console.error('Activate resume error:', error);
    res.status(500).json({
      message: 'Failed to activate resume',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   DELETE /api/resumes/:id
// @desc    Delete a resume
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const resume = await Resume.findOne({ _id: id, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(resume.filePath)) {
      fs.unlinkSync(resume.filePath);
    }

    // Delete resume record
    await Resume.findByIdAndDelete(id);

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({
      message: 'Failed to delete resume',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/resumes/:id/reanalyze
// @desc    Re-analyze resume with AI
// @access  Private
router.post('/:id/reanalyze', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const resume = await Resume.findOne({ _id: id, user: req.user._id });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Re-analyze with AI
    const aiAnalysis = await resumeParser.analyzeResumeWithAI(resume.extractedData);

    // Update resume with new analysis
    resume.aiAnalysis = {
      ...aiAnalysis,
      lastAnalyzed: new Date()
    };

    await resume.save();

    res.json({
      message: 'Resume re-analyzed successfully',
      aiAnalysis: resume.aiAnalysis
    });
  } catch (error) {
    console.error('Re-analyze resume error:', error);
    res.status(500).json({
      message: 'Failed to re-analyze resume',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

module.exports = router;
