import { useEffect, useRef } from 'react';
import { AudioLines, Info, X } from 'lucide-react';
export const suggestions = [
  { text: 'Zoom to Ahmedabad', hint: 'GO SOMEWHERE', icon: 'navigation' },
  { text: 'Find cafes near Marine Drive', hint: 'DISCOVER NEARBY', icon: 'coffee' },
  { text: 'Add marker at Gateway of India', hint: 'SAVE A PLACE', icon: 'pin' },
  { text: 'Find parks near Powai', hint: 'FIND SOME GREEN', icon: 'leaf' },
  { text: 'Plan route from Gateway of India to Marine Drive', hint: 'PLAN A JOURNEY', icon: 'route' },
];
export function HelpDialog({ open, onClose, onExample }: { open: boolean; onClose(): void; onExample(command: string): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); if (!open && dialog.current?.open) dialog.current.close(); }, [open]);
  return <dialog ref={dialog} className="help-dialog" onClose={onClose} aria-labelledby="help-title">
    <div className="dialog-heading"><span className="brand-icon"><AudioLines size={24} /></span><button aria-label="Close help" className="icon-button" onClick={() => dialog.current?.close()}><X size={20} /></button></div>
    <span className="eyebrow">A QUICK FIELD GUIDE</span><h2 id="help-title">A few words. A world to explore.</h2><p>Type a command and press Enter. Or tap the microphone and speak; the final transcript runs automatically. Press <kbd>/</kbd> to focus the command box.</p>
    <div className="help-examples">{['Zoom in', 'Go to Pune', 'Find Mumbai', ...suggestions.map(s => s.text), 'Find parks within 3 km of Powai', 'Show topographic map', 'Remove marker', 'Clear markers', 'Clear route', 'Reset map'].map(command => <button key={command} onClick={() => { onExample(command); dialog.current?.close(); }}>{command}<span>↗</span></button>)}</div>
    <div className="help-note"><Info size={17} /><p>Voice depends on your browser and may send audio to its recognition service. Geographic searches use public online services. Routes support driving; carbon comparisons are estimates. Avoid entering personal or confidential locations.</p></div>
    <p className="historical-note">An independent MVP reviving a 2024 ISRO hackathon concept by <strong>Astro Hack Squad</strong>.</p>
  </dialog>;
}
