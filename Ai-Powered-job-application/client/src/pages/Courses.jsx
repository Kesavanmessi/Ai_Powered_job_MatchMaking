import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Search, 
  Star, 
  Users, 
  Clock, 
  ExternalLink,
  Filter,
  GraduationCap,
  Play,
  BookOpen
} from 'lucide-react';

const Courses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/courses/recommendations', {
        params: {
          skills: user?.skills?.map(s => s.name).join(',') || 'JavaScript,React,Node.js'
        }
      });
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchCourses = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await axios.get('/api/courses/search', {
        params: {
          query: searchQuery,
          platform: selectedPlatform
        }
      });
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Failed to search courses:', error);
      toast.error('Failed to search courses');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case 'udemy':
        return <GraduationCap className="w-5 h-5 text-purple-600" />;
      case 'coursera':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'youtube':
        return <Play className="w-5 h-5 text-red-600" />;
      default:
        return <GraduationCap className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform.toLowerCase()) {
      case 'udemy':
        return 'bg-purple-100 text-purple-800';
      case 'coursera':
        return 'bg-blue-100 text-blue-800';
      case 'youtube':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return 'Duration not specified';
    return duration;
  };

  const formatPrice = (price) => {
    if (price === 'Free') return 'Free';
    if (typeof price === 'number') return `$${price}`;
    return price || 'Price not specified';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Course Recommendations</h1>
        <p className="text-gray-600">
          Enhance your skills with AI-recommended courses from top learning platforms.
        </p>
      </div>

      {/* Search Section */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="input pl-10"
                placeholder="Search for courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchCourses()}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="input"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
            >
              <option value="">All Platforms</option>
              <option value="udemy">Udemy</option>
              <option value="coursera">Coursera</option>
              <option value="youtube">YouTube</option>
            </select>
            <button
              onClick={searchCourses}
              disabled={loading || !searchQuery.trim()}
              className="btn btn-primary flex items-center"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommended for You</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((course, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {getPlatformIcon(course.platform)}
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(course.platform)}`}>
                      {course.platform}
                    </span>
                  </div>
                  <div className="flex items-center text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="ml-1 text-sm font-medium">{course.rating}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {course.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                  {course.description}
                </p>

                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <Users className="w-4 h-4 mr-1" />
                  <span className="mr-4">{course.students?.toLocaleString()} students</span>
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{formatDuration(course.duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    {formatPrice(course.price)}
                  </span>
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline flex items-center text-sm"
                  >
                    View Course
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {courses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Results</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
              <div key={index} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {getPlatformIcon(course.platform)}
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(course.platform)}`}>
                      {course.platform}
                    </span>
                  </div>
                  <div className="flex items-center text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="ml-1 text-sm font-medium">{course.rating}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {course.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                  {course.description}
                </p>

                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <Users className="w-4 h-4 mr-1" />
                  <span className="mr-4">{course.students?.toLocaleString()} students</span>
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{formatDuration(course.duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    {formatPrice(course.price)}
                  </span>
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline flex items-center text-sm"
                  >
                    View Course
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && recommendations.length === 0 && courses.length === 0 && (
        <div className="card text-center py-12">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500 mb-4">
            Try searching for courses or upload your resume to get personalized recommendations.
          </p>
        </div>
      )}
    </div>
  );
};

export default Courses;
