
/*
 * compass COMPONENT: ONBOARDING TOUR
 * Commercial Quality Update
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, LayoutGrid, Clapperboard, Users, Wand2 } from 'lucide-react';

export const OnboardingTour: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('cinesketch_tour_complete');
    if (!hasSeen) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('cinesketch_tour_complete', 'true');
    setIsOpen(false);
  };

  const steps = [
    {
      title: "Welcome to CineSketch Studio",
      icon: <div className="text-4xl">🎬</div>,
      desc: "Your professional AI-powered storyboard artist. Let's take a quick tour of your new studio."
    },
    {
      title: "1. The Dashboard",
      icon: <LayoutGrid className="w-12 h-12 text-primary" />,
      desc: "This is your main view. See all your shots in a grid. Click any card to open the Studio Editor."
    },
    {
      title: "2. The Timeline",
      icon: <Clapperboard className="w-12 h-12 text-primary" />,
      desc: "Switch to Timeline view to organize your movie into Scenes. Add dialogue, action notes, and reorder shots."
    },
    {
      title: "3. Cast & Assets",
      icon: <Users className="w-12 h-12 text-primary" />,
      desc: "Define your characters and wardrobe here. Upload reference photos to keep your AI actors consistent."
    },
    {
      title: "4. The Studio Editor",
      icon: <Wand2 className="w-12 h-12 text-primary" />,
      desc: "Where the magic happens. Describe your shot, upload rough sketches, and click Render to generate Hollywood-grade visuals."
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] overlay-dark backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">

        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary p-1"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center flex flex-col items-center">
          <div className="mb-6 p-6 bg-surface-secondary rounded-full border border-border shadow-inner">
            {steps[step].icon}
          </div>

          <h2 id="tour-title" className="text-xl font-bold text-text-primary mb-3">{steps[step].title}</h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-8 min-h-[60px]">
            {steps[step].desc}
          </p>

          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>

          <button
            onClick={() => {
              if (step < steps.length - 1) setStep(step + 1);
              else handleComplete();
            }}
            className="w-full h-10 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-teal-900/20"
          >
            {step < steps.length - 1 ? (
              <>Next Step <ChevronRight className="w-4 h-4" /></>
            ) : (
              "Get Started"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
