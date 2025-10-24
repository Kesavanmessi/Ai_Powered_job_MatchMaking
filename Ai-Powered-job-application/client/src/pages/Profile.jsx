import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Linkedin, 
  Github, 
  Globe,
  Save,
  Eye,
  EyeOff,
  CheckCircle
} from 'lucide-react';

const Profile = () => {
  const { user, updateProfile, changePassword, isRecruiter } = useAuth();
  const [profileData, setProfileData] = useState({
    profile: {
      phone: '',
      location: '',
      bio: '',
      linkedin: '',
      github: '',
      website: ''
    },
    skills: [],
    preferences: {
      jobTypes: [],
      locations: [],
      salaryRange: {
        min: '',
        max: ''
      },
      remoteWork: false
    }
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setProfileData({
        profile: user.profile || {},
        skills: user.skills || [],
        preferences: user.preferences || {}
      });
    }
  }, [user]);

  const handleProfileChange = (section, field, value) => {
    setProfileData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSkillChange = (index, field, value) => {
    const newSkills = [...profileData.skills];
    newSkills[index] = {
      ...newSkills[index],
      [field]: value
    };
    setProfileData(prev => ({
      ...prev,
      skills: newSkills
    }));
  };

  const addSkill = () => {
    setProfileData(prev => ({
      ...prev,
      skills: [...prev.skills, { name: '', level: 'beginner', yearsOfExperience: 0 }]
    }));
  };

  const removeSkill = (index) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile(profileData);
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Password change failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    ...(isRecruiter ? [] : [
      { id: 'skills', name: 'Skills', icon: CheckCircle },
      { id: 'preferences', name: 'Preferences', icon: MapPin }
    ]),
    { id: 'password', name: 'Password', icon: Eye }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-gray-600">
          Manage your profile information and preferences.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit}>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        className="input pl-10"
                        placeholder="+1 (555) 123-4567"
                        value={profileData.profile.phone || ''}
                        onChange={(e) => handleProfileChange('profile', 'phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        className="input pl-10"
                        placeholder="City, State"
                        value={profileData.profile.location || ''}
                        onChange={(e) => handleProfileChange('profile', 'location', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">LinkedIn</label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        className="input pl-10"
                        placeholder="https://linkedin.com/in/username"
                        value={profileData.profile.linkedin || ''}
                        onChange={(e) => handleProfileChange('profile', 'linkedin', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">GitHub</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        className="input pl-10"
                        placeholder="https://github.com/username"
                        value={profileData.profile.github || ''}
                        onChange={(e) => handleProfileChange('profile', 'github', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        className="input pl-10"
                        placeholder="https://yourwebsite.com"
                        value={profileData.profile.website || ''}
                        onChange={(e) => handleProfileChange('profile', 'website', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Bio</label>
                    <textarea
                      className="input"
                      rows={4}
                      placeholder="Tell us about yourself..."
                      value={profileData.profile.bio || ''}
                      onChange={(e) => handleProfileChange('profile', 'bio', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Skills Tab */}
            {activeTab === 'skills' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
                  <button
                    onClick={addSkill}
                    className="btn btn-primary"
                  >
                    Add Skill
                  </button>
                </div>

                <div className="space-y-4">
                  {profileData.skills.map((skill, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="label">Skill Name</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="e.g., JavaScript"
                            value={skill.name}
                            onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label">Level</label>
                          <select
                            className="input"
                            value={skill.level}
                            onChange={(e) => handleSkillChange(index, 'level', e.target.value)}
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="expert">Expert</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Years of Experience</label>
                          <input
                            type="number"
                            className="input"
                            min="0"
                            value={skill.yearsOfExperience}
                            onChange={(e) => handleSkillChange(index, 'yearsOfExperience', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeSkill(index)}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Remove Skill
                      </button>
                    </div>
                  ))}

                  {profileData.skills.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No skills added yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <form onSubmit={handleProfileSubmit}>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Job Preferences</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="label">Preferred Job Types</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['full-time', 'part-time', 'contract', 'internship', 'freelance'].map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            checked={profileData.preferences.jobTypes?.includes(type) || false}
                            onChange={(e) => {
                              const jobTypes = profileData.preferences.jobTypes || [];
                              if (e.target.checked) {
                                handleProfileChange('preferences', 'jobTypes', [...jobTypes, type]);
                              } else {
                                handleProfileChange('preferences', 'jobTypes', jobTypes.filter(t => t !== type));
                              }
                            }}
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">
                            {type.replace('-', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Salary Range</label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="number"
                          className="input"
                          placeholder="Minimum salary"
                          value={profileData.preferences.salaryRange?.min || ''}
                          onChange={(e) => handleProfileChange('preferences', 'salaryRange', {
                            ...profileData.preferences.salaryRange,
                            min: e.target.value
                          })}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          className="input"
                          placeholder="Maximum salary"
                          value={profileData.preferences.salaryRange?.max || ''}
                          onChange={(e) => handleProfileChange('preferences', 'salaryRange', {
                            ...profileData.preferences.salaryRange,
                            max: e.target.value
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remoteWork"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={profileData.preferences.remoteWork || false}
                      onChange={(e) => handleProfileChange('preferences', 'remoteWork', e.target.checked)}
                    />
                    <label htmlFor="remoteWork" className="ml-2 text-sm text-gray-700">
                      Open to remote work
                    </label>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit}>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
                
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="label">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        className="input pr-10"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        className="input pr-10"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        className="input pr-10"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
