import React from 'react';
import { Brain, Wrench, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

const STEP_META = {
  planning:    { icon: Brain,         color: '#8B5CF6', label: 'Thinking' },
  tool_call:   { icon: Wrench,        color: '#0EA5E9', label: 'Calling tool' },
  tool_result: { icon: CheckCircle2,  color: '#10B981', label: 'Tool result' },
  fallback:    { icon: AlertTriangle, color: '#F59E0B', label: 'Fallback' },
  error:       { icon: AlertTriangle, color: '#EF4444', label: 'Error' },
  final:       { icon: CheckCircle2,  color: '#10B981', label: 'Final answer' },
};

export default function ThinkingTrace({ trace }) {
  if (!trace || trace.length === 0) return null;
  return (
    <div style={{ marginTop: '10px', padding: '10px 12px', background: '#F8FAFC',
      border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}>
      <div style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px',
        textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>
        Agent Reasoning Trace
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {trace.map((step, i) => {
          const meta = STEP_META[step.step] || { icon: ArrowRight, color: '#64748B', label: step.step };
          const Icon = meta.icon;
          return (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <Icon size={13} color={meta.color} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 600, color: meta.color }}>{meta.label}</span>
                {step.tool && <span style={{ color: 'var(--text-dark)' }}> — {step.tool}</span>}
                {step.args && <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>{JSON.stringify(step.args)}</div>}
                {step.result && <div style={{ color: 'var(--text-muted)' }}>{String(step.result).slice(0, 160)}</div>}
                {step.text && <div style={{ color: 'var(--text-muted)' }}>{step.text}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}