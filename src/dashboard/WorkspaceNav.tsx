import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowUpRight, BookOpen, ClipboardCheck, LayoutGrid, ListChecks, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link to="/" className="workspace-brand" aria-label="Z-ESS home"><span className="brand-mark">z<span>·</span></span>{!compact && <span><strong>Z-ESS<span className="brand-period">.</span></strong><small>Immunisation intelligence</small></span>}</Link>;
}

export function WorkspaceNav({ children, onClose, compact = false }: { children?: ReactNode; onClose?: () => void; compact?: boolean }) {
  return <>
    <div className="workspace-brand-row"><Brand compact={compact} />{onClose && <button type="button" onClick={onClose} className="mobile-nav-close" aria-label="Close navigation"><X size={20} /></button>}</div>
    {!compact && <p className="nav-section-label">WORKSPACE</p>}
    <nav aria-label="Main navigation" className="workspace-navigation">
      {[
        { to: '/', label: 'Overview', icon: LayoutGrid },
        { to: '/line-list', label: 'Line list', icon: ListChecks },
        { to: '/supervisory', label: 'Supervisory', icon: ClipboardCheck },
      ].map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} title={compact ? label : undefined} onClick={onClose} className={({ isActive }) => cn('workspace-nav-link', isActive && 'is-active', compact && 'compact')}><Icon size={18} />{!compact && <><span>{label}</span><span className="nav-active-dot" /></>}</NavLink>)}
    </nav>
    {children}
    {!compact && <div className="workspace-nav-bottom">
      <div className="mission-note"><span className="mission-icon"><ShieldCheck size={19} /></span><p>Every child counts.<small>A clearer path from identification to immunisation.</small></p></div>
      <Link to="/#definitions" className="workspace-guide" onClick={onClose}><BookOpen size={16} /><span>Programme guide</span><ArrowUpRight size={14} /></Link>
      <div className="workspace-partner"><span className="partner-symbol">s</span><span>Powered by <strong>Synterra</strong><small>Public health. Connected.</small></span></div>
    </div>}
  </>;
}
