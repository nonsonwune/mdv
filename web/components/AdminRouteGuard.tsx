/**
 * Admin Route Guard Component
 * 
 * Protects routes that should only be accessible to admin users.
 * Displays appropriate error messages for unauthorized access.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface User {
  id: number;
  role: string;
  email: string;
  name: string;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  children,
  fallback
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !user) {
        // User not authenticated, redirect to login
        router.push('/staff-login?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }

      // Check if user has admin role
      if (user.role !== 'admin') {
        setError('Access denied. This page requires administrator privileges.');
      } else {
        setError(null); // Clear any previous errors
      }
    }
  }, [user, loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-maroon-600"></div>
      </div>
    );
  }

  if (error) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg 
              className="w-6 h-6 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
            Access Denied
          </h1>
          
          <p className="text-gray-600 text-center mb-6">
            {error}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/admin')}
              className="w-full px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700 transition-colors"
            >
              Go to Admin Dashboard
            </button>
            
            <button
              onClick={() => router.push('/staff-login')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Login as Administrator
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              Need Access?
            </h3>
            <p className="text-sm text-blue-700">
              Contact your system administrator to request access to audit logs. 
              This feature requires administrator privileges for security and compliance reasons.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and has admin role
  if (isAuthenticated && user && user.role === 'admin' && !error) {
    return <>{children}</>;
  }

  // Fallback - should not reach here if auth context is working properly
  return null;
};

export default AdminRouteGuard;
