const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { auth } = require('../middleware/auth');

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @route   POST /api/interviews/generate-questions
// @desc    Generate personalized interview questions
// @access  Private
router.post('/generate-questions', auth, async (req, res) => {
  try {
    const { jobId, resumeId, questionTypes = ['technical', 'behavioral', 'situational'], count = 10 } = req.body;

    if (!jobId || !resumeId) {
      return res.status(400).json({ 
        message: 'Job ID and Resume ID are required' 
      });
    }

    // Get job and resume data (simplified - in production, fetch from database)
    const jobData = req.body.jobData || {};
    const resumeData = req.body.resumeData || {};

    const questions = await generateInterviewQuestions(
      jobData,
      resumeData,
      questionTypes,
      count
    );

    res.json({
      questions,
      totalQuestions: questions.length,
      jobId,
      resumeId,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Generate interview questions error:', error);
    res.status(500).json({
      message: 'Failed to generate interview questions',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   POST /api/interviews/analyze-answer
// @desc    Analyze user's answer to an interview question
// @access  Private
router.post('/analyze-answer', auth, async (req, res) => {
  try {
    const { question, answer, jobContext } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ 
        message: 'Question and answer are required' 
      });
    }

    const analysis = await analyzeInterviewAnswer(question, answer, jobContext);

    res.json({
      analysis,
      question,
      answer,
      analyzedAt: new Date()
    });
  } catch (error) {
    console.error('Analyze answer error:', error);
    res.status(500).json({
      message: 'Failed to analyze answer',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// @route   GET /api/interviews/prep-tips
// @desc    Get interview preparation tips
// @access  Private
router.get('/prep-tips', auth, async (req, res) => {
  try {
    const { jobTitle, company, industry } = req.query;

    const tips = await generatePrepTips(jobTitle, company, industry);

    res.json({
      tips,
      totalTips: tips.length,
      context: {
        jobTitle,
        company,
        industry
      }
    });
  } catch (error) {
    console.error('Get prep tips error:', error);
    res.status(500).json({
      message: 'Failed to fetch preparation tips',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
});

// Generate interview questions using AI
async function generateInterviewQuestions(jobData, resumeData, questionTypes, count) {
  try {
    const prompt = `
      Generate ${count} personalized interview questions for this job and candidate:
      
      Job Details:
      - Title: ${jobData.title || 'Software Developer'}
      - Company: ${jobData.company || 'Tech Company'}
      - Description: ${jobData.description || 'Software development role'}
      - Required Skills: ${jobData.requiredSkills || 'JavaScript, React, Node.js'}
      - Experience Level: ${jobData.experienceLevel || 'Mid-level'}
      
      Candidate Profile:
      - Skills: ${resumeData.skills || 'JavaScript, Python, SQL'}
      - Experience: ${resumeData.experience || '3 years software development'}
      - Education: ${resumeData.education || 'Computer Science degree'}
      
      Question Types: ${questionTypes.join(', ')}
      
      Generate questions in this JSON format:
      {
        "questions": [
          {
            "id": 1,
            "type": "technical",
            "category": "Programming",
            "question": "Question text here",
            "difficulty": "intermediate",
            "expectedAnswer": "What the interviewer is looking for",
            "tips": ["tip1", "tip2"],
            "followUpQuestions": ["follow-up question 1", "follow-up question 2"]
          }
        ]
      }
      
      Make questions:
      - Relevant to the specific job and candidate background
      - Vary in difficulty (beginner to advanced)
      - Include different categories (technical, behavioral, situational)
      - Provide actionable tips for answering
      - Include follow-up questions for deeper discussion
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const questionsData = JSON.parse(response.text());
    return questionsData.questions || [];
  } catch (error) {
    console.error('AI question generation error:', error);
    return generateFallbackQuestions(questionTypes, count);
  }
}

// Analyze interview answer using AI
async function analyzeInterviewAnswer(question, answer, jobContext) {
  try {
    const prompt = `
      Analyze this interview answer and provide feedback:
      
      Question: ${question}
      Answer: ${answer}
      Job Context: ${jobContext || 'General software development role'}
      
      Provide analysis in this JSON format:
      {
        "score": 85,
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "suggestions": ["suggestion1", "suggestion2"],
        "keywords": ["keyword1", "keyword2"],
        "overallFeedback": "Overall assessment of the answer",
        "improvementAreas": ["area1", "area2"]
      }
      
      Consider:
      - Technical accuracy
      - Communication clarity
      - Relevance to the question
      - Use of specific examples
      - Problem-solving approach
      - Confidence level
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = JSON.parse(response.text());
    return analysis;
  } catch (error) {
    console.error('AI answer analysis error:', error);
    return {
      score: 70,
      strengths: ['Provided an answer'],
      weaknesses: ['Could be more specific'],
      suggestions: ['Add more examples', 'Be more detailed'],
      keywords: [],
      overallFeedback: 'Good start, but could be improved',
      improvementAreas: ['Specificity', 'Examples']
    };
  }
}

// Generate interview preparation tips
async function generatePrepTips(jobTitle, company, industry) {
  try {
    const prompt = `
      Generate interview preparation tips for:
      - Job Title: ${jobTitle || 'Software Developer'}
      - Company: ${company || 'Tech Company'}
      - Industry: ${industry || 'Technology'}
      
      Provide tips in this JSON format:
      {
        "tips": [
          {
            "category": "Technical Preparation",
            "title": "Tip title",
            "description": "Detailed tip description",
            "priority": "high",
            "actions": ["action1", "action2"]
          }
        ]
      }
      
      Include categories:
      - Technical Preparation
      - Company Research
      - Behavioral Questions
      - Presentation Skills
      - Follow-up Actions
    `;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tipsData = JSON.parse(response.text());
    return tipsData.tips || [];
  } catch (error) {
    console.error('AI tips generation error:', error);
    return generateFallbackTips();
  }
}

// Fallback functions for when AI fails
function generateFallbackQuestions(questionTypes, count) {
  const questions = [];
  const questionTemplates = {
    technical: [
      "Explain your experience with [technology] and how you've used it in previous projects.",
      "How would you approach debugging a performance issue in a web application?",
      "Describe the architecture of a system you've designed or worked on.",
      "What's your experience with version control and collaborative development?",
      "How do you stay updated with the latest technologies in your field?"
    ],
    behavioral: [
      "Tell me about a challenging project you worked on and how you overcame obstacles.",
      "Describe a time when you had to learn a new technology quickly for a project.",
      "Give me an example of how you've worked effectively in a team environment.",
      "Tell me about a time when you had to explain a complex technical concept to a non-technical person.",
      "Describe a situation where you had to meet a tight deadline and how you managed it."
    ],
    situational: [
      "How would you handle a situation where a team member is not meeting expectations?",
      "What would you do if you disagreed with a technical decision made by your manager?",
      "How do you prioritize tasks when you have multiple urgent deadlines?",
      "Describe how you would approach mentoring a junior developer.",
      "How would you handle a situation where a project is behind schedule?"
    ]
  };

  let questionId = 1;
  for (const type of questionTypes) {
    const templates = questionTemplates[type] || questionTemplates.technical;
    const questionsToAdd = Math.ceil(count / questionTypes.length);
    
    for (let i = 0; i < questionsToAdd && questionId <= count; i++) {
      questions.push({
        id: questionId++,
        type,
        category: type.charAt(0).toUpperCase() + type.slice(1),
        question: templates[i % templates.length],
        difficulty: 'intermediate',
        expectedAnswer: 'Provide a clear, specific example with measurable results',
        tips: ['Use the STAR method', 'Be specific with examples', 'Show your thought process'],
        followUpQuestions: ['Can you elaborate on that?', 'What was the outcome?']
      });
    }
  }

  return questions.slice(0, count);
}

function generateFallbackTips() {
  return [
    {
      category: "Technical Preparation",
      title: "Review Core Technologies",
      description: "Brush up on the key technologies mentioned in the job description",
      priority: "high",
      actions: ["Practice coding problems", "Review documentation", "Prepare examples"]
    },
    {
      category: "Company Research",
      title: "Research the Company",
      description: "Learn about the company's mission, values, and recent news",
      priority: "high",
      actions: ["Visit company website", "Read recent news", "Check social media"]
    },
    {
      category: "Behavioral Questions",
      title: "Prepare STAR Examples",
      description: "Prepare specific examples using the STAR method",
      priority: "medium",
      actions: ["Identify key achievements", "Practice storytelling", "Prepare metrics"]
    }
  ];
}

module.exports = router;
