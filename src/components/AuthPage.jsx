import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ArrowLeft, Activity, Shield } from 'lucide-react';
import AuthForm from './AuthForm';
import CurlPopupModal from './CurlPopupModal';

export default function AuthPage({ onLogin, onBack }) {
  const [isRegister, setIsRegister] = useState(false);
  const [showCurlPopup, setShowCurlPopup] = useState(false);
  const [installCommand, setInstallCommand] = useState("");
  
  const containerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance Animation
      gsap.from(leftPanelRef.current, {
        x: -50,
        opacity: 0,
        duration: 1.2,
        ease: 'power4.out',
      });

      gsap.from(rightPanelRef.current, {
        scale: 0.95,
        opacity: 0,
        duration: 1.5,
        ease: 'expo.out',
        delay: 0.2
      });

      // Subtle slow zoom on background image
      gsap.to(imageRef.current, {
        scale: 1.1,
        duration: 20,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // GSAP animation for mode switch — also resets form state
  const handleModeSwitch = () => {
    gsap.to(leftPanelRef.current, {
      opacity: 0,
      y: 10,
      duration: 0.3,
      onComplete: () => {
        setIsRegister(prev => !prev);
        gsap.to(leftPanelRef.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      }
    });
  };

  const handleRegisterSuccess = (command) => {
    setInstallCommand(command || "echo 'No install command provided'");
    setShowCurlPopup(true);
  };

  const handleCurlClose = () => {
    setShowCurlPopup(false);
    // After registration + popup closed => log the user in to dashboard
    onLogin();
  };

  return (
    <div ref={containerRef} className="w-full h-full min-h-screen bg-[#0a0a0c] flex overflow-hidden font-sans">
      
      {/* ── Editorial Split: Left Column (Form) ───────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative z-10">
        
        {/* Nav / Back Button */}
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 sm:left-12 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold tracking-wide text-sm uppercase">Return</span>
        </button>

        <div ref={leftPanelRef} className="w-full max-w-md mx-auto">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-lg shadow-white/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="font-bold text-2xl text-white tracking-wide">OpsPilot</span>
          </div>

          <AuthForm 
            isRegister={isRegister} 
            onSwitchMode={handleModeSwitch} 
            onLogin={onLogin}
            onRegisterSuccess={handleRegisterSuccess}
          />
        </div>
      </div>

      {/* ── Editorial Split: Right Column (Cinematic Visual) ──────────── */}
      <div 
        ref={rightPanelRef}
        className="hidden lg:flex lg:w-1/2 relative p-4"
      >
        <div className="w-full h-full rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/5">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
          
          <img 
            ref={imageRef}
            src="https://picsum.photos/seed/server_architecture/1920/1080?grayscale" 
            alt="Server Infrastructure" 
            className="w-full h-full object-cover grayscale contrast-125 opacity-80"
          />

          {/* Overlaid Typography & Component Array */}
          <div className="absolute bottom-16 left-16 right-16 z-20">
            <h2 className="text-[clamp(2.5rem,3.5vw,4.5rem)] font-black text-white leading-[1.05] tracking-tight mb-8 max-w-2xl">
              Unify your
              <span 
                className="inline-block w-20 h-10 rounded-full align-middle bg-cover bg-center mx-3 border border-white/20 shadow-lg"
                style={{backgroundImage: 'url(https://picsum.photos/seed/data/200/100?grayscale)'}}
              />
              infrastructure.
            </h2>
            
            {/* Feedback / Feature Carousel Style Items */}
            <div className="grid grid-cols-2 gap-6 mt-12 border-t border-white/10 pt-8">
              <div className="flex flex-col gap-2">
                <Activity size={24} className="text-white mb-2" />
                <h4 className="text-white font-bold text-lg">Real-time Telemetry</h4>
                <p className="text-zinc-400 text-sm font-light">Sub-second metrics parsing with GSAP visualization.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Shield size={24} className="text-white mb-2" />
                <h4 className="text-white font-bold text-lg">Secure Handshake</h4>
                <p className="text-zinc-400 text-sm font-light">End-to-end encrypted session keys per agent.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCurlPopup && <CurlPopupModal command={installCommand} onClose={handleCurlClose} />}

    </div>
  );
}
