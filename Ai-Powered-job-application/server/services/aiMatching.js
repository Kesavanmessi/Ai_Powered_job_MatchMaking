// AIMatchingService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Match = require('../models/Match');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Get model from environment or use default (gemini-pro is more widely available)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro';
// Embedding model - use text-embedding-004 for better quality
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-004';

// Helper function to clean and parse JSON from AI responses
function parseAIJsonResponse(text) {
  try {
    // Remove markdown code fences (```json and ```)
    let cleaned = text.replace(/```json|```/g, '').trim();
    
    // Find JSON object boundaries
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      // If no JSON object found, try to find JSON array
      const arrayStart = cleaned.indexOf('[');
      const arrayEnd = cleaned.lastIndexOf(']');
      
      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } else {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('JSON parsing error:', error);
    console.error('Raw response text:', text.substring(0, 500)); // Log first 500 chars to avoid huge logs
    throw error;
  }
}

class AIMatchingService {
  constructor() {
    this.similarityThreshold = 0.7; // Minimum similarity score for matching
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Generate embedding for text using Gemini
  async generateEmbedding(text) {
    try {
      const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
      const result = await model.embedContent(text.substring(0, 8000));
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding generation error:', error);
      
      // Check if it's a quota limit error
      if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
        console.warn('API quota exceeded for embeddings, using fallback method');
        return this.generateFallbackEmbedding(text);
      }
      
      throw new Error('Failed to generate embedding');
    }
  }

