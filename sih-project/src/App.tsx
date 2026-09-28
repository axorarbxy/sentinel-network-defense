import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSentinelStore } from './store/useSentinelStore';

const CommandDeck = lazy(() => import('./pages/CommandDeck').then((module) => ({ default: module.CommandDeck })));
const IncidentReplay = lazy(() => import('./pages/IncidentReplay').then((module) => ({ default: module.IncidentReplay })));
const Analyze = lazy(() => import('./pages/Analyze').then((module) => ({ default: module.Analyze })));
const Benchmarks = lazy(() => import('./pages/Benchmarks').then((module) => ({ default: module.Benchmarks })));
const About = lazy(() => import('./pages/About').then((module) => ({ default: module.About })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useSentinelStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useSentinelStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen bg-sentinel-bg" />}>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><CommandDeck /></ProtectedRoute>} />
          <Route path="/investigate/:nodeId" element={<ProtectedRoute><CommandDeck /></ProtectedRoute>} />
          <Route path="/replay" element={<ProtectedRoute><IncidentReplay /></ProtectedRoute>} />
          <Route path="/analyze" element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
          <Route path="/benchmarks" element={<ProtectedRoute><Benchmarks /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};


export default App;
