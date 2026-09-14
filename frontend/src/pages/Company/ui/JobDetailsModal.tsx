import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  Briefcase,
  MapPin,
  Sparkles,
  Send,
  Users,
  Shield,
  Code,
  Palette,
  HeartHandshake,
} from 'lucide-react';
import { JobOpening, CareersTranslations } from '../data/careersData';

interface JobDetailsModalProps {
  job: JobOpening | null;
  onClose: () => void;
  t: CareersTranslations;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ job, onClose, t }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    portfolio: '',
    about: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  const getTagIcon = (tag: string) => {
    switch (tag.toLowerCase()) {
      case 'security':
        return <Shield className="w-3.5 h-3.5 text-red-400" />;
      case 'engineering':
        return <Code className="w-3.5 h-3.5 text-blue-400" />;
      case 'design':
      case 'creative':
        return <Palette className="w-3.5 h-3.5 text-pink-400" />;
      case 'community':
        return <Users className="w-3.5 h-3.5 text-green-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn select-text overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d0920] border border-purple-500/30 rounded-[32px] p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.9)] flex flex-col gap-6 text-left my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-neutral-300 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col gap-3 pr-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 text-purple-300 text-xs font-bold border border-purple-800/40">
              {getTagIcon(job.tag)}
              <span>{job.tag}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span>{job.location}</span>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{job.title}</h2>
          <span className="text-xs text-purple-300 font-semibold">{job.department}</span>
        </div>

        {isSubmitted ? (
          /* Application Success View */
          <div className="flex flex-col items-center text-center py-10 gap-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 shadow-[0_0_30px_rgba(74,222,128,0.3)]">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-black text-white">{t.applySuccessTitle}</h3>
            <p className="text-sm text-neutral-300 max-w-md leading-relaxed">
              {t.applySuccessDesc}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs"
            >
              {t.closeModal}
            </button>
          </div>
        ) : (
          /* Position Details & Application Form */
          <div className="flex flex-col gap-6">
            {/* Target Audience Section */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {t.targetAudienceLabel}
              </span>
              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-medium">
                {job.targetAudience}
              </p>
            </div>

            {/* Responsibilities */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                {t.tasksLabel}
              </span>
              <ul className="flex flex-col gap-2">
                {job.responsibilities.map((resp, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs sm:text-sm text-neutral-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                {t.requirementsLabel}
              </span>
              <ul className="flex flex-col gap-2">
                {job.requirements.map((req, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs sm:text-sm text-neutral-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What We Offer / Benefits (The 4 Pillars) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/60 to-indigo-950/40 border border-purple-800/40 flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                {t.benefitsLabel}
              </span>
              <ul className="flex flex-col gap-2.5">
                {job.benefits.map((benefit, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs sm:text-sm text-neutral-200 leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Application Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 rounded-2xl bg-purple-950/40 border border-purple-800/40 flex flex-col gap-4 mt-2"
            >
              <span className="font-bold text-sm text-white">{t.applyButton}</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    {t.applyFormName}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nikolaj / Ilya / Elena"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    {t.applyFormEmail}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="@telegram or you@email.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  {t.applyFormPortfolio}
                </label>
                <input
                  type="text"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                  placeholder="https://github.com/... or Behance / Figma"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  {t.applyFormAbout}
                </label>
                <textarea
                  rows={3}
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  placeholder="Tell us a little bit about your interest in Eternal..."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sending...' : t.applyFormSubmit}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
