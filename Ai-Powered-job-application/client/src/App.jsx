import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context
import { AuthProvider } from './contexts/AuthContext.jsx';

// Components
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Pages
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Jobs from './pages/Jobs.jsx';
import JobDetails from './pages/JobDetails.jsx';
import Matches from './pages/Matches.jsx';
import ResumeUpload from './pages/ResumeUpload.jsx';
import Profile from './pages/Profile.jsx';
import Courses from './pages/Courses.jsx';
import InterviewPrep from './pages/InterviewPrep.jsx';
import PostJob from './pages/PostJob.jsx';
import RecruiterDashboard from './pages/RecruiterDashboard.jsx';
import AdminVideos from './pages/AdminVideos.jsx';
import Videos from './pages/Videos.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="pb-20">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/matches" element={
                <ProtectedRoute>
                  <Matches />
                </ProtectedRoute>
              } />
              <Route path="/resume" element={
                <ProtectedRoute>
                  <ResumeUpload />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/courses" element={
                <ProtectedRoute>
                  <Courses />
                </ProtectedRoute>
              } />
              <Route path="/videos" element={
                <ProtectedRoute>
                  <Videos />
                </ProtectedRoute>
              } />
              <Route path="/interview-prep" element={
                <ProtectedRoute>
                  <InterviewPrep />
                </ProtectedRoute>
              } />
              <Route path="/post-job" element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <PostJob />
                </ProtectedRoute>
              } />
              <Route path="/recruiter" element={
                <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/recruiter-dashboard" element={
                <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                  <RecruiterDashboard />
                </ProtectedRoute>
              } />
              <Route path="/seeker" element={
                <ProtectedRoute allowedRoles={['job_seeker']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/videos" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminVideos />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
