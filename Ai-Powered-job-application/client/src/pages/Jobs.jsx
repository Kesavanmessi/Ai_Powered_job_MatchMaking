import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Search, 
  MapPin, 
  Clock, 
  DollarSign, 
  Building, 
  Filter,
  Star,
  Briefcase
} from 'lucide-react';

const Jobs = () => {
  const { isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    jobType: '',
    remote: false,
    minSalary: '',
    maxSalary: '',
    skills: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalJobs: 0
  });

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await axios.get(`/api/jobs?${params.toString()}`);
      setJobs(response.data.jobs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      location: '',
      jobType: '',
      remote: false,
      minSalary: '',
      maxSalary: '',
      skills: ''
    });
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Dream Job</h1>
        <p className="text-gray-600">
          Discover opportunities that match your skills and career goals.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="label">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Job title, company..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="label">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="City, state..."
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  />
                </div>
              </div>

              {/* Job Type */}
              <div>
                <label className="label">Job Type</label>
                <select
                  className="input"
                  value={filters.jobType}
                  onChange={(e) => handleFilterChange('jobType', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>

              {/* Remote Work */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remote"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={filters.remote}
                  onChange={(e) => handleFilterChange('remote', e.target.checked)}
                />
                <label htmlFor="remote" className="ml-2 text-sm text-gray-700">
                  Remote work only
                </label>
              </div>

              {/* Salary Range */}
              <div>
                <label className="label">Salary Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    className="input"
                    placeholder="Min"
                    value={filters.minSalary}
                    onChange={(e) => handleFilterChange('minSalary', e.target.value)}
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="Max"
                    value={filters.maxSalary}
                    onChange={(e) => handleFilterChange('maxSalary', e.target.value)}
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="label">Skills</label>
                <input
                  type="text"
                  className="input"
                  placeholder="JavaScript, React..."
                  value={filters.skills}
                  onChange={(e) => handleFilterChange('skills', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="lg:col-span-3">
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
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-xl font-semibold text-gray-900 mr-3">
                          {job.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getJobTypeColor(job.jobType)}`}>
                          {job.jobType.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 mb-3">
                        <Building className="w-4 h-4 mr-1" />
                        <span className="mr-4">{job.company.name}</span>
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="mr-4">
                          {job.location.city}, {job.location.state}
                          {job.location.remote && ' (Remote)'}
                        </span>
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span>{formatSalary(job.compensation)}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                        <span className="mx-2">•</span>
                        <span>{job.views} views</span>
                        <span className="mx-2">•</span>
                        <span>{job.applicationsCount} applications</span>
                      </div>

                      {job.requirements?.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.requirements.skills.slice(0, 5).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {skill.name}
                            </span>
                          ))}
                          {job.requirements.skills.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              +{job.requirements.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="btn btn-primary"
                      >
                        View Details
                      </Link>
                      {isAuthenticated && (
                        <button className="text-sm text-gray-500 hover:text-gray-700">
                          Save Job
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your filters or search terms.
              </p>
              <button
                onClick={clearFilters}
                className="btn btn-primary"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-8">
              <div className="text-sm text-gray-700">
                Showing {((pagination.currentPage - 1) * 20) + 1} to {Math.min(pagination.currentPage * 20, pagination.totalJobs)} of {pagination.totalJobs} jobs
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
