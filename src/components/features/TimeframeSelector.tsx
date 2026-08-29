import type { Timeframe } from '@/types';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (tf: Timeframe) => void;
}

const scalping: { value: Timeframe; label: string }[] = [
  { value: '5s', label: '5 seg' },
  { value: '10s', label: '10 seg' },
  { value: '15s', label: '15 seg' },
];

const technical: { value: Timeframe; label: string }[] = [
  { value: '1m', label: '1 Min' },
  { value: '3m', label: '3 Min' },
  { value: '5m', label: '5 Min' },
];

export default function TimeframeSelector({ selected, onChange }: TimeframeSelectorProps) {
  const isScalpingSelected = ['5s', '10s', '15s'].includes(selected);

  return (
    <div className="space-y-2">
      {/* Scalping group */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400">⚡ Scalping</span>
          <span className="text-[9px] text-muted-foreground">— Retração &amp; Impulsão</span>
        </div>
        <div className="flex gap-1.5">
          {scalping.map(tf => (
            <button
              key={tf.value}
              onClick={() => onChange(tf.value)}
              className={`flex-1 py-2 px-2 rounded border text-xs font-semibold transition-all duration-200 ${
                selected === tf.value
                  ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.3)]'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-yellow-500/30'
              }`}
            >
              ⚡ {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Technical group */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">📊 Técnico</span>
          <span className="text-[9px] text-muted-foreground">— Confluência Completa V5 PRO</span>
        </div>
        <div className="flex gap-1.5">
          {technical.map(tf => (
            <button
              key={tf.value}
              onClick={() => onChange(tf.value)}
              className={`flex-1 py-2 px-2 rounded border text-xs font-semibold transition-all duration-200 ${
                selected === tf.value
                  ? 'bg-primary/20 border-primary/60 text-primary glow-green'
                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
              }`}
            >
              ⏱ {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode description */}
      <div className={`rounded px-3 py-2 border text-[10px] leading-relaxed ${
        isScalpingSelected
          ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300/80'
          : 'bg-primary/5 border-primary/15 text-muted-foreground'
      }`}>
        {isScalpingSelected
          ? '⚡ Detecção de impulsões e retrações — RSI(7), Estocástico(7), Padrões de velas, Aceleração de preço, S/R imediatos'
          : '📊 EMA 9/21/50 · RSI 14 · MACD · Bollinger · ADX · Estrutura de Mercado · HTF 5m/15m · Padrões gráficos · Smart Money'}
      </div>
    </div>
  );
}
