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
    icon: <Activity size={24} className="text-emerald-400" />,
    bg: 'bg-emerald-500/5 hover:bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    id: 'c2',
    col: 'col-span-1',
    row: 'row-span-1',
    title: 'Health Check',
    desc: 'Overall system audit.',
    prompt: 'Give me a complete health-check checklist for a production Linux server.',
    icon: <Shield size={20} className="text-indigo-400" />,
    bg: 'bg-indigo-500/5 hover:bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    id: 'c3',
    col: 'col-span-1',
    row: 'row-span-1',
    title: 'Service Failures',
    desc: 'Journalctl analysis.',
    prompt: 'How do I inspect recent systemd service failures using journalctl and systemctl?',
    icon: <Terminal size={20} className="text-rose-400" />,
    bg: 'bg-rose-500/5 hover:bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  {
    id: 'c4',
    col: 'col-span-1 sm:col-span-3',
    row: 'row-span-1',
    title: 'Security & Access Logs',
    desc: 'Review auth.log and recent SSH logins to detect anomalies.',
    prompt: 'Show me the commands to analyze /var/log/auth.log for failed SSH attempts.',
    icon: <Server size={20} className="text-amber-400" />,
    bg: 'bg-amber-500/5 hover:bg-amber-500/10',
    border: 'border-amber-500/20',
  }
];

export default function WelcomeScreen({ onSelect, scrollContainer }) {
  const containerRef = useRef(null);
  const heroTextRef = useRef(null);
  const imageRef = useRef(null);
  const bentoRef = useRef(null);
  const textRevealRef = useRef(null);

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
        rotation: 5,
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

      // Text Reveal
      if (textRevealRef.current) {
        const words = textRevealRef.current.querySelectorAll('.word');
        gsap.fromTo(words, 
          { opacity: 0.1, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.05,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: textRevealRef.current,
              scroller: scrollContainer?.current || window,
              start: 'top 85%',
            }
          }
        );
      }

      // Marquee continuous
      gsap.to('.marquee-track', {
        xPercent: -50,
        repeat: -1,
        duration: 20,
        ease: 'linear'
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-full min-h-full pb-48 pt-10 px-4 md:px-12 flex flex-col items-center">
      
      {/* ── Attention (Hero) ────────────────────────────────────────── */}
      <section className="w-full max-w-7xl min-h-[75vh] flex flex-col justify-center relative mb-32">
        <div ref={heroTextRef} className="relative z-10 w-full max-w-6xl">
          <p className="text-indigo-400 font-semibold tracking-widest uppercase mb-6 text-sm">
            AI-Powered Infrastructure
          </p>
          <h1 className="text-[clamp(3rem,6vw,6rem)] font-black leading-[1.05] tracking-tight text-white mix-blend-difference">
            Server Intelligence 
            <span 
              className="inline-block w-24 h-12 md:w-36 md:h-16 rounded-full align-middle bg-cover bg-center mx-3 md:mx-5 grayscale contrast-125 opacity-90 border border-white/10" 
              style={{backgroundImage: 'url(https://picsum.photos/seed/server/400/200)'}}
            />
            Reimagined.
          </h1>
          <p className="mt-8 text-xl text-zinc-400 max-w-2xl font-light leading-relaxed">
            Stop digging through terminal windows. Ask questions, run diagnostics, and parse logs instantly with an agent that understands your infrastructure.
          </p>
        </div>

        {/* Artistic Asymmetry Floating Image */}
        <div 
          ref={imageRef}
          className="absolute right-0 bottom-[-10%] md:bottom-10 w-64 h-80 md:w-[400px] md:h-[500px] rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-white/10 z-0"
        >
          <div className="absolute inset-0 bg-indigo-500/20 mix-blend-overlay z-10" />
          <img 
            src="https://picsum.photos/seed/datacenter/800/1000" 
            alt="Datacenter" 
            className="w-full h-full object-cover grayscale mix-blend-luminosity opacity-80 scale-105"
          />
        </div>
      </section>

      {/* ── Interest (Gapless Bento Grid) ───────────────────────────── */}
      <section ref={bentoRef} className="w-full max-w-5xl mb-48 z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 grid-flow-dense gap-4 md:gap-6 auto-rows-[160px]">
          {STARTER_CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => onSelect(card.prompt)}
              className={`bento-card group relative overflow-hidden rounded-3xl border backdrop-blur-sm p-6 md:p-8 text-left transition-all duration-700 ease-out hover:shadow-2xl flex flex-col justify-between ${card.col} ${card.row} ${card.bg} ${card.border}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative z-10">
                <div className="mb-4 transform group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-500 ease-out origin-left">
                  {card.icon}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">
                  {card.title}
                </h3>
              </div>
              
              <p className="relative z-10 text-sm text-zinc-400 font-medium">
                {card.desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Desire (Scrubbing Text & Marquee) ───────────────────────── */}
      <section className="w-full max-w-7xl mb-48 flex flex-col items-center text-center">
        <div ref={textRevealRef} className="max-w-4xl text-[clamp(2rem,4vw,4rem)] font-bold leading-tight mb-32 text-zinc-100">
          {"Connect your servers. Stream real-time logs. Let the AI agent do the heavy lifting of parsing, diagnosing, and summarizing system health.".split(' ').map((word, i) => (
            <span key={i} className="word inline-block mr-3 md:mr-4">{word}</span>
          ))}
        </div>

        {/* Infinite Marquee */}
        <div className="w-full overflow-hidden flex border-y border-white/5 py-8 bg-white/[0.02]">
          <div className="marquee-track flex whitespace-nowrap items-center gap-16 md:gap-32 pr-16 md:pr-32">
            {/* Double the list to make it infinite */}
            {[...Array(2)].map((_, idx) => (
              <React.Fragment key={idx}>
                <span className="flex items-center gap-4 text-2xl font-bold text-zinc-600 uppercase tracking-widest"><Cpu size={32} /> Systemd</span>
                <span className="flex items-center gap-4 text-2xl font-bold text-zinc-600 uppercase tracking-widest"><Database size={32} /> Postgres</span>
                <span className="flex items-center gap-4 text-2xl font-bold text-zinc-600 uppercase tracking-widest"><Server size={32} /> Nginx</span>
                <span className="flex items-center gap-4 text-2xl font-bold text-zinc-600 uppercase tracking-widest"><HardDrive size={32} /> Docker</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Action CTA spacer (Chat Input will sit fixed at bottom) */}
      <div className="h-32 w-full flex items-end justify-center opacity-50">
        <p className="text-sm font-medium tracking-widest uppercase text-zinc-500">Ask your first question below</p>
      </div>

    </div>
  );
}
