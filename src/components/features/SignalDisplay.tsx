import { useState, useEffect } from 'react';
import type { Signal, SignalQuality } from '@/types';
import { TrendingUp, TrendingDown, Clock, Target, BarChart2, Brain, ShieldCheck, Activity, ListChecks, TimerOff, Timer } from 'lucide-react';

interface SignalDisplayProps {
  signal: Signal;
}

// ── Countdown hook ──────────────────────────────────────────────────────────
function useCountdown(expiryTimestamp: number) {
  const getRemaining = () => Math.max(0, Math.ceil((expiryTimestamp - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    setRemaining(getRemaining());
    const id = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [expiryTimestamp]);

  return remaining;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ExpiryBadge({ remaining, isCall }: { remaining: number; isCall: boolean }) {
  const expired = remaining <= 0;
  const urgent = remaining > 0 && remaining <= 10;

  if (expired) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-500/20 border border-gray-500/40">
        <TimerOff className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sinal Expirado</span>
      </div>
    );
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
      urgent
        ? 'bg-red-500/20 border-red-500/50 animate-pulse'
        : isCall
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-red-500/10 border-red-500/30'
    }`}>
      <Timer className={`w-3.5 h-3.5 ${urgent ? 'text-red-400' : isCall ? 'text-green-400' : 'text-red-400'}`} />
      <span className={`text-xs font-bold font-mono ${urgent ? 'text-red-400' : isCall ? 'text-green-400' : 'text-red-400'}`}>
        {urgent ? '⚡ ' : ''}{timeStr}
      </span>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 10);
  const color = value >= 80 ? 'bg-green-400' : value >= 65 ? 'bg-yellow-400' : 'bg-orange-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`h-3 w-4 rounded-sm transition-all ${i < filled ? color : 'bg-secondary'}`} />
        ))}
      </div>
      <span className={`text-sm font-bold font-mono ${value >= 80 ? 'text-green-400' : value >= 65 ? 'text-yellow-400' : 'text-orange-400'}`}>
        {value}%
      </span>
    </div>
  );
}

function MomentumBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-green-400' : value >= 55 ? 'bg-emerald-400' : value >= 45 ? 'bg-yellow-400' : value >= 30 ? 'bg-orange-400' : 'bg-red-400';
  const label = value >= 70 ? 'Alta ↑' : value >= 55 ? 'Neutro-Alta ↗' : value >= 45 ? 'Neutro ➡' : value >= 30 ? 'Neutro-Baixa ↘' : 'Baixa ↓';
  const textColor = value >= 55 ? 'text-green-400' : value >= 45 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1.5">
        <span className="text-muted-foreground font-medium">Momentum</span>
        <span className={`font-bold font-mono ${textColor}`}>{value}/100 — {label}</span>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden relative">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border/50 z-10" />
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
        <span>Baixa</span><span>Neutro</span><span>Alta</span>
      </div>
    </div>
  );
}

function IndicatorRow({ label, value }: { label: string; value: string }) {
  const isCall = value.includes('↑') || value.includes('Alta') || value.includes('Bullish') || value.includes('alta') || value.includes('Sobrevendido') || value.includes('Positivo') || value.includes('Inferior');
  const isPut = value.includes('↓') || value.includes('Baixa') || value.includes('Bearish') || value.includes('baixa') || value.includes('Sobrecomprado') || value.includes('Negativo') || value.includes('Superior');
  const isNA = value.startsWith('—') || value === 'N/A';
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground font-medium flex-shrink-0 w-24">{label}</span>
      <span className={`text-xs font-medium text-right leading-tight ${isNA ? 'text-border' : isCall ? 'text-green-400' : isPut ? 'text-red-400' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

function QualityRow({ label, value }: { label: string; value: string }) {
  const isGood = value.includes('✅') || value.includes('🟢') || value.includes('Normal') || value.includes('Alta');
  const isWarn = value.includes('⚠️') || value.includes('🟡') || value.includes('Neutro');
  const isBad = value.includes('🔴') || value.includes('crítico') || value.includes('Spike');
  const isNA = value.includes('⚪') || value.includes('N/A');
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground font-medium flex-shrink-0 w-32">{label}</span>
      <span className={`text-xs font-medium text-right leading-tight ${
        isNA ? 'text-border' : isGood ? 'text-green-400' : isWarn ? 'text-yellow-400' : isBad ? 'text-red-400' : 'text-foreground'
      }`}>
        {value}
      </span>
    </div>
  );
}

function SignalQualityCard({ quality }: { quality: SignalQuality }) {
  const qColor = quality.overall_quality === 'ALTA'
    ? 'bg-green-500/15 border-green-500/30 text-green-400'
    : quality.overall_quality === 'MÉDIA'
    ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
    : 'bg-red-500/15 border-red-500/30 text-red-400';
  return (
    <div className="terminal-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Qualidade do Sinal — V5 PRO</span>
        <span className={`ml-auto text-xs font-bold px-2.5 py-0.5 rounded border ${qColor}`}>
          {quality.overall_quality} · {quality.quality_score}%
        </span>
      </div>
      <div className="px-4 py-2">
        <QualityRow label="Gaps feed" value={quality.gaps_status} />
        <QualityRow label="Latência" value={quality.latency_status} />
        <QualityRow label="Confiabilidade" value={`${quality.feed_reliability}% confiabilidade`} />
        <QualityRow label="HTF 5m" value={quality.htf_5m} />
        <QualityRow label="HTF 15m" value={quality.htf_15m} />
        <QualityRow label="Rejeição Pavio" value={quality.wick_rejection} />
        <QualityRow label="BOS / CHoCH" value={quality.bos_choch} />
        <QualityRow label="Divergência RSI" value={quality.divergence} />
        <QualityRow label="Vol. Imbalance" value={quality.volume_imbalance} />
        <QualityRow label="ATR (14)" value={quality.atr_value} />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function SignalDisplay({ signal }: SignalDisplayProps) {
  const isCall = signal.direction === 'CALL';
  const isScalping = signal.analysis_mode === 'scalping';
  const remaining = useCountdown(signal.expiry_timestamp);
  const expired = remaining <= 0;

  return (
    <div className="fade-in-up space-y-3">

      {/* ── EXPIRY OVERLAY (when expired) ── */}
      {expired && (
        <div className="terminal-border rounded-lg p-4 bg-gray-900/80 border-gray-500/40 flex items-center gap-3">
          <TimerOff className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-300">Sinal Expirado</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Este sinal expirou às <span className="font-mono text-gray-300">{signal.expiry_time}</span>. Analise o ativo novamente para obter um novo sinal.
            </p>
          </div>
        </div>
      )}

      {/* ── MAIN SIGNAL CARD ── */}
      <div className={`relative overflow-hidden rounded-lg border transition-all duration-500 ${
        expired
          ? 'border-gray-600/40 bg-gray-900/50 opacity-60'
          : isCall
            ? 'border-green-500/40 bg-green-500/5 glow-green scan-line'
            : 'border-red-500/40 bg-red-500/5 glow-red scan-line'
      }`}>
        <div className="p-4">

          {/* Mode + Asset */}
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  expired
                    ? 'bg-gray-500/15 border-gray-500/30 text-gray-400'
                    : isScalping
                      ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                      : 'bg-primary/15 border-primary/30 text-primary'
                }`}>
                  {expired ? '⏱ EXPIRADO' : isScalping ? '⚡ SCALPING' : '📊 TÉCNICO V5 PRO'}
                </span>
                {!expired && (
                  <span className="text-[10px] text-muted-foreground">
                    {isScalping ? 'Retração & Impulsão' : 'Confluência Completa'}
                  </span>
                )}
              </div>
              <div className="text-lg font-bold text-foreground truncate">{signal.asset_name}</div>
            </div>

            {/* Direction badge */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 flex-shrink-0 transition-all ${
              expired
                ? 'border-gray-600/40 bg-gray-800/40'
                : isCall
                  ? 'border-green-500/60 bg-green-500/15'
                  : 'border-red-500/60 bg-red-500/15'
            }`}>
              {isCall
                ? <TrendingUp className={`w-6 h-6 ${expired ? 'text-gray-400' : 'text-green-400'}`} />
                : <TrendingDown className={`w-6 h-6 ${expired ? 'text-gray-400' : 'text-red-400'}`} />}
              <span className={`text-xl font-black ${expired ? 'text-gray-400' : isCall ? 'text-green-400' : 'text-red-400'}`}>
                {signal.direction}
              </span>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <Clock className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-[10px] text-muted-foreground">Entrada</div>
              <div className="text-xs font-bold font-mono text-foreground">{signal.entry_time}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <Target className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-[10px] text-muted-foreground">Expiração</div>
              <div className="text-xs font-bold font-mono text-foreground">{signal.expiry_time}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <BarChart2 className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-[10px] text-muted-foreground">Prazo</div>
              <div className="text-xs font-bold text-foreground">{signal.timeframe}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2 text-center">
              <BarChart2 className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-[10px] text-muted-foreground">Confiança</div>
              <div className={`text-xs font-bold font-mono ${signal.confidence >= 80 ? 'text-green-400' : signal.confidence >= 65 ? 'text-yellow-400' : 'text-orange-400'}`}>
                {signal.confidence}%
              </div>
            </div>
          </div>

          {/* Countdown + confidence */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <ExpiryBadge remaining={remaining} isCall={isCall} />
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                signal.quality.overall_quality === 'ALTA' ? 'bg-green-500/15 text-green-400' :
                signal.quality.overall_quality === 'MÉDIA' ? 'bg-yellow-500/15 text-yellow-400' :
                'bg-red-500/15 text-red-400'
              }`}>Qualidade {signal.quality.overall_quality}</span>
            </div>

            {/* Progress bar for countdown */}
            {!expired && (() => {
              const periodMap: Record<string, number> = { '5s': 5, '10s': 10, '15s': 15, '1m': 60, '3m': 180, '5m': 300 };
              const total = periodMap[signal.timeframe] ?? 60;
              const pct = (remaining / total) * 100;
              const barColor = remaining <= 10 ? 'bg-red-400' : remaining <= 30 ? 'bg-yellow-400' : isCall ? 'bg-green-400' : 'bg-red-400';
              return (
                <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              );
            })()}

            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-[10px] text-muted-foreground font-medium mb-2">Barra de Confiança</div>
              <ConfidenceBar value={signal.confidence} />
            </div>
          </div>
        </div>
      </div>

      {/* Only show detailed analysis if not expired */}
      {!expired && (
        <>
          {/* MOMENTUM + STRUCTURE */}
          <div className="terminal-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Momentum & Estrutura</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <MomentumBar value={signal.momentum_score} />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-secondary/40 rounded p-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Estrutura</div>
                  <div className="text-[11px] font-semibold text-foreground">{signal.market_structure}</div>
                </div>
                <div className="bg-secondary/40 rounded p-2">
                  <div className="text-[10px] text-muted-foreground mb-1">Tendência HTF</div>
                  <div className="text-[11px] font-semibold text-foreground">{signal.trend_description}</div>
                </div>
              </div>
              {(signal.candle_pattern !== 'nenhum' || (signal.chart_pattern && signal.chart_pattern !== 'nenhum')) && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-secondary/40 rounded p-2">
                    <div className="text-[10px] text-muted-foreground mb-1">Padrão de Vela</div>
                    <div className={`text-[11px] font-semibold ${
                      signal.candle_pattern.includes('Alta') || signal.candle_pattern.includes('Manhã') || signal.candle_pattern.includes('Soldados') || signal.candle_pattern.includes('Hammer') ? 'text-green-400' :
                      signal.candle_pattern.includes('Baixa') || signal.candle_pattern.includes('Noite') || signal.candle_pattern.includes('Corvos') || signal.candle_pattern.includes('Cadente') ? 'text-red-400' :
                      'text-foreground'
                    }`}>{signal.candle_pattern}</div>
                  </div>
                  {signal.chart_pattern && signal.chart_pattern !== 'nenhum' && (
                    <div className="bg-secondary/40 rounded p-2">
                      <div className="text-[10px] text-muted-foreground mb-1">Padrão Gráfico</div>
                      <div className={`text-[11px] font-semibold ${
                        signal.chart_pattern.includes('Fundo') || signal.chart_pattern.includes('Ascendente') ? 'text-green-400' :
                        signal.chart_pattern.includes('Topo') || signal.chart_pattern.includes('Descendente') ? 'text-red-400' : 'text-foreground'
                      }`}>{signal.chart_pattern}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CONFLUENCES */}
          {signal.reasons.length > 0 && (
            <div className="terminal-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center gap-2">
                <ListChecks className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Confluências Detectadas</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{signal.reasons.length} fatores</span>
              </div>
              <div className="px-4 py-2.5 space-y-1.5">
                {signal.reasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCall ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-xs text-foreground">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUALITY */}
          <SignalQualityCard quality={signal.quality} />

          {/* TECHNICAL INDICATORS */}
          <div className="terminal-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {isScalping ? 'Indicadores Scalping' : 'Indicadores Técnicos'}
              </span>
            </div>
            <div className="px-4 py-2">
              <IndicatorRow label="RSI" value={signal.indicators.rsi} />
              <IndicatorRow label="MACD" value={signal.indicators.macd} />
              <IndicatorRow label="Bollinger" value={signal.indicators.bollinger} />
              <IndicatorRow label="Estocástico" value={signal.indicators.stochastic} />
              <IndicatorRow label="ADX" value={signal.indicators.adx} />
              <IndicatorRow label="Tendência EMA" value={signal.indicators.trend} />
            </div>
          </div>

          {/* SMART MONEY */}
          {signal.smart_money && (
            <div className="terminal-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Smart Money & Price Action</span>
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded ${
                  signal.smart_money.sm_direction === 'CALL' ? 'bg-green-500/15 text-green-400' :
                  signal.smart_money.sm_direction === 'PUT' ? 'bg-red-500/15 text-red-400' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  SM {signal.smart_money.sm_direction} {signal.smart_money.sm_confidence}%
                </span>
              </div>
              <div className="px-4 py-2">
                <IndicatorRow label="Vela" value={signal.smart_money.candle_type} />
                <IndicatorRow label="Padrões" value={signal.smart_money.patterns} />
                <IndicatorRow label="FVG" value={signal.smart_money.fvg} />
                <IndicatorRow label="Order Block" value={signal.smart_money.order_block} />
                <IndicatorRow label="Força" value={signal.smart_money.bull_bear} />
                <IndicatorRow label="Big Players" value={signal.smart_money.big_players} />
                <IndicatorRow label="S/R" value={signal.smart_money.support_resistance} />
                <IndicatorRow label="Liquidez" value={signal.smart_money.liquidity} />
                <IndicatorRow label="Momentum" value={signal.smart_money.momentum} />
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-[10px] text-muted-foreground text-center px-2 leading-relaxed">
        ⚠️ Sinais para fins educacionais. Use gerenciamento de risco. Não é consultoria financeira.
      </p>
    </div>
  );
}
