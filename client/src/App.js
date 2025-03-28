import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import Login from './pages/common/Login';
import Register from './pages/common/Register';
import Home from './pages/common/Home';
import Profile from './pages/common/Profile';
import WriteExam from './pages/user/WriteExam';
import AdminReports from './pages/admin/AdminReports';
import UserReports from './pages/user/UserReports';
import Exams from './pages/admin/Exams';
import AddEditExam from './pages/admin/Exams/AddEditExam';
import AddEditQuestion from './pages/admin/Exams/AddEditQuestion';
import ProtectedRoute from './components/ProtectedRoute';
import ForgotPassword from './pages/common/ForgotPassword';
import ResetPassword from './pages/common/ResetPassword';
import ThemeToggle from './components/ThemeToggle';
import { initializeTheme } from './stylesheets/theme';
import './stylesheets/theme.css';
import './stylesheets/alignments.css';
import './stylesheets/textelements.css';
import './stylesheets/custom-components.css';
import './stylesheets/form-elements.css';
import './stylesheets/layout.css';
import ErrorBoundary from './components/ErrorBoundary';

// Configure React Router v7 flags
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  const { loading } = useSelector(state => state.loader);
  
  useEffect(() => {
    // Initialize theme system when app starts
    initializeTheme();
  }, []);
  
  return (
    <ErrorBoundary>
      <BrowserRouter {...routerConfig}>
        {loading && (
          <div className="loader-parent">
            <Spin size="large" />
          </div>
        )}
        
        {/* Theme toggle component */}
        <ThemeToggle />
        
        <Routes>
          <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
          <Route path="/register" element={<ErrorBoundary><Register /></ErrorBoundary>} />
          <Route path="/" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/profile" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/user/reports" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <UserReports />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/user/write-exam/:id" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <WriteExam />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/admin/reports" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <AdminReports />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/admin/exams" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <Exams />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/admin/exams/add" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <AddEditExam />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/admin/exams/edit/:id" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <AddEditExam />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/admin/exams/questions/:id" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <AddEditQuestion />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
          <Route path="/forgot-password" element={<ErrorBoundary><ForgotPassword /></ErrorBoundary>} />
          <Route path="/reset-password/:email" element={<ErrorBoundary><ResetPassword /></ErrorBoundary>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
