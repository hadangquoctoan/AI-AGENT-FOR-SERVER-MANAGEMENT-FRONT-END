import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Copy, Check, Terminal, X } from 'lucide-react';

export default function CurlPopupModal({ command, onClose }) {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Entrance animations
    gsap.from(overlayRef.current, { opacity: 0, duration: 0.5, ease: 'power2.out' });
    gsap.from(modalRef.current, { y: 50, scale: 0.95, opacity: 0, duration: 0.6, ease: 'back.out(1.5)', delay: 0.1 });
  }, []);

  const handleClose = () => {
    // Exit animations
    gsap.to(modalRef.current, { y: 30, scale: 0.95, opacity: 0, duration: 0.4, ease: 'power2.in' });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: onClose });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 font-sans">
      
      <div 
        ref={modalRef}
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
      >
        {/* Glow effect */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check size={20} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Registration Successful</h3>
              <p className="text-sm text-zinc-400 font-light">Your agent profile is initialized.</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-zinc-500 hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          <p className="text-zinc-300 text-lg mb-6 leading-relaxed">
            To connect your server to OpsPilot and begin sending telemetry and logs, run the following command in your server's terminal:
          </p>

          <div className="w-full">
            {/* Terminal Window Mockup */}
            <div className="w-full bg-black rounded-xl border border-white/5 overflow-hidden font-mono shadow-inner shadow-black/50">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-zinc-950">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs text-zinc-600 flex items-center gap-2">
                  <Terminal size={12} /> root@server:~
                </span>
              </div>
              <div className="p-5 overflow-x-auto text-sm text-green-400 break-all whitespace-pre-wrap">
                $ {command}
              </div>
            </div>

            {/* Copy Button — below terminal */}
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleCopy}
                className={`px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-xl ${
                  copied ? 'bg-green-500 text-black' : 'bg-white text-black'
                }`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Command'}
              </button>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleClose}
              className="px-8 py-3 rounded-full bg-transparent border border-white/20 text-white font-bold hover:bg-white hover:text-black transition-colors duration-300"
            >
              Proceed to Dashboard
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
