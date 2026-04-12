import { useContext } from 'react';
import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export const PrivateRoute = ({ children }: { children: ReactElement }) => {
  const { user, loading } = useContext(AuthContext);

  // While AuthContext is restoring the user from localStorage, render nothing.
  // Without this, the first render sees user=null and immediately redirects to /login
  // (which breaks page reloads after OTA updates).
  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};