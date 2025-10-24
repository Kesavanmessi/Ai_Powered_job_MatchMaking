import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Star, 
  Clock, 
  User, 
  Tag,
  Search,
  Filter,
  Play,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminVideos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [topics, setTopics] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    topics: [],
    skills: [],
    difficulty: 'beginner',
    duration: '',
    instructor: '',
    tags: [],
    isFeatured: false
  });

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchVideos();
    fetchTopics();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/videos/topics/list');
      const data = await response.json();
      setTopics(data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingVideo ? `/api/videos/${editingVideo._id}` : '/api/videos';
      const method = editingVideo ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingVideo ? 'Video updated successfully' : 'Video added successfully');
        setShowModal(false);
        setEditingVideo(null);
        resetForm();
        fetchVideos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save video');
      }
    } catch (error) {
      console.error('Error saving video:', error);
      toast.error('Failed to save video');
    }
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description,
      youtubeUrl: video.youtubeUrl,
      topics: video.topics,
      skills: video.skills,
      difficulty: video.difficulty,
      duration: video.duration,
      instructor: video.instructor,
      tags: video.tags,
      isFeatured: video.isFeatured
    });
    setShowModal(true);
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Video deleted successfully');
        fetchVideos();
      } else {
        toast.error('Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      youtubeUrl: '',
      topics: [],
      skills: [],
      difficulty: 'beginner',
      duration: '',
      instructor: '',
      tags: [],
      isFeatured: false
    });
  };

  const addArrayItem = (field, value) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = !filterTopic || video.topics.includes(filterTopic);
    const matchesDifficulty = !filterDifficulty || video.difficulty === filterDifficulty;
    
    return matchesSearch && matchesTopic && matchesDifficulty;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Management</h1>
          <p className="text-gray-600">Manage educational videos for job seekers</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={filterTopic}
                onChange={(e) => setFilterTopic(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Topics</option>
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              setEditingVideo(null);
              resetForm();
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Video
          </button>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div key={video._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {video.isFeatured && (
                    <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Featured
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    video.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                    video.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {video.difficulty}
                  </span>
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                  <a
                    href={video.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 hover:opacity-100 transition-opacity duration-200"
                  >
                    <Play className="w-12 h-12 text-white" />
                  </a>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{video.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {video.duration}min
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {video.instructor}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {video.rating}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {video.topics.slice(0, 3).map((topic, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {topic}
                    </span>
                  ))}
                  {video.topics.length > 3 && (
                    <span className="text-gray-500 text-xs">+{video.topics.length - 3} more</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(video)}
                    className="flex-1 btn btn-outline text-sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(video._id)}
                    className="btn btn-secondary text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No videos found. Add your first video to get started!</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingVideo ? 'Edit Video' : 'Add New Video'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input"
                    rows="3"
                    required
                  />
                </div>

                <div>
                  <label className="label">YouTube URL</label>
                  <input
                    type="url"
                    value={formData.youtubeUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    className="input"
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Instructor</label>
                    <input
                      type="text"
                      value={formData.instructor}
                      onChange={(e) => setFormData(prev => ({ ...prev, instructor: e.target.value }))}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="input"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="label">Topics</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Add topic..."
                      className="input flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addArrayItem('topics', e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.topics.map((topic, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                        {topic}
                        <button
                          type="button"
                          onClick={() => removeArrayItem('topics', index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Skills</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Add skill..."
                      className="input flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addArrayItem('skills', e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.skills.map((skill, index) => (
                      <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeArrayItem('skills', index)}
                          className="text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Add tag..."
                      className="input flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addArrayItem('tags', e.target.value);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeArrayItem('tags', index)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="isFeatured" className="text-sm text-gray-700">
                    Featured video
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn btn-primary flex-1">
                    {editingVideo ? 'Update Video' : 'Add Video'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingVideo(null);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVideos;

