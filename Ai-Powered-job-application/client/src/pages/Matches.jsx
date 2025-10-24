import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Target, 
  Star, 
  MapPin, 
  DollarSign, 
  Building, 
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Filter
} from 'lucide-react';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    minScore: ''
  });

  useEffect(() => {
    fetchMatches();
  }, [filters]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.minScore) params.append('minScore', filters.minScore);

      const response = await axios.get(`/api/matches/my-matches?${params.toString()}`);
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
      toast.error('Failed to fetch job matches');
    } finally {
      setLoading(false);
    }
  };

  const generateNewMatches = async () => {
    try {
      setLoading(true);
      await axios.post('/api/matches/generate');
      toast.success('New job matches generated successfully!');
      fetchMatches();
    } catch (error) {
      console.error('Failed to generate matches:', error);
      toast.error('Failed to generate new matches');
    } finally {
      setLoading(false);
    }
  };

  const addMatchAction = async (matchId, action) => {
    try {
      await axios.post(`/api/matches/${matchId}/action`, { action });
      toast.success('Action recorded successfully!');
      fetchMatches();
    } catch (error) {
      console.error('Failed to record action:', error);
      toast.error('Failed to record action');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status) => {
    const colors = {
      'new': 'text-blue-600 bg-blue-100',
      'viewed': 'text-gray-600 bg-gray-100',
      'applied': 'text-purple-600 bg-purple-100',
      'shortlisted': 'text-green-600 bg-green-100',
      'rejected': 'text-red-600 bg-red-100',
      'hired': 'text-green-700 bg-green-200'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const formatSalary = (salary) => {
    if (!salary) return 'Salary not specified';
    if (salary.min && salary.max) {
      return `$${salary.min.toLocaleString()} - $${salary.max.toLocaleString()}`;
    }
    if (salary.min) {
      return `$${salary.min.toLocaleString()}+`;
    }
    return 'Salary not specified';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Job Matches</h1>
            <p className="text-gray-600">
              AI-powered job recommendations based on your skills and experience.
            </p>
          </div>
          <button
            onClick={generateNewMatches}
            disabled={loading}
            className="btn btn-primary flex items-center"
          >
            <Target className="w-4 h-4 mr-2" />
            Generate New Matches
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex items-center space-x-4">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="new">New</option>
                <option value="viewed">Viewed</option>
                <option value="applied">Applied</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
                <option value="hired">Hired</option>
              </select>
            </div>
            <div>
              <label className="label">Min Score</label>
              <select
                className="input"
                value={filters.minScore}
                onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
              >
                <option value="">All Scores</option>
                <option value="90">90%+</option>
                <option value="80">80%+</option>
                <option value="70">70%+</option>
                <option value="60">60%+</option>
                <option value="50">50%+</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : matches.length > 0 ? (
        <div className="space-y-6">
          {matches.map((match) => (
            <div key={match.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 mr-3">
                      {match.job.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(match.matchScore)}`}>
                      {match.matchScore}% Match
                    </span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                      {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-gray-600 mb-3">
                    <Building className="w-4 h-4 mr-1" />
                    <span className="mr-4">{match.job.company.name}</span>
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="mr-4">
                      {match.job.location.city}, {match.job.location.state}
                      {match.job.location.remote && ' (Remote)'}
                    </span>
                    <DollarSign className="w-4 h-4 mr-1" />
                    <span>{formatSalary(match.job.compensation)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Matched {new Date(match.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Match Breakdown */}
                  {match.breakdown && (
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {match.breakdown.skillsMatch?.score || 0}%
                        </div>
                        <div className="text-xs text-gray-500">Skills Match</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {match.breakdown.experienceMatch?.score || 0}%
                        </div>
                        <div className="text-xs text-gray-500">Experience</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {match.breakdown.educationMatch?.score || 0}%
                        </div>
                        <div className="text-xs text-gray-500">Education</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {match.breakdown.locationMatch?.score || 0}%
                        </div>
                        <div className="text-xs text-gray-500">Location</div>
                      </div>
                    </div>
                  )}

                  {/* AI Insights */}
                  {match.aiInsights && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">AI Insights</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {match.aiInsights.strengths?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-green-700 mb-1 flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Strengths
                            </h5>
                            <ul className="text-xs text-gray-600">
                              {match.aiInsights.strengths.slice(0, 3).map((strength, index) => (
                                <li key={index}>• {strength}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {match.aiInsights.weaknesses?.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-red-700 mb-1 flex items-center">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Areas to Improve
                            </h5>
                            <ul className="text-xs text-gray-600">
                              {match.aiInsights.weaknesses.slice(0, 3).map((weakness, index) => (
                                <li key={index}>• {weakness}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-2 ml-4">
                  <Link
                    to={`/jobs/${match.job.id}`}
                    className="btn btn-primary flex items-center"
                  >
                    View Job
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => addMatchAction(match.id, 'viewed')}
                      className="text-sm text-gray-600 hover:text-gray-700"
                    >
                      Mark as Viewed
                    </button>
                    <button
                      onClick={() => addMatchAction(match.id, 'applied')}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Applied
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No job matches found</h3>
          <p className="text-gray-500 mb-4">
            Upload your resume to get AI-powered job matches.
          </p>
          <Link to="/resume" className="btn btn-primary">
            Upload Resume
          </Link>
        </div>
      )}
    </div>
  );
};

export default Matches;
