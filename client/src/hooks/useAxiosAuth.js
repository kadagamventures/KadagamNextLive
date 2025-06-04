// src/hooks/useAxiosAuth.js
import { useEffect } from 'react';
import { tokenRefreshInterceptor } from '../utils/axiosInstance';
import { useNavigate } from 'react-router-dom';

const useAxiosAuth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for logout globally
    const logoutListener = () => {
      console.warn("⚠️ Token expired or session invalid. Logging out...");
      localStorage.removeItem('token');
      navigate('/login', { replace: true }); // Redirect to login
    };

    window.addEventListener('auth:logout', logoutListener);

    return () => {
      window.removeEventListener('auth:logout', logoutListener);
    };
  }, [navigate]);

  return tokenRefreshInterceptor;
};

export default useAxiosAuth;
