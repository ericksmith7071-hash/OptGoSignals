import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, Zap, AlertCircle, Shield, Wifi, WifiOff, Settings, RefreshCw } from 'lucide-react';
import type { Asset, Signal, Timeframe } from '@/types';
import AssetPanel from '@/components/features/AssetPanel';
import TimeframeSelector from '@/components/features/TimeframeSelector';
import SignalDisplay from '@/components/features/SignalDisplay';
import SignalHistory from '@/components/features/SignalHistory';
import { generateSignal } from '@/lib/signalGenerator';
import { optgoWS } from '@/lib/optgo_ws';

type AnalysisState = 'idle' | 'loading' | 'done' | 'error';

const SCALPING_STEPS = [
  'Coletando dados de mercado...',
  'Detectando impulsões e retrações...',
  'RSI(7) e Estocástico(7) — análise rápida...',
  'Identificando padrões de velas e price action...',
  'Calculando sinal de scalping...',
];

const TECHNICAL_STEPS = [
  'Coletando dados de mercado...',
  'Verificando qualidade do feed (gaps)...',
  'Calculando RSI, MACD, Bollinger, ADX...',
  'Detectando estrutura de mercado (HH/HL/LL/LH)...',
  'Analisando padrões de velas e gráficos...',
  'Confirmando timeframes superiores (5m / 15m)...',
  'Smart Money, BOS/CHoCH, Divergência RSI...',
  'Gerando sinal V5 PRO final...',
];

