import React, { useEffect, useRef } from 'react';
import { Terminal, Database, Server, Shield, Activity, Cpu, HardDrive } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STARTER_CARDS = [
  {
    id: 'c1',
    col: 'col-span-1 sm:col-span-2',
    row: 'row-span-2',
    title: 'Diagnose an Incident',
    desc: 'Evidence-first diagnostic checklist for memory leaks and CPU spikes.',
    prompt: 'My Linux server is running out of memory. Walk me through a structured diagnostic.',
    icon: <Activity size={24} className="text-white drop-shadow-md" />,
    bg: 'bg-white/[0.05] hover:bg-white/[0.08]',
    border: 'border-white/[0.12]',
  },
  {
    id: 'c2',
    col: 'col-span-1 sm:col-span-2',
    row: 'row-span-1',
    title: 'Health Check',
    desc: 'Overall system audit.',
    prompt: 'Give me a complete health-check checklist for a production Linux server.',
    icon: <Shield size={20} className="text-white drop-shadow-md" />,
    bg: 'bg-white/[0.05] hover:bg-white/[0.08]',
    border: 'border-white/[0.12]',
  },
  {
    id: 'c3',
    col: 'col-span-1',
    row: 'row-span-1',
    title: 'Service Failures',
    desc: 'Journalctl analysis.',
    prompt: 'How do I inspect recent systemd service failures using journalctl and systemctl?',
    icon: <Terminal size={20} className="text-white drop-shadow-md" />,
    bg: 'bg-white/[0.05] hover:bg-white/[0.08]',
    border: 'border-white/[0.12]',
  },
  {
    id: 'c4',
    col: 'col-span-1',
    row: 'row-span-1',
    title: 'Security & Access Logs',
    desc: 'Review auth.log and recent SSH logins to detect anomalies.',
    prompt: 'Show me the commands to analyze /var/log/auth.log for failed SSH attempts.',
    icon: <Server size={20} className="text-white drop-shadow-md" />,
    bg: 'bg-white/[0.05] hover:bg-white/[0.08]',
    border: 'border-white/[0.12]',
  }
];

