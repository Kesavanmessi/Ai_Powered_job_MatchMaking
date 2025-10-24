import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Building, 
  Users,
  Star,
  ArrowLeft,
  Share2,
  Heart,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const JobDetails = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await axios.get(`/api/jobs/${id}`);
      setJob(response.data.job);
    } catch (error) {
      console.error('Failed to fetch job:', error);
      toast.error('Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to apply for jobs');
      return;
    }

    // Check if user is a recruiter or admin
    if (user?.role === 'recruiter' || user?.role === 'admin') {
      toast.error('Recruiters and admins cannot apply for jobs');
      return;
    }

    setApplying(true);
    try {
      const response = await axios.post('/api/applications', {
        jobId: id,
        coverLetter: '' // You can add a cover letter input later
      });
      
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Failed to apply:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to submit application');
      }
    } finally {
      setApplying(false);
    }
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

  const getJobTypeColor = (jobType) => {
    const colors = {
      'full-time': 'bg-green-100 text-green-800',
      'part-time': 'bg-blue-100 text-blue-800',
      'contract': 'bg-purple-100 text-purple-800',
      'internship': 'bg-yellow-100 text-yellow-800',
      'freelance': 'bg-orange-100 text-orange-800'
    };
    return colors[jobType] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
          <p className="text-gray-600 mb-4">The job you're looking for doesn't exist or has been removed.</p>
          <Link to="/jobs" className="btn btn-primary">
            Browse Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          to="/jobs"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Jobs
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Job Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <Building className="w-5 h-5 mr-2" />
                    <span className="text-lg">{job.company.name}</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="mr-4">
                      {job.location.city}, {job.location.state}
                      {job.location.remote && ' (Remote)'}
                    </span>
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getJobTypeColor(job.jobType)}`}>
                    {job.jobType.replace('-', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{job.applicationsCount} applications</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    <span>{job.views} views</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-500">
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
                
                {job.requirements.skills && job.requirements.skills.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.requirements.skills.map((skill, index) => (
                        <span
                          key={index}
                          className={`px-3 py-1 rounded-full text-sm ${
                            skill.level === 'required' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {skill.name}
                          {skill.level === 'required' && ' *'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job.requirements.experience && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Experience</h3>
                    <p className="text-gray-700">
                      {job.requirements.experience.min && job.requirements.experience.max
                        ? `${job.requirements.experience.min}-${job.requirements.experience.max} years`
                        : job.requirements.experience.min
                        ? `${job.requirements.experience.min}+ years`
                        : 'Experience not specified'
                      }
                    </p>
                  </div>
                )}

                {job.requirements.education && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Education</h3>
                    <p className="text-gray-700">
                      {job.requirements.education.required
                        ? `${job.requirements.education.degree} in ${job.requirements.education.field} required`
                        : `${job.requirements.education.degree} in ${job.requirements.education.field} preferred`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Compensation */}
            {job.compensation && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Compensation & Benefits</h2>
                
                {job.compensation.salary && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Salary</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {formatSalary(job.compensation.salary)}
                    </p>
                  </div>
                )}

                {job.compensation.benefits && job.compensation.benefits.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Benefits</h3>
                    <ul className="list-disc list-inside text-gray-700">
                      {job.compensation.benefits.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{job.company.name}</h3>
              <p className="text-gray-600">{job.company.industry}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{job.location.city}, {job.location.state}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <DollarSign className="w-4 h-4 mr-2" />
                <span>{formatSalary(job.compensation)}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>{job.jobType.replace('-', ' ')}</span>
              </div>
            </div>

            <div className="space-y-3">
              {user?.role === 'recruiter' || user?.role === 'admin' ? (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    {user?.role === 'admin' ? 'Admins cannot apply for jobs' : 'Recruiters cannot apply for jobs'}
                  </p>
                  {user?.role === 'recruiter' && (
                    <Link 
                      to="/recruiter-dashboard" 
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Applications Dashboard
                    </Link>
                  )}
                  {user?.role === 'admin' && (
                    <Link 
                      to="/admin" 
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Go to Admin Dashboard
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="w-full btn btn-primary"
                  >
                    {applying ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Applying...
                      </div>
                    ) : (
                      'Apply Now'
                    )}
                  </button>
                  
                  {!isAuthenticated && (
                    <p className="text-sm text-gray-500 text-center">
                      <Link to="/login" className="text-primary-600 hover:text-primary-700">
                        Sign in
                      </Link> to apply for this job
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Company Info */}
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">About {job.company.name}</h3>
            <p className="text-gray-600 text-sm">
              {job.company.size && `Company size: ${job.company.size}`}
            </p>
            {job.company.website && (
              <a
                href={job.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
              >
                Visit company website
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
