import React from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Plus,
  Trash2,
  Save,
  Eye
} from 'lucide-react';

const PostJob = () => {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    company: {
      name: '',
      website: '',
      size: '',
      industry: ''
    },
    location: {
      city: '',
      state: '',
      country: 'United States',
      remote: false,
      hybrid: false
    },
    requirements: {
      skills: [],
      experience: {
        min: '',
        max: '',
        unit: 'years'
      },
      education: {
        degree: '',
        field: '',
        required: false
      }
    },
    compensation: {
      salary: {
        min: '',
        max: '',
        currency: 'USD',
        period: 'yearly'
      },
      benefits: [],
      equity: ''
    },
    jobType: 'full-time'
  });

  const [newSkill, setNewSkill] = React.useState({ name: '', level: 'required', importance: 3 });
  const [newBenefit, setNewBenefit] = React.useState('');

  const handleChange = (section, field, value) => {
    if (!field) {
      setFormData(prev => ({
        ...prev,
        [section]: value
      }));
      return;
    }

    // Otherwise update nested object section.field
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedChange = (section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const addSkill = () => {
    if (!newSkill.name.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        skills: [...prev.requirements.skills, { ...newSkill }]
      }
    }));
    setNewSkill({ name: '', level: 'required', importance: 3 });
  };

  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        skills: prev.requirements.skills.filter((_, i) => i !== index)
      }
    }));
  };

  const addBenefit = () => {
    if (!newBenefit.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      compensation: {
        ...prev.compensation,
        benefits: [...prev.compensation.benefits, newBenefit]
      }
    }));
    setNewBenefit('');
  };

  const removeBenefit = (index) => {
    setFormData(prev => ({
      ...prev,
      compensation: {
        ...prev.compensation,
        benefits: prev.compensation.benefits.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/api/jobs', formData);
      toast.success('Job posted successfully!');
      // Reset form
      setFormData({
        title: '',
        description: '',
        company: { name: '', website: '', size: '', industry: '' },
        location: { city: '', state: '', country: 'United States', remote: false, hybrid: false },
        requirements: { skills: [], experience: { min: '', max: '', unit: 'years' }, education: { degree: '', field: '', required: false } },
        compensation: { salary: { min: '', max: '', currency: 'USD', period: 'yearly' }, benefits: [], equity: '' },
        jobType: 'full-time'
      });
    } catch (error) {
      console.error('Failed to post job:', error);
      toast.error(error.response?.data?.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  const jobTypes = [
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
    { value: 'freelance', label: 'Freelance' }
  ];

  const skillLevels = [
    { value: 'required', label: 'Required' },
    { value: 'preferred', label: 'Preferred' },
    { value: 'nice-to-have', label: 'Nice to have' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a Job</h1>
        <p className="text-gray-600">
          Create a job posting to find the best candidates for your team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="label">Job Title *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Senior Software Engineer"
                value={formData.title}
                onChange={(e) => handleChange('title', '', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Job Type *</label>
              <select
                className="input"
                value={formData.jobType}
                onChange={(e) => handleChange('jobType', '', e.target.value)}
                required
              >
                {jobTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Company Name *</label>
              <input
                type="text"
                className="input"
                placeholder="Your company name"
                value={formData.company.name}
                onChange={(e) => handleChange('company', 'name', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Company Website</label>
              <input
                type="url"
                className="input"
                placeholder="https://yourcompany.com"
                value={formData.company.website}
                onChange={(e) => handleChange('company', 'website', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Company Size</label>
              <select
                className="input"
                value={formData.company.size}
                onChange={(e) => handleChange('company', 'size', e.target.value)}
              >
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="501-1000">501-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            </div>

            <div>
              <label className="label">Industry</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Technology, Healthcare"
                value={formData.company.industry}
                onChange={(e) => handleChange('company', 'industry', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="label">Job Description *</label>
            <textarea
              className="input"
              rows={6}
              placeholder="Describe the role, responsibilities, and what you're looking for..."
              value={formData.description}
              onChange={(e) => handleChange('description', '', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Location */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Location</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="label">City *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., San Francisco"
                value={formData.location.city}
                onChange={(e) => handleChange('location', 'city', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">State *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., CA"
                value={formData.location.state}
                onChange={(e) => handleChange('location', 'state', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Country</label>
              <input
                type="text"
                className="input"
                value={formData.location.country}
                onChange={(e) => handleChange('location', 'country', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={formData.location.remote}
                onChange={(e) => handleChange('location', 'remote', e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-700">Remote work available</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={formData.location.hybrid}
                onChange={(e) => handleChange('location', 'hybrid', e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-700">Hybrid work available</span>
            </label>
          </div>
        </div>

        {/* Requirements */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Requirements</h2>
          
          {/* Skills */}
          <div className="mb-6">
            <label className="label">Required Skills</label>
            <div className="space-y-3">
              {formData.requirements.skills.map((skill, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium">{skill.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({skill.level})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Add a skill"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                />
                <select
                  className="input"
                  value={newSkill.level}
                  onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value })}
                >
                  {skillLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addSkill}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="label">Minimum Experience</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                value={formData.requirements.experience.min}
                onChange={(e) => handleNestedChange('requirements', 'experience', 'min', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Maximum Experience</label>
              <input
                type="number"
                className="input"
                placeholder="5"
                value={formData.requirements.experience.max}
                onChange={(e) => handleNestedChange('requirements', 'experience', 'max', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Unit</label>
              <select
                className="input"
                value={formData.requirements.experience.unit}
                onChange={(e) => handleNestedChange('requirements', 'experience', 'unit', e.target.value)}
              >
                <option value="years">Years</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>

          {/* Education */}
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="label">Degree Level</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Bachelor's, Master's"
                value={formData.requirements.education.degree}
                onChange={(e) => handleNestedChange('requirements', 'education', 'degree', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Field of Study</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Computer Science"
                value={formData.requirements.education.field}
                onChange={(e) => handleNestedChange('requirements', 'education', 'field', e.target.value)}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="education-required"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={formData.requirements.education.required}
                onChange={(e) => handleNestedChange('requirements', 'education', 'required', e.target.checked)}
              />
              <label htmlFor="education-required" className="ml-2 text-sm text-gray-700">
                Education required
              </label>
            </div>
          </div>
        </div>

        {/* Compensation */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Compensation</h2>
          
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="label">Min Salary</label>
              <input
                type="number"
                className="input"
                placeholder="50000"
                value={formData.compensation.salary.min}
                onChange={(e) => handleNestedChange('compensation', 'salary', 'min', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Max Salary</label>
              <input
                type="number"
                className="input"
                placeholder="80000"
                value={formData.compensation.salary.max}
                onChange={(e) => handleNestedChange('compensation', 'salary', 'max', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Currency</label>
              <select
                className="input"
                value={formData.compensation.salary.currency}
                onChange={(e) => handleNestedChange('compensation', 'salary', 'currency', e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label className="label">Period</label>
              <select
                className="input"
                value={formData.compensation.salary.period}
                onChange={(e) => handleNestedChange('compensation', 'salary', 'period', e.target.value)}
              >
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <label className="label">Benefits</label>
            <div className="space-y-3">
              {formData.compensation.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="flex-1">{benefit}</span>
                  <button
                    type="button"
                    onClick={() => removeBenefit(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Add a benefit"
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addBenefit}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Equity</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., 0.1% - 0.5%"
              value={formData.compensation.equity}
              onChange={(e) => handleChange('compensation', 'equity', e.target.value)}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="btn btn-secondary"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Posting...' : 'Post Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostJob;
