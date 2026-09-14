import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrivacyNavbar } from '../Privacy/ui/PrivacyNavbar';
import { EternalFooter } from '../../shared/ui/EternalFooter';
import { SEOHead } from '../../shared/seo';
import { CAREERS_JOBS, CAREERS_TRANSLATIONS, JobOpening } from './data/careersData';
import { useLanguageStore } from '../../shared/lib/language/languageStore';
import { useAuthStore } from '../../shared/model/useAuthStore';
import { DropdownSafetyMascot, DropdownDeveloperMascot } from '../Privacy/ui/PrivacyIllustrations';
import { EternalCrown3D, EternalSprout3D } from './ui/CompanyIllustrations';
import { CareersGallery } from './ui/CareersGallery';
import { JobDetailsModal } from './ui/JobDetailsModal';
import {
  Sparkles,
  ChevronDown,
  ArrowRight,
  Shield,
  Code,
  Palette,
  Users,
  MessageSquare,
  Heart,
  Music,
  CheckCircle2,
} from 'lucide-react';

import { ExperienceSection, FunPartySection, FAQSection } from './ui/CareersExtraSections';

export const CareersPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { currentLanguage } = useLanguageStore();
  const t = CAREERS_TRANSLATIONS[currentLanguage] || CAREERS_TRANSLATIONS.English;

  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [scrollParallax, setScrollParallax] = useState(0);

  // Parallax Scroll Tracking
  useEffect(() => {
    const handleScroll = () => {
      setScrollParallax(Math.min(window.scrollY * 0.08, 45));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToJobs = () => {
    const el = document.getElementById('all-jobs');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const departments = t.departments || [
    { id: 'all', label: t.allDepartments },
    { id: 'Security & Infrastructure', label: 'Security & Infrastructure' },
    { id: 'Quality Assurance & Testing', label: 'Quality Assurance & Testing' },
    { id: 'Design & Creative', label: 'Design & Creative' },
    { id: 'Community & Product', label: 'Community & Product' },
  ];

  const currentJobs = t.jobs || CAREERS_JOBS;

  const filteredJobs =
    selectedDepartment === 'all'
      ? currentJobs
      : currentJobs.filter(
          (job) =>
            job.department.toLowerCase() === selectedDepartment.toLowerCase() ||
            job.id.toLowerCase().includes(selectedDepartment.toLowerCase()),
        );

  return (
    <div className="min-h-screen bg-[#07050f] text-white font-sans antialiased selection:bg-purple-600 selection:text-white flex flex-col justify-between overflow-x-hidden">
      <SEOHead
        title={t.heroTitle || 'Careers at Eternal'}
        description={t.heroSubtitle}
        canonical="/careers"
        structuredData={{
          type: 'Organization',
          breadcrumbs: [{ name: 'Careers', url: '/careers' }],
        }}
      />
      {/* Top Navbar */}
      <PrivacyNavbar />

      {/* 1. Hero Section (Deep Indigo/Purple Discord Style) */}
      <section className="relative pt-36 pb-16 px-6 lg:px-12 bg-gradient-to-b from-[#381a80] via-[#240e5c] to-[#07050f] overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/25 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          {/* Floating Mascots: Left (Crown), Right (Sprout/Turnip) with Scroll Parallax (Visible on wide screens) */}
          <div
            className="hidden xl:block absolute -left-10 2xl:left-2 top-10 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollParallax}px) rotate(-8deg)` }}
          >
            <EternalCrown3D className="w-36 h-36 lg:w-44 lg:h-44" />
          </div>

          <div
            className="hidden xl:block absolute -right-10 2xl:right-2 top-8 select-none pointer-events-none transition-transform duration-100 ease-out"
            style={{ transform: `translateY(${scrollParallax}px) rotate(10deg)` }}
          >
            <EternalSprout3D className="w-36 h-36 lg:w-44 lg:h-44" />
          </div>

          {/* Large Hero Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white tracking-tight uppercase mb-6 drop-shadow-2xl">
            {t.heroTitle}
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-neutral-200/90 max-w-3xl leading-relaxed mb-10 font-medium">
            {t.heroSubtitle}
          </p>

          {/* Center Call-to-Action Pill: "See All Jobs" */}
          <button
            type="button"
            onClick={scrollToJobs}
            className="px-8 py-3.5 rounded-full bg-[#5822b4] hover:bg-[#6b2bd8] text-white text-sm font-bold tracking-wide shadow-[0_0_30px_rgba(88,34,180,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{t.seeAllJobs}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* 2. Interactive Auto-Sliding Platform Showcase Carousel */}
      <section className="py-12 px-6 relative z-20">
        <CareersGallery />
      </section>

      {/* 3. Culture & Mission Section ("BE A PART OF THE FUTURE OF SOCIAL MEDIAS") */}
      <section className="py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full relative z-10 flex flex-col gap-24">
        {/* Section Header with Byte-Bot Mascot */}
        <div className="relative text-center max-w-4xl mx-auto">
          <div className="hidden lg:block absolute -top-12 -right-16 pointer-events-none select-none">
            <DropdownDeveloperMascot className="w-32 h-32" />
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-6 leading-tight">
            {t.futureHeading}
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-medium">
            {t.futureSubtitle}
          </p>
        </div>

        {/* Feature Block 1: Left Visual, Right Text */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 rounded-[36px] bg-gradient-to-br from-[#1c1538] to-[#0d0920] border border-purple-500/30 p-8 shadow-2xl overflow-hidden relative group">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-md">
                  E
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">Global Social Synchrony</h4>
                  <span className="text-xs text-purple-300 font-mono">Kyiv & Remote Team</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/30 text-xs text-neutral-200 leading-relaxed">
                "Building with passionate contributors who truly love social media and want to push
                the boundaries of real-time communication."
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col gap-4 text-left">
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-tight">
              {t.feature1Title}
            </h3>
            <p className="text-base text-neutral-300 leading-relaxed font-medium">
              {t.feature1Desc}
            </p>
          </div>
        </div>

        {/* Feature Block 2: Left Text, Right Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 flex flex-col gap-4 text-left order-2 lg:order-1">
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-tight">
              {t.feature2Title}
            </h3>
            <p className="text-base text-neutral-300 leading-relaxed font-medium">
              {t.feature2Desc}
            </p>
          </div>

          <div className="lg:col-span-6 rounded-[36px] bg-gradient-to-br from-[#1c1538] to-[#0d0920] border border-purple-500/30 p-8 shadow-2xl overflow-hidden relative order-1 lg:order-2">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Open Feedback & Ideas
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-neutral-200">
                  <strong className="text-white block mb-0.5">Community-Driven Roadmap</strong>
                  Every feature, audio room format, and reaction starts with contributor ideas.
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-neutral-200">
                  <strong className="text-white block mb-0.5">Transparent Development</strong>
                  Open codebase discussions and peer code reviews for all team members.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Open Job Openings Section (#all-jobs) (1:1 Discord Style) */}
      <section id="all-jobs" className="py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full relative z-10">
        <div className="relative text-center mb-14">
          {/* Mascot on Left */}
          <div className="hidden lg:block absolute -top-8 -left-12 pointer-events-none select-none">
            <DropdownSafetyMascot className="w-32 h-32" />
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-4 leading-tight max-w-4xl mx-auto">
            {t.allJobsHeading}
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed font-medium">
            {t.allJobsSubtitle}
          </p>

          {/* Department Filter Dropdown */}
          <div className="mt-8 flex justify-center">
            <div className="relative inline-block">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="appearance-none px-6 py-3 pr-10 rounded-2xl bg-[#17132e] border border-purple-500/40 text-white font-bold text-xs shadow-lg focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id} className="bg-[#120f24] text-white">
                    {dept.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-purple-300 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Job Cards Grid (2-column layout matching Discord 1:1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-text">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="p-7 sm:p-8 rounded-[28px] bg-[#120f24] hover:bg-[#5822b4] border border-white/[0.08] hover:border-purple-400/40 shadow-xl hover:shadow-[0_20px_50px_rgba(88,34,180,0.4)] transition-all duration-200 cursor-pointer group flex flex-col justify-between gap-6 text-left"
            >
              {/* Department Tag */}
              <div className="flex items-center justify-between">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-white/[0.08] text-purple-200 border border-white/10 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30 transition-colors">
                  {job.department}
                </span>

                <span className="text-[11px] font-mono text-neutral-400 group-hover:text-purple-200">
                  {job.type}
                </span>
              </div>

              {/* Title & Location */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-white leading-snug">
                  {job.title}
                </h3>
                <span className="text-xs text-neutral-400 group-hover:text-purple-200 font-medium">
                  {job.location}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Experience Life at Eternal (Why Join the Early Team - 6 Cards Grid) */}
      <ExperienceSection
        heading={t.experienceHeading}
        subtitle={t.experienceSubtitle}
        perks={t.perks}
      />

      {/* 6. When It’s Time for Fun, Find Your Party Here (Clubs Carousel) */}
      <FunPartySection heading={t.funHeading} subtitle={t.funSubtitle} clubs={t.funClubs} />

      {/* 7. FAQ Section (Expandable Accordion) */}
      <FAQSection
        heading={t.faqHeading}
        subtitle={t.faqSubtitle}
        items={t.faqItems}
        seeAllText={t.faqSeeAll}
      />

      {/* Job Details Application Modal */}
      <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} t={t} />

      {/* Universal Footer */}
      <EternalFooter />
    </div>
  );
};

export default CareersPage;
