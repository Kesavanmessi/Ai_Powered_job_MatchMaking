import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Trash2,
  Eye,
  Star,
  TrendingUp,
  Target
} from 'lucide-react';

const ResumeUpload = () => {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [activeResume, setActiveResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const response = await axios.get('/api/resumes/my-resumes');
      setResumes(response.data.resumes || []);
      
      // Fetch active resume - handle case where no active resume exists
      try {
        const activeResumeResponse = await axios.get('/api/resumes/active');
        setActiveResume(activeResumeResponse.data.resume || null);
      } catch (activeError) {
        // If 404 or other error, set active resume to null
        console.warn('No active resume found or error fetching active resume:', activeError.response?.status);
        setActiveResume(null);
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error);
      // Set empty arrays/null on error
      setResumes([]);
      setActiveResume(null);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await axios.post('/api/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Resume uploaded and analyzed successfully!');
      fetchResumes();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const activateResume = async (resumeId) => {
    try {
      await axios.put(`/api/resumes/${resumeId}/activate`);
      toast.success('Resume activated successfully!');
      fetchResumes();
    } catch (error) {
      console.error('Failed to activate resume:', error);
      toast.error('Failed to activate resume');
    }
  };

  const deleteResume = async (resumeId) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) {
      return;
    }

    try {
      await axios.delete(`/api/resumes/${resumeId}`);
      toast.success('Resume deleted successfully!');
      fetchResumes();
    } catch (error) {
      console.error('Failed to delete resume:', error);
      toast.error('Failed to delete resume');
    }
  };

  const reanalyzeResume = async (resumeId) => {
    try {
      await axios.post(`/api/resumes/${resumeId}/reanalyze`);
      toast.success('Resume re-analyzed successfully!');
      fetchResumes();
    } catch (error) {
      console.error('Failed to re-analyze resume:', error);
      toast.error('Failed to re-analyze resume');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Management</h1>
        <p className="text-gray-600">
          Upload and manage your resumes to get better job matches.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload New Resume</h3>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
                  <p className="text-gray-600">Uploading and analyzing...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
                  </p>
                  <p className="text-gray-500 mb-4">
                    or click to browse files
                  </p>
                  <p className="text-sm text-gray-400">
                    Supports PDF and DOCX files up to 10MB
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <p className="mb-2">Our AI will analyze your resume to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Extract your skills and experience</li>
                <li>Identify strengths and areas for improvement</li>
                <li>Generate better job matches</li>
                <li>Provide personalized recommendations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Resume List */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Resumes</h3>
            
            {resumes.length > 0 ? (
              <div className="space-y-4">
                {resumes.map((resume) => (
                  <div key={resume.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <FileText className="w-5 h-5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">{resume.originalName}</span>
                          {resume.isActive && (
                            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-500 mb-3">
                          Uploaded {new Date(resume.createdAt).toLocaleDateString()} • 
                          Version {resume.version} • 
                          {(resume.fileSize / 1024 / 1024).toFixed(1)} MB
                        </div>

                        {resume.aiAnalysis && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">AI Analysis Score</span>
                              <span className="text-sm font-bold text-primary-600">
                                {resume.aiAnalysis.overallScore}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${resume.aiAnalysis.overallScore}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {resume.aiAnalysis && (
                          <div className="grid md:grid-cols-2 gap-4 mb-3">
                            {resume.aiAnalysis.strengths?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-green-700 mb-1">Strengths</h4>
                                <ul className="text-xs text-gray-600">
                                  {resume.aiAnalysis.strengths.slice(0, 3).map((strength, index) => (
                                    <li key={index} className="flex items-center">
                                      <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                      {strength}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {resume.aiAnalysis.weaknesses?.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-red-700 mb-1">Areas to Improve</h4>
                                <ul className="text-xs text-gray-600">
                                  {resume.aiAnalysis.weaknesses.slice(0, 3).map((weakness, index) => (
                                    <li key={index} className="flex items-center">
                                      <AlertCircle className="w-3 h-3 text-red-500 mr-1" />
                                      {weakness}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!resume.isActive && (
                          <button
                            onClick={() => activateResume(resume.id)}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Activate
                          </button>
                        )}
                        
                        <button
                          onClick={() => reanalyzeResume(resume.id)}
                          className="text-sm text-gray-600 hover:text-gray-700"
                        >
                          Re-analyze
                        </button>
                        
                        <button
                          onClick={() => deleteResume(resume.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No resumes uploaded</h3>
                <p className="text-gray-500 mb-4">
                  Upload your first resume to get started with AI-powered job matching.
                </p>
              </div>
            )}
          </div>

          {/* AI Insights */}
          {activeResume?.aiAnalysis && (
            <div className="card mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights & Recommendations</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {activeResume.aiAnalysis.improvementSuggestions?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <TrendingUp className="w-4 h-4 text-blue-500 mr-2" />
                      Improvement Suggestions
                    </h4>
                    <ul className="space-y-2">
                      {activeResume.aiAnalysis.improvementSuggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeResume.aiAnalysis.skillGaps?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Target className="w-4 h-4 text-orange-500 mr-2" />
                      Skill Gaps
                    </h4>
                    <ul className="space-y-2">
                      {activeResume.aiAnalysis.skillGaps.map((gap, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;
