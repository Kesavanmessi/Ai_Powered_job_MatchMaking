const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const Resume = require('../models/Resume');
const resumeParser = require('../services/resumeParser');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary (only if credentials are provided)
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary configured successfully');
} else {
  console.warn('Cloudinary credentials not found. Resumes will be stored locally.');
}

// Use memory storage to handle file in buffer, then upload to Cloudinary manually
const memoryStorage = multer.memoryStorage();

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
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// @route   POST /api/resumes/upload
// @desc    Upload and parse resume
// @access  Private
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  // Declare variables outside try block for cleanup in catch
  let cloudinaryUrl = null;
  let cloudinaryPublicId = null;
  let localFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Archive existing active resume
    const existingResume = await Resume.findOne({ user: req.user._id, isActive: true });
    if (existingResume) {
      await existingResume.archive();
    }

    // Get file buffer (from memory storage)
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        // Upload buffer to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'raw',
              folder: 'resumes',
              public_id: `resume-${req.user._id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              format: mimeType === 'application/pdf' ? 'pdf' : 'docx'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(fileBuffer);
        });

        cloudinaryUrl = uploadResult.secure_url;
        cloudinaryPublicId = uploadResult.public_id;
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        // Continue without Cloudinary - file will be processed from buffer
        // In production, you might want to fail here or use fallback storage
      }
    } else {
      // Fallback: Save to local storage if Cloudinary is not configured
      const uploadsDir = path.join(__dirname, '../uploads/resumes');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const uniqueFileName = `resume-${req.user._id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${mimeType === 'application/pdf' ? 'pdf' : 'docx'}`;
      localFilePath = path.join(uploadsDir, uniqueFileName);
      fs.writeFileSync(localFilePath, fileBuffer);
    }

    // Parse the uploaded resume from buffer
    const parseResult = await resumeParser.parseResume(fileBuffer, mimeType);

    // Create new resume record
    const resume = new Resume({
      user: req.user._id,
      fileName: cloudinaryPublicId || fileName || `resume-${Date.now()}`,
      originalName: fileName,
      filePath: localFilePath || cloudinaryUrl || '', // Optional: can be Cloudinary URL or local path
      cloudinaryUrl: cloudinaryUrl,
      cloudinaryPublicId: cloudinaryPublicId,
      fileSize: fileSize,
      mimeType: mimeType,
      parsedText: parseResult.parsedText,
      extractedData: parseResult.extractedData,
      embedding: parseResult.embedding,
      skillsEmbedding: parseResult.skillsEmbedding,
      aiAnalysis: {
        ...parseResult.aiAnalysis,
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
        cloudinaryUrl: resume.cloudinaryUrl,
        fileSize: resume.fileSize,
        extractedData: resume.extractedData,
        aiAnalysis: resume.aiAnalysis,
        createdAt: resume.createdAt
      }
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    
    // Clean up locally saved file if it was created
    if (localFilePath && fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (unlinkError) {
        console.error('Error cleaning up local file:', unlinkError);
      }
    }

    // Clean up Cloudinary file if it was uploaded but parsing failed
    if (cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await cloudinary.uploader.destroy(cloudinaryPublicId, { resource_type: 'raw' });
      } catch (cloudinaryError) {
        console.error('Error cleaning up Cloudinary file:', cloudinaryError);
      }
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
    
    // Return 200 with null resume if no active resume exists (not 404)
    // This is more RESTful - 404 should be for route not found, not missing resource
    if (!resume) {
      return res.status(200).json({ 
        resume: null,
        message: 'No active resume found' 
      });
    }

    res.json({
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        originalName: resume.originalName,
        cloudinaryUrl: resume.cloudinaryUrl,
        fileSize: resume.fileSize,
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