export default function Dashboard() {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [signal, setSignal] = useState<Signal | null>(null);
  const [history, setHistory] = useState<Signal[]>([]);
  const [state, setState] = useState<AnalysisState>('idle');
  const [loadingStep, setLoadingStep] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [wsState, setWsState] = useState(optgoWS.getState());
  const [ssid, setSsid] = useState(localStorage.getItem('optgo_ssid') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [signalExpired, setSignalExpired] = useState(false);
  const analyzeRef = useRef<HTMLDivElement>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    optgoWS.connect();
    const interval = setInterval(() => setWsState(optgoWS.getState()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Watch for signal expiry
  useEffect(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    setSignalExpired(false);

    if (signal) {
      const msUntilExpiry = signal.expiry_timestamp - Date.now();
      if (msUntilExpiry <= 0) {
        setSignalExpired(true);
      } else {
        expiryTimerRef.current = setTimeout(() => setSignalExpired(true), msUntilExpiry);
      }
    }
    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [signal]);

  const isScalping = ['5s', '10s', '15s'].includes(timeframe);
  const STEPS = isScalping ? SCALPING_STEPS : TECHNICAL_STEPS;

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setState('idle');
    setSignal(null);
    setSignalExpired(false);
    setPanelOpen(false);
    setTimeout(() => analyzeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedAsset) return;
    setState('loading');
    setSignal(null);
    setSignalExpired(false);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, isScalping ? 280 : 380);

    try {
      const realCandles = optgoWS.getCandles(selectedAsset.symbol);
      const result = await generateSignal(selectedAsset.symbol, selectedAsset.name, timeframe, realCandles || undefined);
      clearInterval(interval);
      setSignal(result);
      setHistory(prev => [result, ...prev].slice(0, 20));
      setState('done');
    } catch {
      clearInterval(interval);
      setState('error');
    }
  }, [selectedAsset, timeframe, STEPS.length, isScalping]);

  const handleReplay = (s: Signal) => {
    setSignal(s);
    setSignalExpired(Date.now() > s.expiry_timestamp);
    setState('done');
    analyzeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-4">

      {/* CONNECTION STATUS */}
      <div className="flex items-center justify-between gap-4 p-3 terminal-border rounded-lg bg-secondary/10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${wsState === 'connected' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {wsState === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Status OptGo</p>
            <p className="text-xs font-mono font-bold">
              {wsState === 'connected' ? 'CONECTADO (REAL-TIME)' : wsState === 'connecting' ? 'CONECTANDO...' : 'DESCONECTADO'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-md hover:bg-secondary/50 text-muted-foreground transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {showSettings && (
        <div className="p-4 terminal-border rounded-lg bg-card space-y-3 fade-in-up">
          <h3 className="text-xs font-bold uppercase tracking-wider">Configurações de Conexão</h3>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">Sessão OptGo (SSID)</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                placeholder="Insira seu SSID para análise real-time..."
                className="flex-1 bg-background border border-border rounded px-3 py-2 text-xs font-mono"
              />
              <button
                onClick={() => optgoWS.setSSID(ssid)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-xs font-bold"
              >
                Salvar
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              * O SSID permite que o robô acesse os dados de preço em tempo real diretamente da sua conta OptGo.
            </p>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE ASSET PANEL */}
      <div className="terminal-border rounded-lg overflow-hidden">
        <button
          onClick={() => setPanelOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors border-b border-border"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
            📊 Painel de Ativos
          </span>
          {selectedAsset ? (
            <span className="flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/25 text-primary px-2.5 py-0.5 rounded-full font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${selectedAsset.open ? 'bg-green-400' : 'bg-red-400'}`} />
              {selectedAsset.name}
              {selectedAsset.payout && <span className="text-primary/70 ml-1">{selectedAsset.payout}%</span>}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Selecione um ativo</span>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            {panelOpen ? <><ChevronUp className="w-4 h-4" /> Minimizar</> : <><ChevronDown className="w-4 h-4" /> Expandir</>}
          </span>
        </button>
        {panelOpen && (
          <AssetPanel selectedAsset={selectedAsset} onSelectAsset={handleSelectAsset} />
        )}
      </div>

      {/* TIMEFRAME + ANALYZE */}
      <div ref={analyzeRef} className="terminal-border rounded-lg p-4 space-y-4">
        {selectedAsset ? (
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${selectedAsset.open ? 'bg-green-400' : 'bg-red-500'}`} />
            <span className="text-base font-bold text-foreground leading-none">{selectedAsset.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{selectedAsset.symbol}</span>
            {selectedAsset.payout && (
              <span className="text-xs font-bold text-primary">Payout: {selectedAsset.payout}%</span>
            )}
            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded border ${
              selectedAsset.open
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {selectedAsset.open ? '● ABERTO' : '● FECHADO'}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <ChevronUp className="w-4 h-4 text-primary" />
            Expanda o painel acima e selecione um ativo para analisar
          </p>
        )}

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Modo & Timeframe</p>
          <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
        </div>

        {/* Primary analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={!selectedAsset || state === 'loading'}
          className={`w-full py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            !selectedAsset || state === 'loading'
              ? 'bg-secondary text-muted-foreground cursor-not-allowed'
              : isScalping
              ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.2)]'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 glow-green'
          }`}
        >
          {state === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
          ) : isScalping ? (
            <><Zap className="w-4 h-4" /> Gerar Sinal Scalping — {timeframe}</>
          ) : (
            <><Shield className="w-4 h-4" /> Analisar & Gerar Sinal — V5 PRO</>
          )}
        </button>

        {/* Re-analyze button (shown when signal expired) */}
        {signalExpired && state === 'done' && selectedAsset && (
          <button
            onClick={handleAnalyze}
            className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-orange-500/15 border border-orange-500/40 text-orange-300 hover:bg-orange-500/25 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Sinal expirado — Analisar Novamente
          </button>
        )}
      </div>

      {/* LOADING */}
      {state === 'loading' && (
        <div className="terminal-border rounded-lg p-6 fade-in-up">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className={`absolute inset-0 rounded-full border-2 animate-spin border-t-transparent ${isScalping ? 'border-yellow-500/20 border-t-yellow-400' : 'border-primary/20 border-t-primary'}`} />
              {isScalping ? <Zap className="absolute inset-0 m-auto w-7 h-7 text-yellow-400" /> : <Shield className="absolute inset-0 m-auto w-7 h-7 text-primary" />}
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">{isScalping ? 'Processando Scalping ⚡' : 'Processando V5 PRO 📊'}</p>
              <p className={`text-xs font-mono ${isScalping ? 'text-yellow-400' : 'text-primary'}`}>{STEPS[loadingStep]}</p>
            </div>
            <div className="w-full max-w-sm bg-secondary rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-400 ${isScalping ? 'bg-yellow-400' : 'bg-primary'}`}
                style={{ width: `${((loadingStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            <div className="grid gap-1 w-full max-w-sm" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= loadingStep ? (isScalping ? 'bg-yellow-400' : 'bg-primary') : 'bg-secondary'}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {state === 'error' && (
        <div className="terminal-border rounded-lg p-5 border-red-500/30 fade-in-up">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Erro na análise</p>
              <p className="text-xs text-muted-foreground mt-0.5">Não foi possível gerar o sinal. Tente novamente.</p>
            </div>
          </div>
        </div>
      )}

      {/* SIGNAL RESULT */}
      {state === 'done' && signal && <SignalDisplay signal={signal} />}

      {/* IDLE */}
      {state === 'idle' && !selectedAsset && (
        <div className="terminal-border rounded-lg p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary/50" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Nenhum sinal gerado</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Expanda o painel, selecione um ativo, escolha o modo de análise e clique em <strong className="text-foreground">Analisar</strong>.
          </p>
        </div>
      )}

      {/* HISTORY */}
      <SignalHistory signals={history} onReplay={handleReplay} />
    </div>
  );
}
