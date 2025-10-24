import React, { useEffect, useState } from 'react';
import { Search, Filter, Play, Clock, User, Star, Tag } from 'lucide-react';

const Videos = () => {
  const [videos, setVideos] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');

  useEffect(() => {
    fetchTopics();
    fetchVideos();
  }, []);

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/videos/topics/list');
      const data = await res.json();
      setTopics(data);
    } catch (e) {
      // noop
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (topic) params.append('topic', topic);
      if (difficulty) params.append('difficulty', difficulty);

      const res = await fetch(`/api/videos?${params.toString()}`);
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Videos</h1>
        <p className="text-gray-600">Curated YouTube videos by topic and skill to help you upskill faster.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchVideos()}
                placeholder="Search by title, description, topic, or skill..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <button onClick={fetchVideos} className="btn btn-primary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="card text-center py-12">
          <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No videos found</h3>
          <p className="text-gray-500">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-black">
                {video.embedUrl ? (
                  <iframe
                    title={video.title}
                    src={video.embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{video.title}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{video.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{video.duration}min</div>
                  <div className="flex items-center gap-1"><User className="w-4 h-4" />{video.instructor}</div>
                  <div className="flex items-center gap-1"><Star className="w-4 h-4" />{video.rating}</div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {video.topics.slice(0, 3).map((t, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <Tag className="w-3 h-3" />{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Videos;


