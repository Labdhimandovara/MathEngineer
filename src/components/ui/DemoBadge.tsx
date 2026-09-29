import React from 'react';

export const DemoBadge: React.FC<{ label?: string }> = ({ label = 'Demo' }) => {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-wide uppercase bg-bg-neutral text-charcoal-muted border border-border-soft/60">
      {label}
    </span>
  );
};
