export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Asset {
  symbol: string;
  name: string;
  open: boolean;
  category?: 'forex' | 'crypto' | 'commodity' | 'index' | 'stock';
  payout?: number;
}

export interface AssetsData {
  otc: Asset[];
  market: Asset[];
}

export type MarketType = 'otc' | 'market';
export type Timeframe = '5s' | '10s' | '15s' | '1m' | '3m' | '5m';
export type AnalysisMode = 'scalping' | 'technical';
export type Direction = 'CALL' | 'PUT';
export type SignalStatus = 'active' | 'expired' | 'pending';

export interface IndicatorResult {
  rsi: string;
  macd: string;
  bollinger: string;
  stochastic: string;
  adx: string;
  trend: string;
}

export interface SmartMoneyData {
  candle_type: string;
  patterns: string;
  fvg: string;
  order_block: string;
  bull_bear: string;
  big_players: string;
  support_resistance: string;
  liquidity: string;
  momentum: string;
  sm_direction: Direction | 'NEUTRO';
  sm_confidence: number;
}

export interface SignalQuality {
  gaps_status: string;
  gaps_count: number;
  latency_status: string;
  feed_reliability: number;
  htf_5m: string;
  htf_15m: string;
  htf_direction: Direction | 'NEUTRO';
  wick_rejection: string;
  wick_strength: number;
  bos_choch: string;
  divergence: string;
  atr_value: string;
  volume_imbalance: string;
  overall_quality: 'ALTA' | 'MÉDIA' | 'BAIXA';
  quality_score: number;
}

export interface Signal {
  id: string;
  asset_symbol: string;
  asset_name: string;
  direction: Direction;
  timeframe: Timeframe;
  analysis_mode: AnalysisMode;
  confidence: number;
  momentum_score: number;
  entry_time: string;
  expiry_time: string;
  expiry_timestamp: number;
  generated_at: string;
  market_structure: string;
  candle_pattern: string;
  chart_pattern: string;
  trend_description: string;
  reasons: string[];
  indicators: IndicatorResult;
  smart_money?: SmartMoneyData;
  quality: SignalQuality;
}
