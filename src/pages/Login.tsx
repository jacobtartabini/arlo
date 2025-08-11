import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'arlo_access_verified';
const STORAGE_EXPIRY_KEY = 'arlo_access_verified_expiry';
const EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [accessVerified, setAccessVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStoredVerification = () => {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const expiry = sessionStorage.getItem(STORAGE_EXPIRY_KEY);

      if (stored === 'true' && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          console.log('Using cached verification');
          setAccessVerified(true);
          return true;
        }
      }
      return false;
    };

    if (!checkStoredVerification()) {
      const verifyAccess = async () => {
        try {
          const verifyUrl = "https://jacobs-macbook-pro.tailf531bd.ts.net/api/verify";
          const response = await fetch(verifyUrl, {
            method: 'GET',
            credentials: 'include',
          });

          if (!response.ok) {
            setAccessVerified(false);
            sessionStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem(STORAGE_EXPIRY_KEY);
          } else {
            setAccessVerified(true);
            sessionStorage.setItem(STORAGE_KEY, 'true');
            sessionStorage.setItem(STORAGE_EXPIRY_KEY, (Date.now() + EXPIRY_MS).toString());
          }
        } catch (err) {
          setAccessVerified(false);
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(STORAGE_EXPIRY_KEY);
        }
      };

      verifyAccess();
    }
  }, []);

  useEffect(() => {
    if (accessVerified) {
      const timer = setTimeout(() => {
        login().then(() => {
          navigate('/dashboard');
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [accessVerified, navigate, login]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center relative overflow-hidden">
      {/* Favicon image */}
      <div className="absolute top-8 left-8">
        <img src="/favicon2.png" alt="Arlo" className="w-8 h-8" />
      </div>

      {/* Main content */}
      <div className="text-center">
        {/* Large Shield Icon */}
        <div className="relative mb-8">
          <Shield className="w-24 h-24 text-gray-700 mx-auto animate-pulse" />
          
          {/* Subtle loading animation - rotating ring */}
          <div className="absolute inset-0 w-24 h-24 mx-auto">
            <div className="w-full h-full border-2 border-transparent border-t-gray-300 rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Arlo text */}
        <h1 className="text-4xl font-light text-gray-800 tracking-wide">
          Arlo
        </h1>
      </div>
    </div>
  );
};

export default Login;