export default function WelcomeScreen({ onSelect, scrollContainer }) {
  const containerRef = useRef(null);
  const heroTextRef = useRef(null);
  const imageRef = useRef(null);
  const bentoRef = useRef(null);
  const pinnedSectionRef = useRef(null);
  const pinnedTitleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Entrance
      gsap.from(heroTextRef.current.children, {
        y: 40,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power4.out',
        delay: 0.2
      });

      // Floating Image Entrance & Hover Physics
      gsap.from(imageRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 1.5,
        ease: 'expo.out',
        delay: 0.6
      });

      // Bento Grid Stagger on Scroll
      gsap.from('.bento-card', {
        scrollTrigger: {
          trigger: bentoRef.current,
          scroller: scrollContainer?.current || window,
          start: 'top 85%',
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out'
      });

      // Image Scale & Fade Scroll
      gsap.to(imageRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          scroller: scrollContainer?.current || window,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
        y: 150,
        opacity: 0.2,
        scale: 1.1,
      });

      // Scroll Pinning (GSAP Split)
      ScrollTrigger.create({
        trigger: pinnedSectionRef.current,
        scroller: scrollContainer?.current || window,
        pin: pinnedTitleRef.current,
        start: 'top 30%',
        end: 'bottom 70%',
      });

      // Marquee continuous
      gsap.to('.marquee-track', {
        xPercent: -50,
        repeat: -1,
        duration: 25,
        ease: 'linear'
      });

    }, containerRef);

    return () => ctx.revert();
  }, [scrollContainer]);

  return (
    <div ref={containerRef} className="w-full min-h-full pb-48 pt-10 px-4 md:px-12 flex flex-col items-center">
      
      {/* ── Attention (Hero - Editorial Split) ────────────────────────── */}
      <section className="w-full max-w-[90rem] min-h-[75vh] flex flex-col lg:flex-row justify-between items-center relative mb-32 py-32 md:py-48">
        
        {/* Left Side: Massive Text */}
        <div ref={heroTextRef} className="relative z-10 w-full lg:w-[65%] max-w-6xl">
          <h1 className="text-[clamp(3.5rem,6vw,6rem)] font-black leading-[1.05] tracking-tight text-white mb-8">
            Server
            <span 
              className="inline-block w-24 h-12 md:w-40 md:h-20 rounded-full align-middle bg-cover bg-center mx-4 grayscale opacity-90 border border-white/20" 
              style={{backgroundImage: 'url(https://picsum.photos/seed/monochrome_server/400/200?grayscale)'}}
            />
            Intelligence.
            <br />
            Zero Distractions.
          </h1>
          <p className="mt-12 text-2xl text-zinc-300 max-w-2xl font-light leading-relaxed">
            Stop digging through terminal windows. Parse logs, run diagnostics, and identify anomalies instantly with precision AI.
          </p>
        </div>

        {/* Right Side: Editorial Image with Negative Space */}
        <div className="w-full lg:w-[30%] flex justify-end mt-16 lg:mt-0 relative z-0">
          <div 
            ref={imageRef}
            className="w-72 h-96 md:w-[350px] md:h-[500px] rounded-sm overflow-hidden shadow-2xl border border-white/5 relative group"
          >
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-700 z-10" />
            <img 
              src="https://picsum.photos/seed/monochrome_abstract/800/1000?grayscale" 
              alt="Datacenter Abstract" 
              className="w-full h-full object-cover grayscale contrast-125 opacity-90 scale-100 group-hover:scale-105 transition-transform duration-1000 ease-out"
            />
          </div>
        </div>
      </section>

      {/* ── Desire (Scroll Pinning & Marquee) ───────────────────────── */}
      <section ref={pinnedSectionRef} className="w-full max-w-7xl mb-48 flex flex-col md:flex-row gap-16 relative py-32 md:py-48">
        {/* Left Pinned Title */}
        <div className="w-full md:w-1/3">
          <div ref={pinnedTitleRef}>
            <h2 className="text-[clamp(2.5rem,4vw,4rem)] font-bold leading-tight text-white tracking-tight">
              Deep Systems
              <br/>
              Analysis
            </h2>
            <p className="text-zinc-300 mt-6 text-lg font-light leading-relaxed max-w-sm">
              We monitor the invisible so you don't have to. Every metric mapped and understood.
            </p>
          </div>
        </div>

        {/* Right Scrolling Content */}
        <div className="w-full md:w-2/3 flex flex-col gap-8">
           {/* Infinite Marquee inside right panel */}
          <div className="w-full overflow-hidden flex py-16 bg-white/[0.02] border border-white/5 rounded-3xl mb-12">
            <div className="marquee-track flex whitespace-nowrap items-center gap-16 md:gap-32 pr-16 md:pr-32">
              {[...Array(2)].map((_, idx) => (
                <React.Fragment key={idx}>
                  <span className="flex items-center gap-4 text-3xl font-bold text-zinc-100 uppercase tracking-widest drop-shadow-md"><Cpu size={40} /> SYSTEMD</span>
                  <span className="flex items-center gap-4 text-3xl font-bold text-zinc-100 uppercase tracking-widest drop-shadow-md"><Database size={40} /> POSTGRES</span>
                  <span className="flex items-center gap-4 text-3xl font-bold text-zinc-100 uppercase tracking-widest drop-shadow-md"><Server size={40} /> NGINX</span>
                  <span className="flex items-center gap-4 text-3xl font-bold text-zinc-100 uppercase tracking-widest drop-shadow-md"><HardDrive size={40} /> DOCKER</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="w-full h-80 rounded-3xl bg-zinc-900 border border-white/10 p-10 flex flex-col justify-between group overflow-hidden relative shadow-2xl shadow-black/50">
            <img src="https://picsum.photos/seed/monochrome_logs/800/400?grayscale" alt="Logs" className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale group-hover:scale-105 group-hover:opacity-50 transition-all duration-700 ease-out" />
            <div className="relative z-10 drop-shadow-lg">
              <Activity size={32} className="text-white mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2">Real-time Parsing</h3>
              <p className="text-zinc-200">Stream your journalctl logs directly into the analysis engine.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interest (Gapless Bento Grid) ───────────────────────────── */}
      <section ref={bentoRef} className="w-full max-w-6xl mb-48 z-10 py-32 md:py-48">
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-16 text-center">Diagnostic Workflows</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 grid-flow-dense gap-4 md:gap-6 auto-rows-[200px]">
          {STARTER_CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => onSelect(card.prompt)}
              className={`bento-card group relative overflow-hidden rounded-3xl border backdrop-blur-sm p-8 md:p-10 text-left transition-all duration-700 ease-out hover:shadow-glow-white hover:-translate-y-1 flex flex-col justify-between ${card.col} ${card.row} ${card.bg} ${card.border}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative z-10">
                <div className="mb-6 transform group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-500 ease-out origin-left text-white">
                  {card.icon}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight tracking-tight drop-shadow-sm">
                  {card.title}
                </h3>
              </div>
              
              <p className="relative z-10 text-base text-zinc-300 font-medium max-w-sm drop-shadow-sm">
                {card.desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Action CTA spacer (Chat Input will sit fixed at bottom) */}
      <div className="h-48 w-full flex items-end justify-center opacity-70">
        <p className="text-sm font-semibold tracking-widest uppercase text-zinc-500">Initiate terminal link below</p>
      </div>

    </div>
  );
}
