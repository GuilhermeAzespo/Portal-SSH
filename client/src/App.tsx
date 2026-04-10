import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login, Dashboard, Workspace, Users, Permissions, Sectors, Settings } from './pages';
import { PrivateRoute } from './components/PrivateRoute';
import { MainLayout } from './components/MainLayout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="sectors" element={<Sectors />} />
          <Route path="settings" element={<Settings />} />
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>
        
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
