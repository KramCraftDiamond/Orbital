import { useState, useCallback } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { SplashScreen } from './components/splash/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('orbital_splash_seen');
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('orbital_splash_seen', '1');
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <RouterProvider router={router} />
    </>
  );
}