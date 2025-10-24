import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, GraduationCap, Users, Briefcase, Settings } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Shield className="w-8 h-8 text-primary-600 mr-3" />
          Admin Panel
        </h1>
        <p className="text-gray-600 mt-2">Welcome, {user?.firstName}. Manage the platform resources and content.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AdminCard
          icon={GraduationCap}
          title="Manage Videos"
          description="Create, edit, and feature learning videos"
          to="/admin/videos"
        />
        <AdminCard
          icon={Users}
          title="Manage Users"
          description="Activate, deactivate, and assign roles"
          to="/admin/users"
          disabled
        />
        <AdminCard
          icon={Briefcase}
          title="Moderate Jobs"
          description="Review and moderate job postings"
          to="/admin/jobs"
          disabled
        />
        <AdminCard
          icon={Settings}
          title="Platform Settings"
          description="Configure global preferences"
          to="/admin/settings"
          disabled
        />
      </div>
    </div>
  );
};

const AdminCard = ({ icon: Icon, title, description, to, disabled }) => {
  const content = (
    <div className={`card h-full ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md transition-shadow'}`}>
      <div className="flex items-start">
        <div className="p-3 rounded-lg bg-primary-100">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
        <div className="ml-4">
          <p className="text-lg font-semibold text-gray-900">{title}</p>
          <p className="text-gray-600 mt-1 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );

  if (disabled) return content;
  return (
    <Link to={to} className="block">
      {content}
    </Link>
  );
};

export default AdminDashboard;


