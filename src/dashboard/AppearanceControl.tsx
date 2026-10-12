import { useEffect, useId, useState } from 'react';
import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function AppearanceControl() {
  const appearance = useUiStore((s) => s.appearance);
  const setAppearance = useUiStore((s) => s.setAppearance);
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  const controls = <section className="appearance-settings" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`}><Palette size={16} aria-hidden />Appearance</h2>
    <fieldset className="appearance-options">
      <legend className="sr-only">Appearance style</legend>
      {OPTIONS.map(({ value, label, icon: Icon }) => <label key={value} className={appearance === value ? 'is-selected' : ''}>
        <input type="radio" name={`${id}-appearance`} value={value} checked={appearance === value} onChange={() => setAppearance(value)} />
        <Icon size={18} aria-hidden /><span>{label}</span>
      </label>)}
    </fieldset>
    <p>{appearance === 'system' ? 'Follows your device appearance.' : 'Saved for your next visit.'}</p>
  </section>;

  return <div className="appearance-control">
    <button type="button" className="icon-link" aria-label="Appearance" aria-expanded={open} aria-controls={`${id}-popover`} onClick={() => setOpen((v) => !v)}><Palette size={18} /></button>
    {open && <><button type="button" className="appearance-dismiss" aria-label="Close appearance settings" onClick={() => setOpen(false)} /><div id={`${id}-popover`} className="appearance-popover">{controls}</div></>}
  </div>;
}
