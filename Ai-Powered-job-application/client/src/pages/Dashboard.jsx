import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';
import { 
  Target, 
  TrendingUp, 
  FileText, 
  Briefcase, 
  Users, 
  ArrowRight,
  Star,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';

const Dashboard = () => {
  const { user, isRecruiter, isAdmin } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('/api/users/dashboard');
        setDashboardData(response.data.dashboard);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isRecruiter) {
    return <RecruiterDashboard dashboardData={dashboardData} />;
  }

  return <JobSeekerDashboard dashboardData={dashboardData} user={user} />;
};

const JobSeekerDashboard = ({ dashboardData, user }) => {
  const stats = [
    {
      name: 'Total Matches',
      value: dashboardData?.stats?.totalMatches || 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Average Match Score',
      value: `${dashboardData?.stats?.averageMatchScore || 0}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Active Resumes',
      value: dashboardData?.stats?.activeResumes || 0,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Jobs Applied',
      value: dashboardData?.stats?.jobsApplied || 0,
      icon: Briefcase,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your job search.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Top Matches */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Top Job Matches</h2>
              <Link
                to="/matches"
                className="text-primary-600 hover:text-primary-700 font-medium flex items-center"
              >
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {dashboardData?.topMatches?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.topMatches.map((match, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{match.job.title}</h3>
                        <p className="text-gray-600">{match.job.company.name}</p>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {match.job.location.city}, {match.job.location.state}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {match.job.compensation?.salary?.min ? 
                              `$${match.job.compensation.salary.min.toLocaleString()}` : 
                              'Salary not specified'
                            }
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                          <span className="font-semibold text-gray-900">{match.matchScore}%</span>
                        </div>
                        <p className="text-sm text-gray-500">Match Score</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No job matches yet</p>
                <Link to="/resume" className="btn btn-primary">
                  Upload Resume to Get Matches
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resume Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resume Status</h3>
            {dashboardData?.activeResume ? (
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-sm text-gray-700">Resume uploaded</span>
                </div>
                <div className="text-sm text-gray-500">
                  {dashboardData.activeResume.fileName}
                </div>
                {dashboardData.activeResume.aiAnalysis && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700">AI Analysis Score</p>
                    <div className="flex items-center mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full" 
                          style={{ width: `${dashboardData.activeResume.aiAnalysis.overallScore}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {dashboardData.activeResume.aiAnalysis.overallScore}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">No resume uploaded</p>
                <Link to="/resume" className="btn btn-primary text-sm">
                  Upload Resume
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/resume"
                className="flex items-center p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4 mr-3" />
                Upload/Update Resume
              </Link>
              <Link
                to="/matches"
                className="flex items-center p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Target className="w-4 h-4 mr-3" />
                View Job Matches
              </Link>
              <Link
                to="/courses"
                className="flex items-center p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Users className="w-4 h-4 mr-3" />
                Browse Courses
              </Link>
              <Link
                to="/interview-prep"
                className="flex items-center p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Star className="w-4 h-4 mr-3" />
                Interview Prep
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          {dashboardData?.recentMatches?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {dashboardData.recentMatches.slice(0, 3).map((match, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-primary-600 rounded-full mr-3"></div>
                    <div className="flex-1">
                      <p className="text-gray-700">
                        New match: {match.job.title}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(match.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RecruiterDashboard = ({ dashboardData }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Recruiter Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your job postings and find the best candidates.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Matches Generated</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No job postings yet</h3>
              <p className="text-gray-500 mb-4">Start by posting your first job to find great candidates.</p>
              <Link to="/post-job" className="btn btn-primary">
                Post Your First Job
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/post-job"
                className="flex items-center p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-3" />
                Post New Job
              </Link>
              <Link
                to="/jobs"
                className="flex items-center p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Briefcase className="w-4 h-4 mr-3" />
                Browse All Jobs
              </Link>
              <Link
                to="/videos"
                className="flex items-center p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Users className="w-4 h-4 mr-3" />
                Browse Videos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
