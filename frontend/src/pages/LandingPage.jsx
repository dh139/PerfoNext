import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, ArrowRight, Shield, Award, Users, TrendingUp, Cpu, 
  BrainCircuit, CheckCircle2, Star, Sparkles, ChevronRight, BarChart3, 
  Zap, Lock, Globe, FileSpreadsheet, Layers, Briefcase, Key, Compass, MessageSquare
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeRoleTab, setActiveRoleTab] = useState('employee');
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Handle scroll detection for dynamic floating navbar morph
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ensure all sections reveal smoothly and reliably on load, scroll, or hash jump
  useEffect(() => {
    const revealElements = () => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => {
        el.classList.add('opacity-100', 'translate-y-0');
        el.classList.remove('opacity-0', 'translate-y-12');
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-12');
            if (entry.target.id) {
              setActiveSection(entry.target.id);
            }
          }
        });
      },
      { threshold: 0.05 }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    // Fallback timer to guarantee no hidden sections
    const timer = setTimeout(revealElements, 150);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const handleNavJump = (e, targetId) => {
    e.preventDefault();
    setMobileNavOpen(false);
    
    // Instantly reveal all sections so jump target is 100% visible
    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
      el.classList.add('opacity-100', 'translate-y-0');
      el.classList.remove('opacity-0', 'translate-y-12');
    });

    const elem = document.getElementById(targetId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(targetId);
    }
  };

  const roleDetails = {
    employee: {
      title: 'Employee Self-Empowerment',
      subtitle: 'Track goals, record LMS certifications, log skill proficiencies, and submit self-evaluations with transparency.',
      badges: ['Self-Assessment Portal', 'Skill Matrix Tracker', 'Certifications Repository', 'Performance History'],
      color: 'sky',
      stats: '4.8/5 Avg Employee Satisfaction Score'
    },
    manager: {
      title: 'Reporting Manager Command',
      subtitle: 'Conduct fair 360-degree reviews, track team KPIs, manage PIPs, and request peer feedback effortlessly.',
      badges: ['Team KPI Evaluation', 'PIP Governance', '360 Feedback Requests', 'Direct Team Reports'],
      color: 'amber',
      stats: '65% Reduction in Review Cycle Time'
    },
    hr: {
      title: 'HR Operations & Policy Governance',
      subtitle: 'Design custom KPI templates, launch company-wide review cycles, track completion rates, and manage promotions.',
      badges: ['KPI Template Builder', 'Review Cycle Automation', 'Completion Analytics', 'Promotion Workflows'],
      color: 'emerald',
      stats: '99.8% On-Time Review Completion Rate'
    },
    admin: {
      title: 'System Administration & Security',
      subtitle: 'Manage organizational structures, user roles, security access controls, and audit logs with enterprise security.',
      badges: ['User Access Database', 'Org Hierarchy Builder', 'Audit Trail Monitoring', 'Role-Based Access Control'],
      color: 'rose',
      stats: '100% Immutable Audit Trail Compliance'
    },
    executive: {
      title: 'CEO & Executive Intelligence',
      subtitle: 'Gain high-level strategic oversight into department performance distributions, AI workforce insights, and ecosystem analytics.',
      badges: ['Executive Dashboards', 'Department Metric Heatmaps', 'Llama-3.3 AI Insights', 'Ecosystem Integration Hub'],
      color: 'indigo',
      stats: 'Real-Time Strategic Organizational Visibility'
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white relative overflow-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sky-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Floating Rounded Animated Navigation Bar */}
      <header 
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] sm:w-[92%] max-w-5xl rounded-3xl md:rounded-full px-4 sm:px-6 transition-all duration-500 transform ${
          scrolled
            ? 'py-2 bg-slate-950/90 backdrop-blur-2xl border border-sky-500/40 shadow-[0_10px_35px_rgba(2,132,199,0.25)] scale-[0.98]'
            : 'py-3.5 bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 shadow-[0_15px_35px_rgba(0,0,0,0.4)]'
        }`}
      >
        <div className="flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-full text-white shadow-lg shadow-sky-500/25 group-hover:rotate-12 transition-transform duration-300">
              <Activity size={18} />
            </div>
            <div>
              <span className="font-black text-sm text-slate-100 tracking-tight group-hover:text-sky-400 transition-colors">EPTS</span>
              <span className="text-[9px] text-sky-400 font-semibold uppercase tracking-wider block -mt-0.5">Platform</span>
            </div>
          </div>

          {/* Animated Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/70 border border-slate-800 p-1 rounded-full text-xs font-bold text-slate-300 shadow-inner">
            <a 
              href="#features" 
              onClick={(e) => handleNavJump(e, 'features')}
              className={`px-4 py-1.5 rounded-full transition-all duration-300 ${
                activeSection === 'features' 
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30' 
                  : 'hover:bg-slate-800/90 hover:text-sky-400'
              }`}
            >
              Features
            </a>
            <a 
              href="#roles" 
              onClick={(e) => handleNavJump(e, 'roles')}
              className={`px-4 py-1.5 rounded-full transition-all duration-300 ${
                activeSection === 'roles' 
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30' 
                  : 'hover:bg-slate-800/90 hover:text-sky-400'
              }`}
            >
              System Roles
            </a>
            <a 
              href="#ai-analytics" 
              onClick={(e) => handleNavJump(e, 'ai-analytics')}
              className={`px-4 py-1.5 rounded-full transition-all duration-300 ${
                activeSection === 'ai-analytics' 
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30' 
                  : 'hover:bg-slate-800/90 hover:text-sky-400'
              }`}
            >
              AI Intelligence
            </a>
            <a 
              href="#ecosystem" 
              onClick={(e) => handleNavJump(e, 'ecosystem')}
              className={`px-4 py-1.5 rounded-full transition-all duration-300 ${
                activeSection === 'ecosystem' 
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30' 
                  : 'hover:bg-slate-800/90 hover:text-sky-400'
              }`}
            >
              Ecosystem Hub
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                to="/dashboard"
                className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold px-4 py-2 rounded-full text-xs shadow-lg shadow-sky-600/20 transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <span>Dashboard</span>
                <ArrowRight size={13} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-block text-slate-300 hover:text-white font-semibold text-xs px-3.5 py-1.5 rounded-full hover:bg-slate-800 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3.5 sm:px-4 py-2 rounded-full text-xs shadow-lg shadow-sky-600/25 transition-all flex items-center gap-1 hover:scale-105 cursor-pointer"
                >
                  <span>Register</span>
                  <ChevronRight size={13} />
                </Link>
              </>
            )}

            {/* Animated Mobile Hamburger Button */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle Mobile Navigation"
              className="md:hidden p-2 rounded-full hover:bg-slate-800/80 transition-colors cursor-pointer flex flex-col justify-center items-center gap-1.5 w-9 h-9 border border-slate-700/60"
            >
              <span
                className={`w-4 h-0.5 bg-slate-200 rounded-full transition-all duration-300 transform origin-center ${
                  mobileNavOpen ? 'rotate-45 translate-y-1.5 bg-sky-400' : ''
                }`}
              />
              <span
                className={`w-4 h-0.5 bg-slate-200 rounded-full transition-all duration-300 ${
                  mobileNavOpen ? 'opacity-0 scale-0' : ''
                }`}
              />
              <span
                className={`w-4 h-0.5 bg-slate-200 rounded-full transition-all duration-300 transform origin-center ${
                  mobileNavOpen ? '-rotate-45 -translate-y-1.5 bg-sky-400' : ''
                }`}
              />
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-800/80 flex flex-col gap-2 pb-2 text-xs font-bold animate-fadeIn">
            <a href="#features" onClick={(e) => handleNavJump(e, 'features')} className="px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-sky-400">Features</a>
            <a href="#roles" onClick={(e) => handleNavJump(e, 'roles')} className="px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-sky-400">System Roles</a>
            <a href="#ai-analytics" onClick={(e) => handleNavJump(e, 'ai-analytics')} className="px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-sky-400">AI Intelligence</a>
            <a href="#ecosystem" onClick={(e) => handleNavJump(e, 'ecosystem')} className="px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-sky-400">Ecosystem Hub</a>
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <Link to="/login" onClick={() => setMobileNavOpen(false)} className="flex-1 text-center py-2 bg-slate-800 text-slate-200 rounded-xl">Sign In</Link>
              <Link to="/register" onClick={() => setMobileNavOpen(false)} className="flex-1 text-center py-2 bg-sky-600 text-white rounded-xl">Register Account</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 px-4 sm:px-6 max-w-7xl mx-auto text-center reveal-on-scroll opacity-100 translate-y-0 transition-all duration-700">
        <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-slate-900/90 border border-sky-500/30 text-sky-400 text-[11px] sm:text-xs font-semibold mb-6 shadow-inner">
          <Sparkles size={14} className="animate-pulse text-sky-400" />
          <span>Enterprise Performance & Governance Suite 2.0</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-100 tracking-tight leading-[1.15] max-w-4xl mx-auto mb-6">
          Empower Employee Growth. <br />
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            Accelerate Organization Performance.
          </span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          EPTS connects multi-role performance reviews, 360-degree feedback, Llama-3.3 AI predictive insights, KPI frameworks, and HRMS/LMS ecosystem integrations in one unified platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to="/register"
            className="w-full sm:w-auto bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold px-8 py-4 rounded-full text-sm shadow-xl shadow-sky-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-105"
          >
            <span>Start Free Registration</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold px-8 py-4 rounded-full text-sm transition-all flex items-center justify-center gap-2 hover:scale-105"
          >
            <Key size={16} className="text-sky-400" />
            <span>Sign In to Portal</span>
          </Link>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-4 border-t border-slate-800/60">
          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl text-center hover:border-sky-500/40 transition-all">
            <p className="text-2xl font-black text-sky-400">99.8%</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">Review Completion</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl text-center hover:border-indigo-500/40 transition-all">
            <p className="text-2xl font-black text-indigo-400">5 Roles</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">Role Architecture</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl text-center hover:border-emerald-500/40 transition-all">
            <p className="text-2xl font-black text-emerald-400">Llama 3.3</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">AI Insights Model</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl text-center hover:border-rose-500/40 transition-all">
            <p className="text-2xl font-black text-rose-400">Zero</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">Spreadsheet Overhead</p>
          </div>
        </div>
      </section>

      {/* Role Showcase Section */}
      <section id="roles" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60 scroll-mt-28 reveal-on-scroll opacity-100 translate-y-0 transition-all duration-700">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">Tailored Workspaces</h2>
          <p className="text-3xl font-black text-slate-100">Designed for Every Organization Stakeholder</p>
          <p className="text-slate-400 text-xs mt-2">Explore how EPTS empowers each of the 5 core system roles with specialized tools.</p>
        </div>

        {/* Role Tabs */}
        <div className="flex overflow-x-auto md:flex-wrap justify-start md:justify-center gap-2 mb-8 pb-2 text-center max-w-full">
          {[
            { id: 'employee', label: 'Employee' },
            { id: 'manager', label: 'Reporting Manager' },
            { id: 'hr', label: 'HR Manager' },
            { id: 'admin', label: 'Administrator' },
            { id: 'executive', label: 'CEO / Management' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveRoleTab(tab.id)}
              className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeRoleTab === tab.id
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 border border-sky-500 scale-105'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Role Content Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-4xl mx-auto shadow-2xl relative overflow-hidden transition-all">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-sky-950 border border-sky-800 text-sky-400 text-[10px] font-bold uppercase rounded-md">
                Role Focus: {activeRoleTab.toUpperCase()}
              </span>
              <h3 className="text-2xl font-black text-slate-100">{roleDetails[activeRoleTab].title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{roleDetails[activeRoleTab].subtitle}</p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {roleDetails[activeRoleTab].badges.map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-[11px] font-medium text-slate-200">
                    <CheckCircle2 size={14} className="text-sky-400 shrink-0" />
                    <span className="truncate">{badge}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-sky-400 font-bold">{roleDetails[activeRoleTab].stats}</span>
                <Link to="/register" className="text-xs text-slate-300 hover:text-white font-semibold flex items-center gap-1">
                  <span>Try this role</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            {/* Interactive Preview Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-inner hover:border-sky-500/30 transition-all">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">EPTS Workspace Live</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Overall Rating Score</p>
                    <p className="text-[10px] text-slate-400">June 2026 Appraisal</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-extrabold rounded-lg">
                    4.45 / 5.0 (Exceeds Expectations)
                  </span>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">Technical & Code Quality</span>
                    <span className="text-sky-400 font-bold">92%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full w-[92%] rounded-full animate-pulse"></div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-indigo-900/50 flex items-start gap-2.5 text-xs text-indigo-200">
                  <BrainCircuit size={16} className="text-indigo-400 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <p className="font-bold text-indigo-300">Llama-3.3 AI Recommendation</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Recommended for Senior Software Engineer promotion based on 3 consecutive quarters of high code velocity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid Section */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60 scroll-mt-28 reveal-on-scroll opacity-100 translate-y-0 transition-all duration-700">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">Platform Capabilities</h2>
          <p className="text-3xl font-black text-slate-100">Built for Enterprise Precision</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 p-6 rounded-2xl transition-all duration-300 space-y-3 group hover:-translate-y-1.5 shadow-xl">
            <div className="p-3 bg-sky-950 border border-sky-800/80 rounded-xl text-sky-400 w-fit group-hover:scale-110 transition-transform">
              <TrendingUp size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Weighted Aggregate Scoring</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Configurable scoring formulas combining self-assessments (20%), manager evaluations (80%), and KPI item weights for unbiased score calculations.
            </p>
          </div>

          {/* Feature 2 */}
          <div id="ai-analytics" className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl transition-all duration-300 space-y-3 group hover:-translate-y-1.5 shadow-xl scroll-mt-28">
            <div className="p-3 bg-indigo-950 border border-indigo-800/80 rounded-xl text-indigo-400 w-fit group-hover:scale-110 transition-transform">
              <BrainCircuit size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Llama-3.3 AI Insights</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Automated narrative performance syntheses, risk factors, strengths analysis, and training recommendations powered by Groq LLM API.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl transition-all duration-300 space-y-3 group hover:-translate-y-1.5 shadow-xl">
            <div className="p-3 bg-emerald-950 border border-emerald-800/80 rounded-xl text-emerald-400 w-fit group-hover:scale-110 transition-transform">
              <Layers size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Skill Matrix & LMS Sync</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Track technical and soft skill proficiencies (1 to 5 scale), record LMS training progress, and store verifiable certificate uploads.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl transition-all duration-300 space-y-3 group hover:-translate-y-1.5 shadow-xl">
            <div className="p-3 bg-amber-950 border border-amber-800/80 rounded-xl text-amber-400 w-fit group-hover:scale-110 transition-transform">
              <Shield size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-100">PIP & Promotion Governance</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Formal Performance Improvement Plans (PIP) with milestone tracking alongside structured multi-level promotion nomination workflows.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 p-6 rounded-2xl transition-all duration-300 space-y-3 group hover:-translate-y-1.5 shadow-xl">
            <div className="p-3 bg-rose-950 border border-rose-800/80 rounded-xl text-rose-400 w-fit group-hover:scale-110 transition-transform">
              <MessageSquare size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-100">360-Degree Peer Feedback</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Request anonymous or peer feedback from colleagues to complement manager reviews with holistic workplace perspectives.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl transition-all duration-300 space-y-3 group hover:-translate-y-1.5 shadow-xl">
            <div className="p-3 bg-cyan-950 border border-cyan-800/80 rounded-xl text-cyan-400 w-fit group-hover:scale-110 transition-transform">
              <Cpu size={22} />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Ecosystem Hub</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Seamless REST API integrations with HRMS attendance portals, MS Teams Adaptive Card webhooks, and enterprise LMS training platforms.
            </p>
          </div>
        </div>
      </section>

      {/* Ecosystem Integrations Showcase */}
      <section id="ecosystem" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-800/60 text-center scroll-mt-28 reveal-on-scroll opacity-100 translate-y-0 transition-all duration-700">
        <h2 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">Interoperable Architecture</h2>
        <p className="text-3xl font-black text-slate-100 mb-8">Integrated with Your HR Ecosystem</p>

        <div className="flex flex-wrap justify-center items-center gap-6 opacity-85">
          <div className="px-6 py-3 bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-full font-extrabold text-sm text-slate-300 flex items-center gap-2 hover:scale-105 transition-all">
            <Globe size={18} className="text-sky-400" /> HRMS Attendance API
          </div>
          <div className="px-6 py-3 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-full font-extrabold text-sm text-slate-300 flex items-center gap-2 hover:scale-105 transition-all">
            <Cpu size={18} className="text-indigo-400" /> MS Teams Webhooks
          </div>
          <div className="px-6 py-3 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-full font-extrabold text-sm text-slate-300 flex items-center gap-2 hover:scale-105 transition-all">
            <Layers size={18} className="text-emerald-400" /> LMS Training Records
          </div>
          <div className="px-6 py-3 bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-full font-extrabold text-sm text-slate-300 flex items-center gap-2 hover:scale-105 transition-all">
            <Lock size={18} className="text-rose-400" /> JWT Audit Logger
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="py-16 px-6 max-w-5xl mx-auto my-12 reveal-on-scroll opacity-100 translate-y-0 transition-all duration-700">
        <div className="bg-gradient-to-r from-sky-900/60 via-slate-900 to-indigo-900/60 border border-sky-800/60 rounded-3xl p-10 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-sky-500/10 pointer-events-none">
            <Activity size={180} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-100">Ready to Elevate Your Performance System?</h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto">
            Experience role-based performance reviews, AI insights, and transparent rating governance today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <Link
              to="/register"
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider shadow-lg shadow-sky-600/30 transition-all hover:scale-105"
            >
              Create Account Now
            </Link>
            <Link
              to="/login"
              className="bg-slate-950 hover:bg-slate-900 border border-slate-700 text-slate-200 font-bold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider transition-all hover:scale-105"
            >
              Sign In to Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-600 rounded-full text-white">
              <Activity size={16} />
            </div>
            <span className="font-bold text-slate-300">EPTS Performance System</span>
          </div>
          <p className="text-[11px]">© 2026 EPTS Inc. All rights reserved. Enterprise Performance Tracking System.</p>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <Link to="/login" className="hover:text-slate-200 transition-colors">Portal Login</Link>
            <Link to="/register" className="hover:text-slate-200 transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
