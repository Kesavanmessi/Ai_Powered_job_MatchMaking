// resumeParser.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize the Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Get model from environment or use default (gemini-pro is more widely available)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Embedding model - use text-embedding-004 for better quality
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-004';

class ResumeParser {
  constructor() {
    this.supportedFormats = {
      'application/pdf': (filePathOrBuffer, mimeType) => this.parsePDF(filePathOrBuffer, mimeType),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (filePathOrBuffer, mimeType) => this.parseDOCX(filePathOrBuffer, mimeType)
    };
  }

  // === MAIN PARSE FUNCTION ===
  async parseResume(filePathOrBuffer, mimeType) {
    try {
      const parser = this.supportedFormats[mimeType];
      if (!parser) throw new Error(`Unsupported file format: ${mimeType}`);

      // 1. Parse File to Text (supports both file path and buffer)
      const text = await parser(filePathOrBuffer, mimeType);
      
      // 2. Extract Structured Data using AI
      const extractedData = await this.extractStructuredData(text);
      
      // 3. Generate Embeddings (for retrieval/search)
      const embedding = await this.generateEmbedding(text);
      const skillsEmbedding = await this.generateSkillsEmbedding(extractedData.skills);
      
      // 4. Analyze Data using AI
      const aiAnalysis = await this.analyzeResumeWithAI(extractedData);

      return {
        parsedText: text,
        extractedData,
        embedding,
        skillsEmbedding,
        aiAnalysis
      };
    } catch (error) {
      console.error('Resume parsing error:', error);
      throw new Error(`Failed to parse resume: ${error.message}`);
    }
  }

