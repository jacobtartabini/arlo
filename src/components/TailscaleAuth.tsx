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

        // Use the auth context to verify access (throws if access denied)
        await verifyTailscaleAccess();

        // Access verified, proceed with success animation
        setShowMessages(false);
        setCurrentMessageIndex(0);

        setTimeout(() => {
          setIsVerifying(false);
          setTimeout(() => navigate('/dashboard'), 1000);
        }, 500);
      } catch (error) {
        console.log('Tailscale network verification failed:', error);
        setIsVerifying(false);
        setNetworkDenied(true);
        setShowMessages(false);
      }
    };

    verifyTailscaleConnection();
  }, [navigate, verifyTailscaleAccess]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Subtle floating background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gray-200/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-gray-300/20 rounded-full blur-2xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-gray-400/10 rounded-full blur-xl animate-pulse transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Favicon with entrance animation */}
      <div className="absolute top-8 left-8 animate-fade-in-down">
        <img 
          src="/favicon2.png" 
          alt="Arlo" 
          className="w-8 h-8 hover:scale-110 transition-transform duration-300 cursor-pointer" 
        />
      </div>

      {/* Content */}
      <div className="text-center relative z-10">
        {/* Large Shield Icon with multiple animations */}
        <div className="flex justify-center mb-8 animate-fade-in-up">
          <div className="relative group w-36 h-36 flex items-center justify-center">
            <div
              className="absolute inset-2 rounded-full border border-gray-300/50 orbit-ring z-0"
            />
            <div
              className="absolute inset-5 rounded-full border border-gray-400/30 orbit-ring-delayed z-0"
            />
            <div
              className="absolute inset-8 rounded-full border border-gray-500/20 orbit-ring-drift z-0"
            />
            <Shield
              className="relative z-10 w-20 h-20 text-gray-800 animate-breathe transition-all duration-500 group-hover:text-gray-600"
              style={{ animationDuration: '4s', animationIterationCount: 'infinite' }}
            />
            <div className="absolute inset-0 rounded-full bg-gray-800/5 scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl z-0" />
          </div>
        </div>

        {/* App Title with staggered letter animation */}
        <div className="overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h1 className="text-6xl font-semibold text-gray-900 tracking-wide hover:tracking-widest transition-all duration-700 cursor-default">
            <span className="inline-block animate-bounce-subtle" style={{ animationDelay: '0s' }}>A</span>
            <span className="inline-block animate-bounce-subtle" style={{ animationDelay: '0.1s' }}>r</span>
            <span className="inline-block animate-bounce-subtle" style={{ animationDelay: '0.2s' }}>l</span>
            <span className="inline-block animate-bounce-subtle" style={{ animationDelay: '0.3s' }}>o</span>
          </h1>
        </div>

        {/* Loading dots with wave animation */}
        {isVerifying && (
          <div className="mt-12 flex justify-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-wave" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-wave" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-wave" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Success state with scale animation */}
        {!isVerifying && !networkDenied && (
          <div className="mt-12 animate-scale-in">
            <div className="text-green-600 text-sm font-medium animate-fade-in">
              ✓ Connected
            </div>
          </div>
        )}

        {/* Error State with shake animation */}
        {networkDenied && (
          <div className="mt-12 text-red-600 text-sm animate-shake">
            Network access required
          </div>
        )}
      </div>
    </div>
  );
};

export default TailscaleAuth;
