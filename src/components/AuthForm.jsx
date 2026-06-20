import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Loader2, ArrowRight } from 'lucide-react';

export default function AuthForm({ isRegister, onSwitchMode, onLogin, onRegisterSuccess }) {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const formRef = useRef(null);

  // Reset form state whenever switching between Login and Register
  useEffect(() => {
    setFormData({ name: '', email: '', password: '' });
    setError(null);
  }, [isRegister]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const shakeForm = () => {
    gsap.fromTo(formRef.current, 
      { x: -10 },
      { x: 10, duration: 0.1, yoyo: true, repeat: 3, ease: 'linear', onComplete: () => gsap.set(formRef.current, {x: 0}) }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!formData.email || !formData.password || (isRegister && !formData.name)) {
      setError("Please fill in all required fields.");
      shakeForm();
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Authentication failed');
      }

      const data = await response.json();
      
      // Save auth data
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.email);
      localStorage.setItem('userId', data.userId);

      // After successful login or registration, immediately log the user in
      onLogin();
    } catch (err) {
      setError(err.message);
      shakeForm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
          {isRegister ? 'Initialize Agent' : 'Welcome back'}
        </h1>
        <p className="text-zinc-400 text-lg font-light">
          {isRegister 
            ? 'Create an account to deploy your server monitoring agent.' 
            : 'Enter your credentials to access the dashboard.'}
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
        
        {isRegister && (
          <div className="flex flex-col gap-2 group">
            <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wider group-focus-within:text-white transition-colors">
              Full Name
            </label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white text-lg placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 group">
          <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wider group-focus-within:text-white transition-colors">
            Email Address
          </label>
          <input 
            type="email" 
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="admin@server.local"
            className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white text-lg placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2 group">
          <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wider group-focus-within:text-white transition-colors">
            Password
          </label>
          <input 
            type="password" 
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-white text-lg placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium mt-2">{error}</p>
        )}

        <button 
          type="submit" 
          disabled={isLoading}
          className="mt-8 group/btn relative w-full overflow-hidden rounded-full bg-white px-8 py-4 text-black font-bold text-lg hover:scale-[1.02] transition-transform duration-500 shadow-xl shadow-white/10 flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={24} className="animate-spin text-black" />
          ) : (
            <>
              <span className="relative z-10">{isRegister ? 'Deploy Agent' : 'Access Systems'}</span>
              <ArrowRight size={20} className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-12 text-center">
        <p className="text-zinc-500 font-light">
          {isRegister ? 'Already tracking nodes? ' : 'Need to deploy a new agent? '}
          <button 
            type="button"
            onClick={onSwitchMode}
            className="text-white font-semibold hover:underline underline-offset-4 decoration-white/30"
          >
            {isRegister ? 'Sign in here.' : 'Register here.'}
          </button>
        </p>
      </div>
    </div>
  );
}
