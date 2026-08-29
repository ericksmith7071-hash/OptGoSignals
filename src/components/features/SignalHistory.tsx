import { useState, useEffect } from 'react';
import type { Signal } from '@/types';
import { TrendingUp, TrendingDown, Clock, Zap, Shield, TimerOff } from 'lucide-react';

interface SignalHistoryProps {
  signals: Signal[];
  onReplay: (signal: Signal) => void;
}

function isSignalExpired(signal: Signal) {
  return Date.now() > signal.expiry_timestamp;
}

export default function SignalHistory({ signals, onReplay }: SignalHistoryProps) {
  const [, setTick] = useState(0);

  // Re-render every second to update expiry states
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (signals.length === 0) return null;

  return (
    <div className="terminal-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Histórico de Sinais</span>
        </div>
        <span className="text-xs text-muted-foreground">{signals.length} sinais</span>
      </div>
      <div className="divide-y divide-border/50 max-h-64 overflow-y-auto scrollbar-thin">
        {signals.map(s => {
          const isScalping = s.analysis_mode === 'scalping';
          const expired = isSignalExpired(s);
          const remaining = Math.max(0, Math.ceil((s.expiry_timestamp - Date.now()) / 1000));

          return (
            <button
              key={s.id}
              onClick={() => onReplay(s)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors text-left"
            >
              <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                expired ? 'bg-gray-500/15' : s.direction === 'CALL' ? 'bg-green-500/15' : 'bg-red-500/15'
              }`}>
                {expired
                  ? <TimerOff className="w-3.5 h-3.5 text-gray-400" />
                  : s.direction === 'CALL'
                    ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold truncate ${expired ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {s.asset_name}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{s.timeframe}</span>
                  <span>·</span>
                  <span className="font-mono">{s.entry_time}</span>
                  {isScalping
                    ? <span className="text-yellow-400/70"><Zap className="w-2.5 h-2.5 inline" /></span>
                    : <span className="text-primary/70"><Shield className="w-2.5 h-2.5 inline" /></span>}
                  {expired && <span className="text-gray-500">· expirado</span>}
                  {!expired && remaining <= 30 && (
                    <span className="text-red-400 font-mono">{remaining}s</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className={`text-xs font-bold ${expired ? 'text-gray-500' : s.direction === 'CALL' ? 'text-green-400' : 'text-red-400'}`}>
                  {s.direction}
                </span>
                <span className={`text-[10px] font-mono ${expired ? 'text-gray-600' : s.confidence >= 80 ? 'text-green-400' : s.confidence >= 65 ? 'text-yellow-400' : 'text-orange-400'}`}>
                  {s.confidence}%
                </span>
                <span className={`text-[9px] ${
                  expired ? 'text-gray-600' :
                  s.quality.overall_quality === 'ALTA' ? 'text-green-400/60' :
                  s.quality.overall_quality === 'MÉDIA' ? 'text-yellow-400/60' : 'text-red-400/60'
                }`}>{expired ? '—' : s.quality.overall_quality}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