  // Fallback embedding generation using simple text analysis
  generateFallbackEmbedding(text) {
    // Simple fallback: create a basic vector based on text features
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = {};
    
    // Count word frequencies
    words.forEach(word => {
      if (word.length > 2) { // Ignore short words
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    // Create a simple vector (normalized word frequencies)
    const totalWords = words.length;
    const vector = [];
    const uniqueWords = Object.keys(wordCount);
    
    // Create a 50-dimensional vector based on word frequencies
    for (let i = 0; i < 50; i++) {
      if (i < uniqueWords.length) {
        vector.push(wordCount[uniqueWords[i]] / totalWords);
      } else {
        vector.push(0);
      }
    }
    
    return vector;
  }

  // Find matching jobs for a user
  async findJobMatches(userId, options = {}) {
    try {
      const userResume = await Resume.getLatestForUser(userId);
      if (!userResume) {
        throw new Error('No active resume found for user');
      }

      const jobs = await Job.find({ status: 'active' })
        .populate('postedBy', 'firstName lastName company')
        .limit(options.limit || 50);

      const matches = [];

      for (const job of jobs) {
        const matchScore = await this.calculateJobMatchScore(userResume, job);
        
        if (matchScore.overallScore >= (options.minScore || 30)) {
          const breakdown = await this.generateMatchBreakdown(userResume, job, matchScore);
          const insights = await this.generateAIInsights(userResume, job, matchScore);

          matches.push({
            job,
            matchScore: matchScore.overallScore,
            breakdown,
            insights
          });
        }
      }

      // Sort by match score
      matches.sort((a, b) => b.matchScore - a.matchScore);

      return matches;
    } catch (error) {
      console.error('Job matching error:', error);
      throw error;
    }
  }

  // Calculate match score between resume and job
  async calculateJobMatchScore(resume, job) {
    try {
      const scores = {
        skillsMatch: 0,
        experienceMatch: 0,
        educationMatch: 0,
        locationMatch: 0,
        overallScore: 0
      };

      // Skills matching
      if (resume.skillsEmbedding && job.embedding) {
        const skillsSimilarity = this.cosineSimilarity(resume.skillsEmbedding, job.embedding);
        scores.skillsMatch = Math.round(skillsSimilarity * 100);
      } else {
        scores.skillsMatch = await this.calculateSkillsMatch(resume.extractedData.skills, job.requirements.skills);
      }

      // Experience matching
      scores.experienceMatch = this.calculateExperienceMatch(resume.extractedData.experience, job.requirements.experience);

      // Education matching
      scores.educationMatch = this.calculateEducationMatch(resume.extractedData.education, job.requirements.education);

      // Location matching
      scores.locationMatch = this.calculateLocationMatch(resume.extractedData.personalInfo, job.location);

      // Calculate overall score with weights
      scores.overallScore = Math.round(
        (scores.skillsMatch * 0.4) +
        (scores.experienceMatch * 0.3) +
        (scores.educationMatch * 0.2) +
        (scores.locationMatch * 0.1)
      );

      return scores;
    } catch (error) {
      console.error('Match score calculation error:', error);
      return {
        skillsMatch: 0,
        experienceMatch: 0,
        educationMatch: 0,
        locationMatch: 0,
        overallScore: 0
      };
    }
  }

  // Calculate skills match using AI
  async calculateSkillsMatch(resumeSkills, jobSkills) {
    try {
      if (!resumeSkills || resumeSkills.length === 0 || !jobSkills || jobSkills.length === 0) {
        return 0;
      }

      const resumeSkillsText = resumeSkills.map(skill => skill.name).join(', ');
      const jobSkillsText = jobSkills.map(skill => skill.name).join(', ');

      const prompt = `
        Compare these skills and calculate a match percentage (0-100):
        
        Resume Skills: ${resumeSkillsText}
        Job Required Skills: ${jobSkillsText}
        
        Consider:
        - Exact matches
        - Similar skills (e.g., "JavaScript" matches "JS")
        - Related skills (e.g., "React" is related to "Frontend Development")
        - Skill levels and experience
        
        Return only a number between 0-100.
      `;

      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const score = parseInt(response.text().trim());
      return isNaN(score) ? 0 : Math.min(Math.max(score, 0), 100);
    } catch (error) {
      console.error('Skills match calculation error:', error);
      
      // Check if it's a quota limit error
      if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
        console.warn('API quota exceeded for skills matching, using fallback method');
        return this.calculateSkillsMatchFallback(resumeSkills, jobSkills);
      }
      
      return 0;
    }
  }

  // Fallback skills matching without AI
  calculateSkillsMatchFallback(resumeSkills, jobSkills) {
    if (!resumeSkills || resumeSkills.length === 0 || !jobSkills || jobSkills.length === 0) {
      return 0;
    }

    const resumeSkillNames = resumeSkills.map(skill => skill.name.toLowerCase());
    const jobSkillNames = jobSkills.map(skill => skill.name.toLowerCase());
    
    let exactMatches = 0;
    let partialMatches = 0;
    
    // Check for exact matches
    for (const jobSkill of jobSkillNames) {
      if (resumeSkillNames.includes(jobSkill)) {
        exactMatches++;
      } else {
        // Check for partial matches (one skill contains the other)
        const hasPartialMatch = resumeSkillNames.some(resumeSkill => 
          resumeSkill.includes(jobSkill) || jobSkill.includes(resumeSkill)
        );
        if (hasPartialMatch) {
          partialMatches++;
        }
      }
    }
    
    // Calculate score: exact matches get full points, partial matches get half points
    const totalMatches = exactMatches + (partialMatches * 0.5);
    const matchPercentage = (totalMatches / jobSkillNames.length) * 100;
    
    return Math.round(Math.min(Math.max(matchPercentage, 0), 100));
  }

  // Calculate experience match
  calculateExperienceMatch(resumeExperience, jobExperience) {
    if (!jobExperience || !resumeExperience || resumeExperience.length === 0) {
      return jobExperience ? 0 : 100;
    }

    const totalExperience = this.calculateTotalExperience(resumeExperience);
    const requiredExperience = jobExperience.min || 0;

    if (totalExperience >= requiredExperience) {
      return 100;
    } else {
      return Math.round((totalExperience / requiredExperience) * 100);
    }
  }

  // Calculate total experience from resume
  calculateTotalExperience(experience) {
    let totalMonths = 0;

    for (const exp of experience) {
      if (exp.startDate && exp.endDate) {
        const start = new Date(exp.startDate);
        const end = new Date(exp.endDate);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        totalMonths += months;
      }
    }

    return Math.round(totalMonths / 12); // Convert to years
  }

  // Calculate education match
  calculateEducationMatch(resumeEducation, jobEducation) {
    if (!jobEducation || !jobEducation.required) {
      return 100; // No education requirement
    }

    if (!resumeEducation || resumeEducation.length === 0) {
      return 0;
    }

    // Check if user has required degree
    const hasRequiredDegree = resumeEducation.some(edu => 
      edu.degree && edu.degree.toLowerCase().includes(jobEducation.degree.toLowerCase())
    );

    return hasRequiredDegree ? 100 : 0;
  }

  // Calculate location match
  calculateLocationMatch(personalInfo, jobLocation) {
    if (jobLocation.remote) {
      return 100; // Remote work available
    }

    if (!personalInfo.location || !jobLocation.city) {
      return 50; // Unknown location
    }

    // Simple location matching (can be enhanced with geocoding)
    const userLocation = personalInfo.location.toLowerCase();
    const jobCity = jobLocation.city.toLowerCase();

    if (userLocation.includes(jobCity) || jobCity.includes(userLocation)) {
      return 100;
    }

    return 30; // Different locations
  }

  // Generate detailed match breakdown
  async generateMatchBreakdown(resume, job, matchScore) {
    try {
      const resumeSkills = resume.extractedData.skills.map(s => s.name);
      const jobSkills = job.requirements.skills.map(s => s.name);

      const matchedSkills = resumeSkills.filter(skill => 
        jobSkills.some(jobSkill => 
          skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
          jobSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );

      const missingSkills = jobSkills.filter(jobSkill => 
        !resumeSkills.some(skill => 
          skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
          jobSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );

      const extraSkills = resumeSkills.filter(skill => 
        !jobSkills.some(jobSkill => 
          skill.toLowerCase().includes(jobSkill.toLowerCase()) ||
          jobSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );

      return {
        skillsMatch: {
          score: matchScore.skillsMatch,
          matchedSkills,
          missingSkills,
          extraSkills
        },
        experienceMatch: {
          score: matchScore.experienceMatch,
          required: job.requirements.experience?.min || 0,
          actual: this.calculateTotalExperience(resume.extractedData.experience),
          gap: Math.max(0, (job.requirements.experience?.min || 0) - this.calculateTotalExperience(resume.extractedData.experience))
        },
        educationMatch: {
          score: matchScore.educationMatch,
          required: job.requirements.education?.required || false,
          hasRequired: this.calculateEducationMatch(resume.extractedData.education, job.requirements.education) > 0
        },
        locationMatch: {
          score: matchScore.locationMatch,
          isRemote: job.location.remote,
          locationMatch: matchScore.locationMatch > 50
        },
        overallCompatibility: matchScore.overallScore
      };
    } catch (error) {
      console.error('Match breakdown generation error:', error);
      return {};
    }
  }

  // Generate AI insights for the match
  async generateAIInsights(resume, job, matchScore) {
    try {
      const prompt = `
        Analyze this job match and provide insights:
        
        Job: ${job.title} at ${job.company.name}
        Job Description: ${job.description}
        Required Skills: ${job.requirements.skills.map(s => s.name).join(', ')}
        
        Candidate Skills: ${resume.extractedData.skills.map(s => s.name).join(', ')}
        Experience: ${resume.extractedData.experience.length} positions
        Education: ${resume.extractedData.education.map(e => e.degree).join(', ')}
        
        Match Score: ${matchScore.overallScore}%
        
        Provide insights in this JSON format:
        {
          "strengths": ["strength1", "strength2"],
          "weaknesses": ["weakness1", "weakness2"],
          "recommendations": ["recommendation1", "recommendation2"],
          "interviewTips": ["tip1", "tip2"],
          "skillGaps": [
            {
              "skill": "skill name",
              "importance": 5,
              "currentLevel": "current level",
              "requiredLevel": "required level",
              "learningPath": "how to learn this skill"
            }
          ]
        }
      `;

      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const insightsText = response.text();
      const insights = parseAIJsonResponse(insightsText);
      
      // Ensure all required fields exist with defaults
      if (!insights.strengths || !Array.isArray(insights.strengths)) {
        insights.strengths = [];
      }
      if (!insights.weaknesses || !Array.isArray(insights.weaknesses)) {
        insights.weaknesses = [];
      }
      if (!insights.recommendations || !Array.isArray(insights.recommendations)) {
        insights.recommendations = [];
      }
      if (!insights.interviewTips || !Array.isArray(insights.interviewTips)) {
        insights.interviewTips = [];
      }
      if (!insights.skillGaps || !Array.isArray(insights.skillGaps)) {
        insights.skillGaps = [];
      }
      
      return insights;
    } catch (error) {
      console.error('AI insights generation error:', error);
      
      // Check if it's a JSON parsing error
      if (error instanceof SyntaxError || error.message.includes('JSON') || error.message.includes('Unexpected token')) {
        console.warn('JSON parsing failed for AI insights, using fallback method');
        return this.generateFallbackInsights(resume, job, matchScore);
      }
      
      // Check if it's a quota limit error
      if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
        console.warn('API quota exceeded for insights generation, using fallback method');
        return this.generateFallbackInsights(resume, job, matchScore);
      }
      
      // For any other error, use fallback insights instead of empty object
      console.warn('AI insights generation failed, using fallback method');
      return this.generateFallbackInsights(resume, job, matchScore);
    }
  }

  // Fallback insights generation without AI
  generateFallbackInsights(resume, job, matchScore) {
    const resumeSkills = resume.extractedData.skills.map(s => s.name.toLowerCase());
    const jobSkills = job.requirements.skills.map(s => s.name.toLowerCase());
    
    // Find matched and missing skills
    const matchedSkills = jobSkills.filter(jobSkill => 
      resumeSkills.some(resumeSkill => 
        resumeSkill.includes(jobSkill) || jobSkill.includes(resumeSkill)
      )
    );
    
    const missingSkills = jobSkills.filter(jobSkill => 
      !resumeSkills.some(resumeSkill => 
        resumeSkill.includes(jobSkill) || jobSkill.includes(resumeSkill)
      )
    );
    
    // Generate basic insights based on match analysis
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];
    const interviewTips = [];
    const skillGaps = [];
    
    // Strengths
    if (matchedSkills.length > 0) {
      strengths.push(`Strong match with ${matchedSkills.length} required skills`);
      strengths.push(`Proficient in: ${matchedSkills.slice(0, 3).join(', ')}`);
    }
    
    if (matchScore.experienceMatch >= 80) {
      strengths.push('Meets or exceeds experience requirements');
    }
    
    if (matchScore.educationMatch >= 80) {
      strengths.push('Educational background aligns with requirements');
    }
    
    // Weaknesses
    if (missingSkills.length > 0) {
      weaknesses.push(`Missing ${missingSkills.length} key skills: ${missingSkills.slice(0, 3).join(', ')}`);
    }
    
    if (matchScore.experienceMatch < 50) {
      weaknesses.push('Experience level below job requirements');
    }
    
    if (matchScore.locationMatch < 50 && !job.location.remote) {
      weaknesses.push('Location may not be ideal for this position');
    }
    
    // Recommendations
    if (missingSkills.length > 0) {
      recommendations.push(`Consider learning: ${missingSkills.slice(0, 2).join(', ')}`);
    }
    
    if (matchScore.overallScore < 70) {
      recommendations.push('Focus on building relevant experience in this field');
    }
    
    recommendations.push('Tailor your resume to highlight relevant achievements');
    recommendations.push('Prepare specific examples of your skills in action');
    
    // Interview Tips
    interviewTips.push('Research the company and role thoroughly');
    interviewTips.push('Prepare examples that demonstrate your key skills');
    interviewTips.push('Ask thoughtful questions about the role and team');
    
    if (missingSkills.length > 0) {
      interviewTips.push(`Be ready to discuss your plan for learning: ${missingSkills[0]}`);
    }
    
    // Skill Gaps
    missingSkills.slice(0, 3).forEach(skill => {
      skillGaps.push({
        skill: skill,
        importance: 5,
        currentLevel: 'Beginner',
        requiredLevel: 'Intermediate',
        learningPath: `Consider online courses, tutorials, or hands-on projects to develop ${skill} skills`
      });
    });
    
    return {
      strengths,
      weaknesses,
      recommendations,
      interviewTips,
      skillGaps
    };
  }

  // Save match to database
  async saveMatch(userId, jobId, resumeId, matchScore, breakdown, insights) {
    try {
      const match = new Match({
        user: userId,
        job: jobId,
        resume: resumeId,
        matchScore: matchScore.overallScore,
        breakdown,
        aiInsights: insights
      });

      await match.save();
      return match;
    } catch (error) {
      console.error('Save match error:', error);
      throw error;
    }
  }
}

module.exports = new AIMatchingService();