  // --- FILE PARSERS ---
  async parsePDF(filePathOrBuffer, mimeType) {
    let tempFilePath = null;
    try {
      // Handle both file path (string) and buffer
      let dataBuffer;
      let shouldDeleteTempFile = false;
      
      if (Buffer.isBuffer(filePathOrBuffer)) {
        // If it's already a buffer, create a fresh standalone Buffer
        // This ensures we have a clean Buffer instance without any view issues
        dataBuffer = Buffer.from(filePathOrBuffer);
        
        // Validate buffer is not empty
        if (!dataBuffer || dataBuffer.length === 0) {
          throw new Error('Empty file buffer');
        }
        
        // Verify it's a valid PDF by checking the header (PDF files start with %PDF)
        if (dataBuffer.length < 4 || dataBuffer.toString('ascii', 0, 4) !== '%PDF') {
          throw new Error('Invalid PDF file: File does not appear to be a valid PDF');
        }
        
        // Try to parse directly with the buffer first
        // If that fails, fall back to temp file approach
        try {
          const data = await pdfParse(dataBuffer);
          return data.text || '';
        } catch (directParseError) {
          // If direct buffer parsing fails, try using a temp file
          console.warn('Direct buffer parsing failed, trying temp file approach:', directParseError.message);
          
          // Write buffer to temporary file
          tempFilePath = path.join(os.tmpdir(), `resume-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
          fs.writeFileSync(tempFilePath, dataBuffer);
          shouldDeleteTempFile = true;
          
          // Read file and parse (this should work since it's a fresh file)
          const fileBuffer = fs.readFileSync(tempFilePath);
          const data = await pdfParse(fileBuffer);
          
          // Clean up temp file
          if (shouldDeleteTempFile && tempFilePath && fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
              tempFilePath = null;
            } catch (unlinkError) {
              console.error('Error deleting temp file:', unlinkError);
            }
          }
          
          return data.text || '';
        }
      } else if (typeof filePathOrBuffer === 'string') {
        // If it's a file path, read it from disk and parse
        const data = await pdfParse(fs.readFileSync(filePathOrBuffer));
        return data.text || '';
      } else {
        throw new Error('Invalid input: expected file path (string) or buffer');
      }
    } catch (error) {
      // Clean up temp file on error
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (unlinkError) {
          console.error('Error deleting temp file on error:', unlinkError);
        }
      }
      
      console.error('PDF parsing error:', error);
      console.error('Input type:', Buffer.isBuffer(filePathOrBuffer) ? 'Buffer' : typeof filePathOrBuffer);
      if (Buffer.isBuffer(filePathOrBuffer)) {
        console.error('Buffer length:', filePathOrBuffer.length);
        console.error('Buffer first bytes:', filePathOrBuffer.slice(0, 10).toString('hex'));
      }
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  async parseDOCX(filePathOrBuffer, mimeType) {
    try {
      // Handle both file path (string) and buffer
      if (Buffer.isBuffer(filePathOrBuffer)) {
        // For buffer, we need to use extractRawText with buffer
        const result = await mammoth.extractRawText({ buffer: filePathOrBuffer });
        return result.value;
      } else if (typeof filePathOrBuffer === 'string') {
        // For file path, use path option
        const result = await mammoth.extractRawText({ path: filePathOrBuffer });
        return result.value;
      } else {
        throw new Error('Invalid input: expected file path (string) or buffer');
      }
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  // === RULE-BASED FALLBACK EXTRACTION ===
  // [Keeping ruleBasedExtraction as is, as it's a fallback]
  ruleBasedExtraction(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const sectionRegex = /^(skills?|technical skills?|projects?|experience|work experience|education|certifications?|languages?)\b[:\-]?/i;
    const sections = {};
    let current = 'other';
    for (const line of lines) {
      const m = line.match(sectionRegex);
      if (m) {
        current = m[1].toLowerCase();
        sections[current] = sections[current] || [];
      } else {
        sections[current] = sections[current] || [];
        sections[current].push(line);
      }
    }

    const splitList = (s) => s
      .replace(/[•\u2022\u25CF\-\*]/g, ' ')
      .split(/[\,\|]/)
      .map(x => x.trim())
      .filter(x => x.length > 0 && x.length < 80);

    const nameLine = lines[0] || '';
    const websiteMatch = text.match(/\b(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(?:\/[\w\-./?%&=]*)?/i);

    const skillsBlock = (sections['skills'] || sections['technical skills'] || []).join(' ');
    const skillNames = Array.from(new Set(splitList(skillsBlock)));
    const skills = skillNames.map(n => ({ name: n, category: '', level: '', yearsOfExperience: undefined })).slice(0, 100);

    const projectsLines = sections['projects'] || [];
    const projects = projectsLines
      .map(l => l.replace(/^[-•\*]\s*/, ''))
      .filter(l => l.length > 0)
      .map(l => ({ name: l.split(':')[0].trim().slice(0, 80), description: l, technologies: splitList(l), url: '', startDate: '', endDate: '' }))
      .slice(0, 20);

    const expLines = (sections['experience'] || sections['work experience'] || []).map(l => l.replace(/^[-•\*]\s*/, ''));
    const experience = expLines
      .filter(l => l.length > 0)
      .map(l => ({ company: '', position: l.split(' at ')[0].slice(0, 80), duration: '', description: l, startDate: '', endDate: '', current: false }))
      .slice(0, 20);

    const eduLines = (sections['education'] || []).map(l => l.replace(/^[-•\*]\s*/, ''));
    const education = eduLines
      .map(l => ({ institution: l, degree: '', field: '', graduationYear: undefined, gpa: '' }))
      .slice(0, 10);

    const certLines = (sections['certifications'] || sections['certification'] || []).map(l => l.replace(/^[-•\*]\s*/, ''));
    const certifications = certLines.map(l => ({ name: l, issuer: '', date: '', expiryDate: '' })).slice(0, 20);

    const langLines = (sections['languages'] || []).join(' ');
    const languages = splitList(langLines).map(n => ({ name: n, proficiency: '' })).slice(0, 20);

    return {
      personalInfo: {
        name: nameLine,
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: '',
        website: websiteMatch?.[0] || ''
      },
      summary: '',
      experience,
      education,
      skills,
      certifications,
      projects,
      languages,
      achievements: []
    };
  }

  // --- AI STRUCTURED DATA EXTRACTION (with Guaranteed JSON Output) ---
  async extractStructuredData(text) {
    try {
      // Using a powerful, guided prompt to ensure correct JSON formatting
      const prompt = `
**SYSTEM INSTRUCTION:**
You are an expert resume parsing API. Your sole task is to analyze the provided raw resume text and return a comprehensive JSON object that STRICTLY adheres to the requested schema. DO NOT generate any text outside the JSON object. You must handle formatting and line break inconsistencies to ensure clean data for every field.

**GUIDANCE FOR EXTRACTION (CRITICAL):**
- Group fragmented education lines (Degree, Institution, Dates, GPA) into a single object. The key delimiter for details is '||'.
- For Skills, you must split the list by '||' and clean up parenthetical notes to ensure each is a unique skill object with a 'name' field.
- Remove titles like 'Software Engineer' from the main 'name' field.

**REQUIRED JSON SCHEMA OUTPUT (STRICTLY ADHERE TO THIS FORMAT):**
{
    "personalInfo": {
        "name": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "linkedin": "string",
        "github": "string"
    },
    "summary": "string",
    "experience": [
        {
            "company": "string",
            "position": "string",
            "startDate": "string/null",
            "endDate": "string/null"
        }
    ],
    "education": [
        {
            "institution": "string",
            "degree": "string",
            "dates": "string",
            "gpa": "string"
        }
    ],
    "skills": [
        {
            "name": "string"
        }
    ],
    "certifications": [
        {
            "name": "string"
        }
    ],
    "projects": [
        {
            "name": "string",
            "description": "string",
            "technologies": ["string"]
        }
    ]
}

---
**RAW RESUME TEXT TO PARSE:**
${text}
      `;

      // Use configured Gemini model for data extraction
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const extractedText = response.text();

      // Clean and parse JSON (handles ```json fences)
      const fencedClean = extractedText.replace(/```json|```/g, '').trim();
      const jsonStart = fencedClean.indexOf('{');
      const jsonEnd = fencedClean.lastIndexOf('}');
      const cleanJson = fencedClean.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(cleanJson);

    } catch (error) {
      console.error('AI extraction error:', error);
      // Use richer rule-based extraction merged with minimal info
      const ruleBased = this.ruleBasedExtraction(text);
      const minimal = this.basicTextExtraction(text);
      return {
        personalInfo: {
          name: ruleBased.personalInfo.name || minimal.personalInfo.name || '',
          email: minimal.personalInfo.email || ruleBased.personalInfo.email || '',
          phone: minimal.personalInfo.phone || ruleBased.personalInfo.phone || '',
          location: ruleBased.personalInfo.location || '',
          linkedin: minimal.personalInfo.linkedin || ruleBased.personalInfo.linkedin || '',
          github: minimal.personalInfo.github || ruleBased.personalInfo.github || '',
          website: ruleBased.personalInfo.website || ''
        },
        summary: ruleBased.summary || '',
        experience: ruleBased.experience || [],
        education: ruleBased.education || [],
        skills: ruleBased.skills || [],
        certifications: ruleBased.certifications || [],
        projects: ruleBased.projects || [],
        languages: ruleBased.languages || [],
        achievements: ruleBased.achievements || []
      };
    }
  }

  // --- FALLBACK BASIC EXTRACTION ---
  basicTextExtraction(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/gi;
    const githubRegex = /github\.com\/[a-zA-Z0-9-]+/gi;

    return {
      personalInfo: {
        name: '',
        email: text.match(emailRegex)?.[0] || '',
        phone: text.match(phoneRegex)?.[0] || '',
        linkedin: text.match(linkedinRegex)?.[0] || '',
        github: text.match(githubRegex)?.[0] || '',
        website: ''
      },
      summary: '',
      education: [],
      projects: [],
      skills: [],
      achievements: []
    };
  }

  // --- EMBEDDING GENERATION ---
  async generateEmbedding(text) {
    try {
      const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
      // Truncate text to avoid model input limits if necessary
      const result = await model.embedContent(text.substring(0, 8000));
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding generation error:', error);
      return []; // prevent crash on quota limit
    }
  }

  async generateSkillsEmbedding(skills) {
    try {
      if (!skills || skills.length === 0) return [];
      const skillsText = skills.map(skill => skill.name || skill).join(', ');
      const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
      const result = await model.embedContent(skillsText);
      return result.embedding.values;
    } catch (error) {
      console.error('Skills embedding generation error:', error);
      return [];
    }
  }

  // --- AI RESUME ANALYSIS (with Guaranteed JSON Output) ---
  async analyzeResumeWithAI(resumeData) {
    try {
      const prompt = `
You are an expert career assistant. Analyze this candidate’s structured resume data and provide a highly objective and constructive review.

Structured Resume Data:
${JSON.stringify(resumeData, null, 2)}

Provide the analysis in this JSON format:
{
    "strengths": ["string"],
    "weaknesses": ["string"],
    "improvementSuggestions": ["string"],
    "skillGaps": ["string"],
    "overallScore": 0,
    "lastAnalyzed": "string"
}

Provide the following analysis points, making sure the overallScore is a thoughtful reflection of the candidate's quality (0-100).
      `;

      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean and parse JSON response
      let fencedClean = text.replace(/```json|```/g, '').trim();
      const jsonStart = fencedClean.indexOf('{');
      const jsonEnd = fencedClean.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        throw new Error('No valid JSON found in AI response');
      }
      
      const cleanJson = fencedClean.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(cleanJson);
      
      // Ensure all required fields exist with defaults
      if (!parsed.strengths) parsed.strengths = [];
      if (!parsed.weaknesses) parsed.weaknesses = [];
      if (!parsed.improvementSuggestions) parsed.improvementSuggestions = [];
      if (!parsed.skillGaps) parsed.skillGaps = [];
      if (typeof parsed.overallScore !== 'number') parsed.overallScore = 70;
      if (!parsed.lastAnalyzed) parsed.lastAnalyzed = new Date().toISOString();
      
      return parsed;

    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        strengths: [],
        weaknesses: [],
        improvementSuggestions: [],
        skillGaps: [],
        overallScore: 70
      };
    }
  }
}

module.exports = new ResumeParser();