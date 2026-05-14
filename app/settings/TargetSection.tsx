'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { addTarget, deleteTarget, toggleTarget } from './actions';
import type { Target } from '@/lib/db';

interface TargetSectionProps {
  type: 'twitter' | 'website';
  items: Target[];
  label: string;
  placeholder: string;
  hint: string;
}

type OptimisticAction =
  | { op: 'add'; item: Target }
  | { op: 'remove'; id: number }
  | { op: 'toggle'; id: number; active: boolean };

export function TargetSection({ type, items, label, placeholder, hint }: TargetSectionProps) {
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const [optimisticItems, dispatch] = useOptimistic(
    items,
    (state: Target[], action: OptimisticAction) => {
      if (action.op === 'add') return [...state, action.item];
      if (action.op === 'remove') return state.filter((i) => i.id !== action.id);
      if (action.op === 'toggle')
        return state.map((i) => (i.id === action.id ? { ...i, active: action.active } : i));
      return state;
    },
  );

  const handleAdd = () => {
    const value = input.trim();
    if (!value) return;
    const tempItem: Target = {
      id: -Date.now(),
      type,
      value,
      active: true,
      created_at: new Date().toISOString(),
    };
    startTransition(async () => {
      dispatch({ op: 'add', item: tempItem });
      setInput('');
      await addTarget(type, value);
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      dispatch({ op: 'remove', id });
      await deleteTarget(id);
    });
  };

  const handleToggle = (id: number, current: boolean) => {
    startTransition(async () => {
      dispatch({ op: 'toggle', id, active: !current });
      await toggleTarget(id, !current);
    });
  };

  return (
    <div
      className="card-matte noise relative rounded-2xl overflow-hidden"
      style={{ padding: '1.25rem 1.5rem' }}
    >
      {/* Section header */}
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {label}
        </h2>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <span
          className="text-[10px] font-semibold tabular-nums text-zinc-600 rounded px-1.5 py-0.5"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          {optimisticItems.length}
        </span>
      </div>

      {/* Target list */}
      <ul className="mb-4 space-y-1.5">
        {optimisticItems.length === 0 && (
          <li className="text-[11px] text-zinc-600 italic py-1">{hint}</li>
        )}
        {optimisticItems.map((item) => (
          <li
            key={item.id}
            className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              opacity: item.active ? 1 : 0.45,
            }}
          >
            <button
              onClick={() => item.id > 0 && handleToggle(item.id, item.active)}
              title={item.active ? 'Pause this target' : 'Resume this target'}
              className="flex items-center gap-2 min-w-0 text-left"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background: item.active ? '#34d399' : '#52525b',
                  boxShadow: item.active ? '0 0 6px rgba(52,211,153,0.5)' : 'none',
                }}
              />
              <span className="truncate text-[12px] text-zinc-300 font-mono">{item.value}</span>
            </button>
            <button
              onClick={() => item.id > 0 && handleDelete(item.id)}
              disabled={isPending || item.id < 0}
              aria-label={`Remove ${item.value}`}
              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 hover:bg-red-400/10 disabled:pointer-events-none"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>

      {/* Add input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="flex-1 rounded-lg px-3 py-2 text-[12px] font-mono text-zinc-300 placeholder-zinc-700 outline-none transition-colors focus:ring-1"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.25)',
            color: '#818cf8',
          }}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}
