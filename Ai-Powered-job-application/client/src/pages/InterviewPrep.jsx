import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  MessageSquare, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Send,
  Lightbulb,
  Target
} from 'lucide-react';

const InterviewPrep = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tips, setTips] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      const response = await axios.get('/api/interviews/prep-tips', {
        params: {
          jobTitle: 'Software Developer',
          company: 'Tech Company',
          industry: 'Technology'
        }
      });
      setTips(response.data.tips);
    } catch (error) {
      console.error('Failed to fetch tips:', error);
    }
  };

  const generateQuestions = async () => {
    if (!selectedJob) {
      toast.error('Please select a job first');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post('/api/interviews/generate-questions', {
        jobId: selectedJob.id,
        resumeId: 'resume-id', // In real app, get from user's active resume
        questionTypes: ['technical', 'behavioral', 'situational'],
        count: 10
      });
      setQuestions(response.data.questions);
      setCurrentQuestion(0);
      setUserAnswer('');
      setAnalysis(null);
    } catch (error) {
      console.error('Failed to generate questions:', error);
      toast.error('Failed to generate interview questions');
    } finally {
      setGenerating(false);
    }
  };

  const analyzeAnswer = async () => {
    if (!userAnswer.trim()) {
      toast.error('Please provide an answer first');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/interviews/analyze-answer', {
        question: questions[currentQuestion]?.question,
        answer: userAnswer,
        jobContext: selectedJob?.title
      });
      setAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Failed to analyze answer:', error);
      toast.error('Failed to analyze your answer');
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setUserAnswer('');
      setAnalysis(null);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setUserAnswer('');
      setAnalysis(null);
    }
  };

  const resetSession = () => {
    setQuestions([]);
    setCurrentQuestion(0);
    setUserAnswer('');
    setAnalysis(null);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Preparation</h1>
        <p className="text-gray-600">
          Practice with AI-generated interview questions and get personalized feedback.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Interview Section */}
        <div className="lg:col-span-2">
          <div className="card">
            {questions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Practice?</h3>
                <p className="text-gray-500 mb-6">
                  Generate personalized interview questions based on your profile and job preferences.
                </p>
                <button
                  onClick={generateQuestions}
                  disabled={generating}
                  className="btn btn-primary flex items-center mx-auto"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Practice Session
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div>
                {/* Question Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500">
                      Question {currentQuestion + 1} of {questions.length}
                    </span>
                    <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(questions[currentQuestion]?.difficulty)}`}>
                      {questions[currentQuestion]?.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={resetSession}
                      className="text-sm text-gray-600 hover:text-gray-700 flex items-center"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>

                {/* Question */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {questions[currentQuestion]?.question}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {questions[currentQuestion]?.expectedAnswer}
                  </p>
                </div>

                {/* Answer Input */}
                <div className="mb-6">
                  <label className="label">Your Answer</label>
                  <textarea
                    className="input"
                    rows={6}
                    placeholder="Type your answer here..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <button
                      onClick={previousQuestion}
                      disabled={currentQuestion === 0}
                      className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={nextQuestion}
                      disabled={currentQuestion === questions.length - 1}
                      className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  
                  <button
                    onClick={analyzeAnswer}
                    disabled={loading || !userAnswer.trim()}
                    className="btn btn-primary flex items-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Analyze Answer
                      </>
                    )}
                  </button>
                </div>

                {/* Analysis Results */}
                {analysis && (
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h4>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Overall Score</span>
                          <span className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
                            {analysis.score}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${analysis.score}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Overall Feedback</h5>
                        <p className="text-sm text-gray-600">{analysis.overallFeedback}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mt-6">
                      {analysis.strengths?.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Strengths
                          </h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {analysis.strengths.map((strength, index) => (
                              <li key={index}>• {strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysis.weaknesses?.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            Areas to Improve
                          </h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {analysis.weaknesses.map((weakness, index) => (
                              <li key={index}>• {weakness}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {analysis.suggestions?.length > 0 && (
                      <div className="mt-6">
                        <h5 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                          <Lightbulb className="w-4 h-4 mr-1" />
                          Suggestions
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {analysis.suggestions.map((suggestion, index) => (
                            <li key={index}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Preparation Tips */}
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preparation Tips</h3>
            <div className="space-y-3">
              {tips.map((tip, index) => (
                <div key={index} className="border-l-4 border-primary-500 pl-4">
                  <h4 className="text-sm font-medium text-gray-900">{tip.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{tip.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interview Statistics */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Questions Answered</span>
                <span className="text-sm font-medium">{currentQuestion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Questions</span>
                <span className="text-sm font-medium">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium">
                  {questions.length > 0 ? Math.round(((currentQuestion + 1) / questions.length) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;
