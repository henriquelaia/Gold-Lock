import { motion } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type ActionVariant = 'urgent' | 'lesson' | 'keep';

export interface ActionTag {
  label: string;
  kind: 'deadline' | 'law' | 'urgent';
}

export interface ActionCardProps {
  variant: ActionVariant;
  icon: LucideIcon;
  title: string;
  description: string;
  tags?: ActionTag[];
  amount?: number;
  primaryCta?: { label: string; onClick: () => void };
  secondaryCta?: { label: string; onClick: () => void };
  delay?: number;
}

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const VARIANT_ICON_BG: Record<ActionVariant, { bg: string; color: string }> = {
  urgent: { bg: 'rgba(201,162,39,0.10)', color: 'var(--gold)' },
  lesson: { bg: 'rgba(59,130,246,0.10)', color: '#2563eb' },
  keep:   { bg: 'rgba(34,197,94,0.10)',  color: '#15803d' },
};

const TAG_STYLES: Record<ActionTag['kind'], { bg: string; color: string }> = {
  deadline: { bg: '#fee2e2', color: '#b91c1c' },
  law:      { bg: 'rgba(0,0,0,0.05)', color: 'var(--ink-500)' },
  urgent:   { bg: '#fef3c7', color: '#b45309' },
};

export function ActionCard({
  variant,
  icon: Icon,
  title,
  description,
  tags = [],
  amount,
  primaryCta,
  secondaryCta,
  delay = 0,
}: ActionCardProps) {
  const iconStyles = VARIANT_ICON_BG[variant];

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl px-4 py-3.5 flex gap-3.5 mb-2"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconStyles.bg, color: iconStyles.color }}
      >
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {tags.map((tag, i) => (
              <Tag key={i} tag={tag} />
            ))}
          </div>
        )}

        <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--ink-900)' }}>
          {title}
        </h3>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-500)' }}>
          {description}
        </p>

        {(primaryCta || secondaryCta || amount !== undefined) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {primaryCta && (
              <CtaButton primary onClick={primaryCta.onClick}>
                {primaryCta.label}
                <ArrowRight size={11} />
              </CtaButton>
            )}
            {secondaryCta && (
              <CtaButton onClick={secondaryCta.onClick}>{secondaryCta.label}</CtaButton>
            )}
            {amount !== undefined && amount !== 0 && (
              <span
                className="ml-auto text-xl font-black tabular-nums leading-none"
                style={{ color: amount > 0 ? '#15803d' : '#dc2626' }}
              >
                {amount > 0 ? '+' : '−'}{eur(Math.abs(amount))}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}

function Tag({ tag }: { tag: ActionTag }) {
  const styles = TAG_STYLES[tag.kind];
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
      style={{ background: styles.bg, color: styles.color }}
    >
      {tag.kind === 'deadline' && <Clock size={9} />}
      {tag.label}
    </span>
  );
}

function CtaButton({
  children,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-opacity hover:opacity-85"
      style={
        primary
          ? { background: 'var(--ink-900)', color: 'white' }
          : { background: 'var(--surface)', color: 'var(--ink-900)', border: '1px solid var(--border)' }
      }
    >
      {children}
    </button>
  );
}
