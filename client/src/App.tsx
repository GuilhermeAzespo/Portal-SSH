import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login, Dashboard, Workspace } from './pages';
import { PrivateRoute } from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        
        <Route path="/workspace" element={
          <PrivateRoute>
            <Workspace />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
