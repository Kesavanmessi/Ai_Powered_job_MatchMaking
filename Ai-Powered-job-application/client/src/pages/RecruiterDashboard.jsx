import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Users, 
  FileText, 
  Star, 
  Mail, 
  Phone, 
  MapPin, 
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  User
} from 'lucide-react';

const RecruiterDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('matchScore');

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    try {
      const response = await axios.get('/api/jobs/my-jobs');
      setJobs(response.data.jobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast.error('Failed to fetch your jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobId) => {
    setApplicationsLoading(true);
    try {
      const response = await axios.get(`/api/applications/job/${jobId}?status=${statusFilter}&sortBy=${sortBy}`);
      console.log('Applications API Response:', response.data);
      setApplications(response.data.applications);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to fetch applications');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId, status, notes = '') => {
    try {
      await axios.put(`/api/applications/${applicationId}/status`, {
        status,
        recruiterNotes: notes
      });
      
      // Refresh applications
      if (selectedJob) {
        await fetchApplications(selectedJob.id);
      }
      
      toast.success('Application status updated');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update application status');
    }
  };

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setSelectedApplication(null);
    fetchApplications(job.id);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'shortlisted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'hired': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'reviewed': return <Eye className="w-4 h-4" />;
      case 'shortlisted': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'hired': return <Star className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Recruiter Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your job postings and review applications</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Jobs List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Your Jobs</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => handleJobSelect(job)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedJob?.id === job.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    }`}
                  >
                    <h3 className="font-medium text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-600">{job.company.name}</p>
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Users className="w-4 h-4 mr-1" />
                      {job.applicationsCount} applications
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Applications List */}
          <div className="lg:col-span-2">
            {selectedJob ? (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Applications for {selectedJob.title}
                      </h2>
                      <p className="text-sm text-gray-600">{selectedJob.company.name}</p>
                    </div>
                    <div className="flex space-x-2">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Rejected</option>
                        <option value="hired">Hired</option>
                      </select>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="matchScore">Match Score</option>
                        <option value="appliedAt">Applied Date</option>
                        <option value="status">Status</option>
                      </select>
                    </div>
                  </div>
                </div>

                {applicationsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {applications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications</h3>
                        <p className="text-gray-600">No applications found for this job.</p>
                      </div>
                    ) : (
                      applications.map((application) => (
                        <div
                          key={application.id}
                          onClick={() => setSelectedApplication(application)}
                          className={`p-4 cursor-pointer hover:bg-gray-50 ${
                            selectedApplication?.id === application.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {application.applicant?.name || 
                                 (application.applicant?.firstName && application.applicant?.lastName ? 
                                  `${application.applicant.firstName} ${application.applicant.lastName}` : 
                                  'Unknown Applicant')}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {application.applicant?.email || 'Email not available'}
                              </p>
                              <div className="flex items-center mt-1">
                                <span className="text-sm text-gray-500">
                                  Applied {new Date(application.appliedAt).toLocaleDateString()}
                                </span>
                                {application.matchScore && (
                                  <span className="ml-4 text-sm font-medium text-green-600">
                                    {application.matchScore}% match
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                                {getStatusIcon(application.status)}
                                <span className="ml-1 capitalize">{application.status}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Job</h3>
                <p className="text-gray-600">Choose a job from the list to view applications</p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Panel - Remove in production */}
        {typeof window !== 'undefined' && window.location.hostname === 'localhost' && selectedApplication && (
          <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg max-w-md text-xs z-40">
            <h4 className="font-bold mb-2">Debug Info:</h4>
            <pre className="whitespace-pre-wrap overflow-auto max-h-32">
              {JSON.stringify(selectedApplication, null, 2)}
            </pre>
          </div>
        )}

        {/* Application Details Modal */}
        {selectedApplication && (
          <ApplicationDetailsModal
            application={selectedApplication}
            onClose={() => setSelectedApplication(null)}
            onUpdateStatus={updateApplicationStatus}
          />
        )}
      </div>
    </div>
  );
};

// Application Details Modal Component
const ApplicationDetailsModal = ({ application, onClose, onUpdateStatus }) => {
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(application.recruiterNotes || '');
  const [updating, setUpdating] = useState(false);

  // Debug the application data
  console.log('Application Details Modal - Application Data:', application);

  const handleStatusUpdate = async () => {
    setUpdating(true);
    try {
      await onUpdateStatus(application.id, status, notes);
      onClose();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Application Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Applicant Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Applicant Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">
                    {application.applicant?.email || application.applicant?.email || 'Email not available'}
                  </span>
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">
                    {application.applicant?.name || application.applicant?.firstName + ' ' + application.applicant?.lastName || 'Name not available'}
                  </span>
                </div>
                {application.applicant?.profile?.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-600">{application.applicant.profile.phone}</span>
                  </div>
                )}
                {application.applicant?.profile?.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-600">{application.applicant.profile.location}</span>
                  </div>
                )}
                {application.applicant?.profile?.linkedin && (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600">
                      <a href={application.applicant.profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        LinkedIn Profile
                      </a>
                    </span>
                  </div>
                )}
              </div>

              {/* Application Details */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Application Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status:</span>
                    <span className={`text-sm font-medium ${getStatusColor(application.status)}`}>
                      {application.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Applied:</span>
                    <span className="text-sm text-gray-600">
                      {new Date(application.appliedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {application.matchScore && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Match Score:</span>
                      <span className="text-sm font-medium text-green-600">
                        {application.matchScore}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resume Information */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Resume</h4>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-sm text-gray-600">
                      {application.resume?.originalName || application.resume?.fileName || 'Resume not available'}
                    </span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cover Letter */}
              {application.coverLetter && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Cover Letter</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{application.coverLetter}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Resume Data */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resume Details</h3>
              
              {/* Show basic resume info first */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Resume File</h4>
                <div className="text-sm text-gray-600">
                  <p><strong>File:</strong> {application.resume?.originalName || application.resume?.fileName || 'Unknown'}</p>
                  <p><strong>Size:</strong> {application.resume?.fileSize ? `${(application.resume.fileSize / 1024).toFixed(1)} KB` : 'Unknown'}</p>
                  <p><strong>Type:</strong> {application.resume?.mimeType || 'Unknown'}</p>
                </div>
              </div>

              {/* Show extracted data if available */}
              {application.resume?.extractedData ? (
                <div className="space-y-4">
                  {/* Personal Info */}
                  {application.resume.extractedData.personalInfo && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Contact Information</h4>
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        {application.resume.extractedData.personalInfo.name && (
                          <p><strong>Name:</strong> {application.resume.extractedData.personalInfo.name}</p>
                        )}
                        {application.resume.extractedData.personalInfo.email && (
                          <p><strong>Email:</strong> {application.resume.extractedData.personalInfo.email}</p>
                        )}
                        {application.resume.extractedData.personalInfo.phone && (
                          <p><strong>Phone:</strong> {application.resume.extractedData.personalInfo.phone}</p>
                        )}
                        {application.resume.extractedData.personalInfo.location && (
                          <p><strong>Location:</strong> {application.resume.extractedData.personalInfo.location}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {application.resume.extractedData.skills && application.resume.extractedData.skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {application.resume.extractedData.skills.slice(0, 10).map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {skill.name || skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  {application.resume.extractedData.experience && application.resume.extractedData.experience.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Experience</h4>
                      <div className="space-y-2">
                        {application.resume.extractedData.experience.slice(0, 3).map((exp, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded">
                            <div className="font-medium text-sm">{exp.position || exp.title || 'Position'}</div>
                            <div className="text-xs text-gray-600">{exp.company || exp.employer || 'Company'}</div>
                            <div className="text-xs text-gray-500">{exp.duration || exp.period || 'Duration'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {application.resume.extractedData.education && application.resume.extractedData.education.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Education</h4>
                      <div className="space-y-2">
                        {application.resume.extractedData.education.slice(0, 2).map((edu, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded">
                            <div className="font-medium text-sm">{edu.degree || edu.qualification || 'Degree'}</div>
                            <div className="text-xs text-gray-600">{edu.institution || edu.school || 'Institution'}</div>
                            {edu.graduationYear && (
                              <div className="text-xs text-gray-500">{edu.graduationYear}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {application.resume.extractedData.summary && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
                      <div className="p-2 bg-gray-50 rounded text-sm">
                        <p className="text-gray-600">{application.resume.extractedData.summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Resume data not available</p>
                  <p className="text-xs text-gray-400">The resume file is available but detailed parsing is not complete.</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Update */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Application Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                  <option value="hired">Hired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes about this application..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
