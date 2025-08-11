import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Wifi, Lock } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface Message {
  text: string;
  icon: React.ReactNode;
  delay: number;
}

const TailscaleAuth: React.FC = () => {
  const navigate = useNavigate();
  const { verifyTailscaleAccess } = useAuth();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(true);
  const [networkDenied, setNetworkDenied] = useState(false);
  const [showMessages, setShowMessages] = useState(true);

  const messages: Message[] = [
    {
      text: "Verifying secure network access...",
      icon: <Shield className="w-6 h-6" />,
      delay: 0
    },
    {
      text: "Scanning Tailscale network...",
      icon: <Wifi className="w-6 h-6" />,
      delay: 1500
    },
    {
      text: "Establishing encrypted connection...",
      icon: <Lock className="w-6 h-6" />,
      delay: 3000
    }
  ];

  // Cycle through messages
  useEffect(() => {
    if (!showMessages) return;

    const timer = setTimeout(() => {
      if (currentMessageIndex < messages.length - 1) {
        setCurrentMessageIndex(prev => prev + 1);
      }
    }, messages[currentMessageIndex]?.delay || 1500);

    return () => clearTimeout(timer);
  }, [currentMessageIndex, showMessages]);

  // Verify Tailscale network connection
  useEffect(() => {
    const verifyTailscaleConnection = async () => {
      try {
        // Wait a moment for better UX
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Use the auth context to verify access
        await verifyTailscaleAccess();

        // Show success message briefly
        setShowMessages(false);
        setCurrentMessageIndex(0);
        
        // Brief success animation
        setTimeout(() => {
          setIsVerifying(false);
          // Redirect to dashboard after success animation
          setTimeout(() => navigate('/dashboard'), 1000);
        }, 500);
      } catch (error) {
        // Network not accessible or timeout
        console.log('Tailscale network verification failed:', error);
        setIsVerifying(false);
        setNetworkDenied(true);
        setShowMessages(false);
      }
    };

    verifyTailscaleConnection();
  }, [navigate, verifyTailscaleAccess]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
      {/* Favicon */}
      <div className="absolute top-8 left-8">
        <img src="/favicon2.png" alt="Arlo" className="w-8 h-8" />
      </div>

      {/* Content */}
      <div className="text-center">
        {/* Large Shield Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Shield className="w-24 h-24 text-gray-800" />
            {/* Subtle loading animation */}
            <div className="absolute inset-0 rounded-full border-2 border-gray-300 animate-pulse" />
          </div>
        </div>

        {/* App Title */}
        <h1 className="text-6xl font-light text-gray-900 tracking-wide">
          Arlo
        </h1>

        {/* Error State (only show if network denied) */}
        {networkDenied && (
          <div className="mt-12 text-red-600 text-sm">
            Network access required
          </div>
        )}
      </div>
    </div>
  );
};

export default TailscaleAuth;
