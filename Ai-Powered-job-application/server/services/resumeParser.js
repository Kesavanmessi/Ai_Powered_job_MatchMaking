// resumeParser.js
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class ResumeParser {
  constructor() {
    this.supportedFormats = {
      'application/pdf': this.parsePDF.bind(this),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.parseDOCX.bind(this)
    };
  }

  // === MAIN PARSE FUNCTION ===
  async parseResume(filePath, mimeType) {
    try {
      const parser = this.supportedFormats[mimeType];
      if (!parser) throw new Error(`Unsupported file format: ${mimeType}`);

      const text = await parser(filePath);
      const extractedData = await this.extractStructuredData(text);
      const embedding = await this.generateEmbedding(text);
      const skillsEmbedding = await this.generateSkillsEmbedding(extractedData.skills);
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

  // === FILE PARSERS ===
  async parsePDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  async parseDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  // === AI STRUCTURED DATA EXTRACTION ===
  async extractStructuredData(text) {
    try {
      const prompt = `
You are a resume parser AI. Extract information from this resume text and return a clean JSON strictly following this structure:

{
  "personalInfo": {
    "name": "Full Name",
    "email": "Email",
    "phone": "Phone",
    "linkedin": "LinkedIn profile",
    "github": "GitHub profile",
    "website": "Any personal/coding profile link"
  },
  "summary": "Short professional summary or objective",
  "education": [
    {
      "institution": "College or School Name",
      "degree": "Degree or Qualification",
      "field": "Field of Study",
      "graduationYear": "Year",
      "grade": "CGPA or Percentage"
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "description": "1-2 line summary",
      "technologies": ["list of tools or languages"]
    }
  ],
  "skills": [
    {"name": "Skill name", "category": "Technical/Soft"}
  ],
  "achievements": [
    "Achievement text"
  ]
}

Resume text:
${text}
      `;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const extractedText = response.text();

      // Clean up and safely parse JSON from response
      const jsonStart = extractedText.indexOf('{');
      const jsonEnd = extractedText.lastIndexOf('}');
      const cleanJson = extractedText.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('AI extraction error:', error);
      return this.basicTextExtraction(text);
    }
  }

  // === FALLBACK BASIC EXTRACTION ===
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
        github: text.match(githubRegex)?.[0] || ''
      },
      summary: '',
      education: [],
      projects: [],
      skills: [],
      achievements: []
    };
  }

  // === EMBEDDING GENERATION ===
  async generateEmbedding(text) {
    try {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
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
      const skillsText = skills.map(skill => skill.name).join(', ');
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(skillsText);
      return result.embedding.values;
    } catch (error) {
      console.error('Skills embedding generation error:', error);
      return [];
    }
  }

  // === AI RESUME ANALYSIS ===
  async analyzeResumeWithAI(resumeData) {
    try {
      const prompt = `
You are an expert career assistant. Analyze this candidate’s resume and provide a structured JSON response.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Return JSON in this exact format:
{
  "strengths": ["Notable strengths based on projects, skills, and education"],
  "weaknesses": ["Areas to improve"],
  "improvementSuggestions": ["Practical suggestions to enhance resume"],
  "skillGaps": ["Missing but valuable technical skills"],
  "overallScore": number (0-100)
}
      `;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      const cleanJson = text.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(cleanJson);
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
