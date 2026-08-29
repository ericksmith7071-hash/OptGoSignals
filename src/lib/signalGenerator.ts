import type { Signal, Direction, Timeframe, IndicatorResult, SmartMoneyData, SignalQuality, AnalysisMode, Candle } from '@/types';

// ===== RANDOM / CANDLE GENERATION =====

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateCandles(asset: string, count = 100): Candle[] {
  const seed = (Date.now() % 100000) + hashStr(asset) % 1000;
  const rng = seededRandom(seed);

  let basePrice = 1.0;
  let volatility = 0.0003;

  const a = asset.toUpperCase();
  if (a.includes('JPY')) { basePrice = 148 + rng() * 10 - 5; volatility = 0.0004; }
  else if (a.includes('BTC') || a.includes('BITCOIN')) { basePrice = 63000 + rng() * 4000 - 2000; volatility = 0.001; }
  else if (a.includes('ETH') || a.includes('ETHEREUM')) { basePrice = 3400 + rng() * 400 - 200; volatility = 0.0012; }
  else if (a.includes('XAU') || a.includes('GOLD')) { basePrice = 2380 + rng() * 100 - 50; volatility = 0.0004; }
  else if (a.includes('XAG') || a.includes('SILVER')) { basePrice = 29 + rng() * 4 - 2; volatility = 0.0006; }
  else if (a.includes('BRL')) { basePrice = 5.5 + rng() * 0.4 - 0.2; volatility = 0.0004; }
  else if (a.includes('SOL')) { basePrice = 175 + rng() * 30 - 15; volatility = 0.0015; }
  else if (a.includes('BNB')) { basePrice = 590 + rng() * 60 - 30; volatility = 0.001; }
  else if (a.includes('OIL') || a.includes('CRUDE')) { basePrice = 78 + rng() * 6 - 3; volatility = 0.0008; }
  else if (a.includes('APPLE')) { basePrice = 215 + rng() * 20 - 10; volatility = 0.0006; }
  else if (a.includes('TESLA')) { basePrice = 248 + rng() * 30 - 15; volatility = 0.0015; }
  else if (a.includes('GOOGLE') || a.includes('AMAZON') || a.includes('MICROSOFT')) {
    basePrice = 350 + rng() * 100 - 50; volatility = 0.0007;
  }
  else { basePrice = 1.0 + rng() * 0.2 - 0.1; volatility = 0.0003; }

  const candles: Candle[] = [];
  let price = basePrice;
  const trend = (rng() - 0.5) * volatility * 0.4;

  for (let i = 0; i < count; i++) {
    const change = (rng() - 0.5) * 2 * volatility + trend;
    const open = price;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.abs((rng() - 0.5) * volatility * 0.9));
    const low = Math.min(open, close) * (1 - Math.abs((rng() - 0.5) * volatility * 0.9));
    candles.push({ open, high, low, close, volume: Math.floor(rng() * 490 + 10) });
    price = close;
  }
  return candles;
}

// ===== MATH HELPERS =====

function calcEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [0];
  const k = 2 / (period + 1);
  const ema: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) ema.push(data[i] * k + ema[i - 1] * (1 - k));
  return ema;
}

function emaLast(data: number[], period: number): number {
  return calcEMA(data, Math.min(period, data.length - 1)).slice(-1)[0] ?? data[data.length - 1] ?? 0;
}

function calcRSIValue(closes: number[], period: number): number | null {
  if (closes.length <= period) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period - 1; i < closes.length - 1; i++) {
    const d = closes[i + 1] - closes[i];
    if (d > 0) gains += d; else losses -= d;
  }
  const avgG = gains / period, avgL = losses / period;
  if (avgL === 0) return 100;
  return 100 - 100 / (1 + avgG / avgL);
}

function calcRSIArray(closes: number[], period = 14): number[] {
  const rsi: number[] = new Array(period).fill(NaN);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let ag = gains / period, al = losses / period;
  rsi.push(100 - 100 / (1 + ag / (al || 0.0001)));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
    rsi.push(100 - 100 / (1 + ag / (al || 0.0001)));
  }
  return rsi;
}

function calcStochValue(highs: number[], lows: number[], closes: number[], period: number): number | null {
  const n = Math.min(highs.length, lows.length, closes.length);
  if (n < period) return null;
  const hh = Math.max(...highs.slice(-period));
  const ll = Math.min(...lows.slice(-period));
  if (hh === ll) return 50;
  return ((closes[closes.length - 1] - ll) / (hh - ll)) * 100;
}

function calcMACDResult(closes: number[]): { last: number; signal: number; hist: number; prevLast: number; prevSignal: number } | null {
  if (closes.length < 35) return null;
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const sigLine = calcEMA(macdLine.slice(26), 9);
  const ml = macdLine.length - 1;
  const sl = sigLine.length - 1;
  return {
    last: macdLine[ml], signal: sigLine[sl], hist: macdLine[ml] - sigLine[sl],
    prevLast: macdLine[ml - 1], prevSignal: sigLine[sl - 1],
  };
}

function calcBBResult(closes: number[], period = 20): { upper: number; lower: number; middle: number } | null {
  if (closes.length < period) return null;
  const win = closes.slice(-period);
  const mean = win.reduce((a, b) => a + b, 0) / period;
  const dev = Math.sqrt(win.reduce((s, v) => s + (v - mean) ** 2, 0) / period) * 2;
  return { upper: mean + dev, lower: mean - dev, middle: mean };
}

function calcADXResult(highs: number[], lows: number[], closes: number[], period = 14): { adx: number; dmp: number; dmn: number } {
  if (closes.length < period * 2) return { adx: 20, dmp: 10, dmn: 10 };
  const tr: number[] = [0], dmp: number[] = [0], dmn: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const h = highs[i], l = lows[i], ph = highs[i - 1], pl = lows[i - 1], pc = closes[i - 1];
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    const up = h - ph, down = pl - l;
    dmp.push(up > down && up > 0 ? up : 0);
    dmn.push(down > up && down > 0 ? down : 0);
  }
  const atrA = calcEMA(tr, period);
  const pA = calcEMA(dmp, period);
  const nA = calcEMA(dmn, period);
  const diP = pA.map((v, i) => atrA[i] ? (v / atrA[i]) * 100 : 0);
  const diN = nA.map((v, i) => atrA[i] ? (v / atrA[i]) * 100 : 0);
  const dx = diP.map((v, i) => { const s = v + diN[i]; return s ? (Math.abs(v - diN[i]) / s) * 100 : 0; });
  const adxA = calcEMA(dx, period);
  const last = adxA.length - 1;
  return { adx: adxA[last], dmp: diP[last], dmn: diN[last] };
}

function calcATRValue(candles: Candle[], period = 14): string {
  if (candles.length < period + 1) return 'N/A';
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const { high: h, low: l } = candles[i]; const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return (trs.slice(-period).reduce((a, b) => a + b, 0) / period).toFixed(5);
}

// ===== MARKET STRUCTURE =====

function detectMarketStructure(candles: Candle[], lookback: number): string {
  if (candles.length < lookback) return 'NEUTRO';
  const s = candles.slice(-lookback);
  const sH: number[] = [], sL: number[] = [];
  for (let i = 2; i < s.length - 2; i++) {
    if (s[i].high > s[i-1].high && s[i].high > s[i-2].high && s[i].high > s[i+1].high && s[i].high > s[i+2].high) sH.push(s[i].high);
    if (s[i].low < s[i-1].low && s[i].low < s[i-2].low && s[i].low < s[i+1].low && s[i].low < s[i+2].low) sL.push(s[i].low);
  }
  if (sH.length < 2 || sL.length < 2) return 'NEUTRO';
  const hh = sH[sH.length - 1] > sH[sH.length - 2];
  const hl = sL[sL.length - 1] > sL[sL.length - 2];
  const lh = sH[sH.length - 1] < sH[sH.length - 2];
  const ll = sL[sL.length - 1] < sL[sL.length - 2];
  if (hh && hl) return 'ALTA';
  if (lh && ll) return 'BAIXA';
  return 'NEUTRO';
}

// ===== CANDLE PATTERNS =====

function detectCandlePattern(candles: Candle[]): string {
  if (candles.length < 3) return 'nenhum';
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];
  const bL = Math.abs(last.close - last.open);
  const bP = Math.abs(prev.close - prev.open);
  const bP2 = Math.abs(prev2.close - prev2.open);
  const range = last.high - last.low;
  if (range === 0) return 'nenhum';
  const upper = last.high - Math.max(last.open, last.close);
  const lower = Math.min(last.open, last.close) - last.low;

  if (prev.close < prev.open && last.close > last.open && last.open <= prev.close && last.close >= prev.open && bL > bP)
    return 'Engolfo de Alta';
  if (prev.close > prev.open && last.close < last.open && last.open >= prev.close && last.close <= prev.open && bL > bP)
    return 'Engolfo de Baixa';
  if (lower > bL * 2 && upper < bL * 0.5 && bL < range * 0.35 && prev.close < prev.open) return 'Martelo (Hammer)';
  if (upper > bL * 2 && lower < bL * 0.5 && bL < range * 0.35 && prev.close > prev.open) return 'Estrela Cadente';
  if (lower > range * 0.6 && bL < range * 0.25) return 'Pin Bar de Alta';
  if (upper > range * 0.6 && bL < range * 0.25) return 'Pin Bar de Baixa';
  if (prev2.close < prev2.open && bP < bP2 * 0.3 && last.close > last.open && last.close > (prev2.open + prev2.close) / 2)
    return 'Estrela da Manhã';
  if (prev2.close > prev2.open && bP < bP2 * 0.3 && last.close < last.open && last.close < (prev2.open + prev2.close) / 2)
    return 'Estrela da Noite';
  if (last.close > last.open && prev.close > prev.open && prev2.close > prev2.open && last.close > prev.close && prev.close > prev2.close)
    return '3 Soldados Brancos';
  if (last.close < last.open && prev.close < prev.open && prev2.close < prev2.open && last.close < prev.close && prev.close < prev2.close)
    return '3 Corvos Negros';
  if (bL < range * 0.1) return prev.close < prev.open ? 'Doji (Reversão Alta)' : 'Doji (Reversão Baixa)';
  if (bL / range > 0.85) return last.close > last.open ? 'Marubozu de Alta' : 'Marubozu de Baixa';
  return 'nenhum';
}

// ===== CHART PATTERNS =====

function detectChartPattern(closes: number[], highs: number[], lows: number[]): string {
  if (closes.length < 20) return 'nenhum';
  const peaks: number[] = [], valleys: number[] = [];
  for (let i = 1; i < highs.length - 1; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) peaks.push(i);
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) valleys.push(i);
  }
  if (peaks.length >= 2) {
    const [p1i, p2i] = peaks.slice(-2);
    if (Math.abs(p2i - p1i) > 5) {
      const p1 = highs[p1i], p2 = highs[p2i];
      if (Math.abs(p1 - p2) / Math.max(p1, 0.001) < 0.003 && closes[closes.length - 1] < Math.min(...closes.slice(p1i, p2i + 1)))
        return 'Topo Duplo';
    }
  }
  if (valleys.length >= 2) {
    const [v1i, v2i] = valleys.slice(-2);
    if (Math.abs(v2i - v1i) > 5) {
      const v1 = lows[v1i], v2 = lows[v2i];
      if (Math.abs(v1 - v2) / Math.max(v1, 0.001) < 0.003 && closes[closes.length - 1] > Math.max(...closes.slice(v1i, v2i + 1)))
        return 'Fundo Duplo';
    }
  }
  if (peaks.length >= 2 && valleys.length >= 2) {
    const lastPeaks = peaks.slice(-2);
    const lastValleys = valleys.slice(-2);
    const h1 = highs[lastPeaks[0]], h2 = highs[lastPeaks[1]];
    const l1 = lows[lastValleys[0]], l2 = lows[lastValleys[1]];
    if (Math.abs(h1 - h2) / Math.max(h1, 0.001) < 0.002 && l2 > l1) return 'Triângulo Ascendente';
    if (h2 < h1 && Math.abs(l1 - l2) / Math.max(l1, 0.001) < 0.002) return 'Triângulo Descendente';
  }
  return 'nenhum';
}

// ===== HTF TREND =====

function detectHTFTrend(closes: number[]): { five: string; fifteen: string; description: string } {
  const e21 = emaLast(closes, 21);
  const e50 = emaLast(closes, 50);
  const e80 = emaLast(closes, 80);
  const last = closes[closes.length - 1];

  let five: string;
  if (last > e21 && e21 > e50) five = 'ALTA';
  else if (last < e21 && e21 < e50) five = 'BAIXA';
  else five = 'NEUTRO';

  let fifteen: string;
  if (last > e50 && e50 > e80) fifteen = 'ALTA';
  else if (last < e50 && e50 < e80) fifteen = 'BAIXA';
  else fifteen = 'NEUTRO';

  let description: string;
  if (five === 'ALTA' && fifteen === 'ALTA') description = '📈 Alta confirmada (5m + 15m)';
  else if (five === 'BAIXA' && fifteen === 'BAIXA') description = '📉 Baixa confirmada (5m + 15m)';
  else if (five === 'NEUTRO' && fifteen === 'NEUTRO') description = '➡️ Sem tendência definida';
  else description = `5m: ${five.toLowerCase()} | 15m: ${fifteen.toLowerCase()}`;

  return { five, fifteen, description };
}

// ===== V5 PRO QUALITY FILTERS =====

function detectGaps(candles: Candle[]): { count: number; status: string } {
  const ranges = candles.slice(-30).map(c => c.high - c.low);
  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length || 0.0001;
  let count = 0;
  for (let i = 1; i < candles.length; i++) {
    if (Math.abs(candles[i].open - candles[i - 1].close) / avgRange > 2.0) count++;
  }
  const status = count === 0 ? '✅ Sem gaps no gráfico'
    : count <= 2 ? `⚠️ ${count} gap(s) detectado(s) no feed`
    : `🔴 ${count} gaps críticos (dados suspeitos)`;
  return { count, status };
}

function detectLatency(candles: Candle[]): { status: string; reliability: number } {
  const ranges = candles.slice(-20).map(c => c.high - c.low);
  const avg = ranges.reduce((a, b) => a + b, 0) / ranges.length || 0.0001;
  const max = Math.max(...ranges);
  const ratio = max / avg;
  if (ratio > 3.5) return { status: '🔴 Spike no feed (dado possivelmente inválido)', reliability: 0.50 };
  if (ratio > 2.5) return { status: '⚠️ Volatilidade alta no feed', reliability: 0.78 };
  return { status: '✅ Feed normal — latência ok', reliability: 1.0 };
}

function detectWickRejection(candles: Candle[]): { signal: string; direction: Direction | null; strength: number } {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const o = last.open, h = last.high, l = last.low, c = last.close;
  const body = Math.abs(c - o);
  const upper = h - Math.max(o, c);
  const lower = Math.min(o, c) - l;
  const range = h - l;
  if (range === 0) return { signal: '⚪ Sem pavio significativo', direction: null, strength: 0 };
  const lr = lower / range, ur = upper / range, br = body / range;

  if (lr >= 0.60 && br <= 0.30) {
    const s = Math.min(95, Math.round(60 + lr * 35));
    return { signal: `📌 Pin Bar Alta — pavio inf. ${(lr * 100).toFixed(0)}% do range (força ${s}/100)`, direction: 'CALL', strength: s };
  }
  if (ur >= 0.60 && br <= 0.30) {
    const s = Math.min(95, Math.round(60 + ur * 35));
    return { signal: `📌 Pin Bar Baixa — pavio sup. ${(ur * 100).toFixed(0)}% do range (força ${s}/100)`, direction: 'PUT', strength: s };
  }
  const pb = Math.abs(prev.close - prev.open);
  if (prev.close < prev.open && c > o && body > pb * 1.1)
    return { signal: '🟢 Engolfo de Alta confirmado', direction: 'CALL', strength: 78 };
  if (prev.close > prev.open && c < o && body > pb * 1.1)
    return { signal: '🔴 Engolfo de Baixa confirmado', direction: 'PUT', strength: 78 };
  return { signal: '⚪ Sem rejeição significativa de pavio', direction: null, strength: 0 };
}

function detectHTFQuality(closes: number[], dir: Direction): { htf5m: string; htf15m: string; htfDir: Direction | 'NEUTRO'; bonus: number } {
  const e50 = emaLast(closes, 50);
  const e100 = emaLast(closes, 80);
  const last = closes[closes.length - 1];

  let d5: Direction | 'NEUTRO' = 'NEUTRO';
  let htf5m: string;
  if (last > e50 && e50 > e100) { d5 = 'CALL'; htf5m = '🟢 5m Bullish (preço > EMA50 > EMA100)'; }
  else if (last < e50 && e50 < e100) { d5 = 'PUT'; htf5m = '🔴 5m Bearish (preço < EMA50 < EMA100)'; }
  else if (last > e50) { d5 = 'CALL'; htf5m = '🟡 5m Neutro-Alta (acima EMA50)'; }
  else { d5 = 'PUT'; htf5m = '🟡 5m Neutro-Baixa (abaixo EMA50)'; }

  const e80 = emaLast(closes, 80);
  const d15: Direction | 'NEUTRO' = last > e80 ? 'CALL' : 'PUT';
  const htf15m = d15 === 'CALL' ? '🟢 15m Bullish (acima EMA longa)' : '🔴 15m Bearish (abaixo EMA longa)';

  let htfDir: Direction | 'NEUTRO' = 'NEUTRO';
  let bonus = 0;
  if (d5 === dir && d15 === dir) { htfDir = dir; bonus = 18; }
  else if (d5 === dir || d15 === dir) { htfDir = dir; bonus = 8; }
  else { htfDir = d5 !== 'NEUTRO' ? d5 : 'NEUTRO'; bonus = -12; }

  return { htf5m, htf15m, htfDir, bonus };
}

function detectBOSCHoCH(candles: Candle[]): { signal: string; direction: Direction | null; bonus: number } {
  if (candles.length < 20) return { signal: '⚪ Dados insuficientes', direction: null, bonus: 0 };
  const recent = candles.slice(-20);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);
  let swH = -Infinity, swL = Infinity;
  for (let i = 1; i < recent.length - 2; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i+1] && highs[i] > swH) swH = highs[i];
    if (lows[i] < lows[i-1] && lows[i] < lows[i+1] && lows[i] < swL) swL = lows[i];
  }
  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];
  if (last.close > swH && prev.close > swH) return { signal: '⬆️ BOS Alta confirmado (2 velas)', direction: 'CALL', bonus: 12 };
  if (last.close < swL && prev.close < swL) return { signal: '⬇️ BOS Baixa confirmado (2 velas)', direction: 'PUT', bonus: 12 };
  if (last.close > swH) return { signal: '⬆️ BOS Alta — rompimento de máxima swing', direction: 'CALL', bonus: 7 };
  if (last.close < swL) return { signal: '⬇️ BOS Baixa — rompimento de mínima swing', direction: 'PUT', bonus: 7 };
  const priceRange = swH - swL;
  if (priceRange > 0) {
    if ((swH - last.close) / priceRange < 0.08) return { signal: '🔄 CHoCH — testando resistência (reversão possível)', direction: 'PUT', bonus: 4 };
    if ((last.close - swL) / priceRange < 0.08) return { signal: '🔄 CHoCH — testando suporte (reversão possível)', direction: 'CALL', bonus: 4 };
  }
  return { signal: '↔️ Sem BOS/CHoCH identificado', direction: null, bonus: 0 };
}

function detectDivergence(closes: number[], rsiArr: number[]): string {
  const valid = rsiArr.filter(v => !isNaN(v));
  if (closes.length < 20 || valid.length < 10) return '➡️ Dados insuficientes para divergência';
  const n = Math.min(20, closes.length, valid.length);
  const rC = closes.slice(-n);
  const rR = valid.slice(-n);
  const mid = Math.floor(n / 2);
  const c1 = rC.slice(0, mid), c2 = rC.slice(mid);
  const r1 = rR.slice(0, mid), r2 = rR.slice(mid);
  if (!c1.length || !c2.length) return '➡️ Sem divergência detectada';
  const minP1 = Math.min(...c1), minP2 = Math.min(...c2);
  const rsiMin1 = r1[c1.indexOf(minP1)] ?? 50;
  const rsiMin2 = r2[c2.indexOf(minP2)] ?? 50;
  if (minP2 < minP1 * 0.9998 && rsiMin2 > rsiMin1 + 2)
    return '🟢 Divergência Bullish RSI (preço ↓, RSI ↑ — CALL favorecido)';
  const maxP1 = Math.max(...c1), maxP2 = Math.max(...c2);
  const rsiMax1 = r1[c1.indexOf(maxP1)] ?? 50;
  const rsiMax2 = r2[c2.indexOf(maxP2)] ?? 50;
  if (maxP2 > maxP1 * 1.0002 && rsiMax2 < rsiMax1 - 2)
    return '🔴 Divergência Bearish RSI (preço ↑, RSI ↓ — PUT favorecido)';
  return '➡️ Sem divergência detectada';
}

function detectVolumeImbalance(candles: Candle[]): string {
  if (!candles.some(c => c.volume > 0)) return '⚪ Volume não disponível';
  const vols = candles.slice(-20).map(c => c.volume);
  const avg = vols.reduce((a, b) => a + b, 0) / vols.length || 1;
  const last = candles[candles.length - 1];
  const ratio = last.volume / avg;
  const bodies = candles.slice(-20).map(c => Math.abs(c.close - c.open));
  const avgB = bodies.reduce((a, b) => a + b, 0) / bodies.length || 0.0001;
  const lastB = Math.abs(last.close - last.open);
  if (ratio > 2.0 && lastB > avgB * 1.5) return last.close > last.open ? '🐋 Big Players COMPRANDO (vol. alto + força)' : '🐋 Big Players VENDENDO (vol. alto + força)';
  if (ratio > 2.0 && lastB < avgB * 0.4) return '🐋 Absorção detectada (vol. alto + corpo pequeno)';
  if (ratio > 1.5) return last.close > last.open ? '📈 Volume crescente com alta' : '📉 Volume crescente com baixa';
  return '😴 Volume dentro da média';
}

// ===== SMART MONEY =====

function generateSmartMoney(candles: Candle[], taDir: Direction): SmartMoneyData {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];
  const o = last.open, h = last.high, l = last.low, c = last.close;
  const body = Math.abs(c - o), upper = h - Math.max(o, c), lower = Math.min(o, c) - l, range = h - l;

  let candle_type = 'Normal';
  if (range > 0) {
    if (body / range < 0.15) candle_type = 'Doji (Indecisão)';
    else if (body / range > 0.80) candle_type = c > o ? 'Marubozu de Alta (Força)' : 'Marubozu de Baixa (Força)';
    else if (lower > body * 2 && upper < body * 0.5) candle_type = 'Martelo (Hammer) ↑';
    else if (upper > body * 2 && lower < body * 0.5) candle_type = 'Estrela Cadente ↓';
    else candle_type = c > o ? 'Vela de Alta' : 'Vela de Baixa';
  }

  const patterns: string[] = [];
  const pb = Math.abs(prev.close - prev.open);
  if (prev.close < prev.open && c > o && c > prev.open && o < prev.close && body > pb) patterns.push('Engolfo de Alta');
  if (prev.close > prev.open && c < o && c < prev.open && o > prev.close && body > pb) patterns.push('Engolfo de Baixa');
  if (lower > range * 0.6 && body < range * 0.2) patterns.push('Pin Bar de Alta');
  if (upper > range * 0.6 && body < range * 0.2) patterns.push('Pin Bar de Baixa');
  const p2b = Math.abs(prev2.close - prev2.open);
  if (prev2.close < prev2.open && pb < p2b * 0.3 && c > o && c > (prev2.open + prev2.close) / 2) patterns.push('Estrela da Manhã');
  if (prev2.close > prev2.open && pb < p2b * 0.3 && c < o && c < (prev2.open + prev2.close) / 2) patterns.push('Estrela da Noite');

  const patternStr = patterns.length > 0 ? patterns.slice(0, 2).join(', ') : 'Nenhum padrão claro';

  const c20 = candles.slice(-20).map(x => x.close);
  const recentAvg = c20.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const priorAvg = c20.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
  const momentum = recentAvg > priorAvg ? 'Acelerando ⬆️' : 'Desacelerando ⬇️';

  const vols = candles.slice(-20).map(x => x.volume);
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length || 1;
  const volRatio = last.volume / avgVol;
  const avgB2 = candles.slice(-20).map(x => Math.abs(x.close - x.open)).reduce((a, b) => a + b, 0) / 20;
  let big_players = 'Sem atividade institucional detectada';
  if (volRatio > 2.0 && body > avgB2 * 1.5) big_players = c > o ? '🐋 Big Players COMPRANDO (volume alto + força)' : '🐋 Big Players VENDENDO (volume alto + força)';
  else if (volRatio > 2.0 && body < avgB2 * 0.5) big_players = '🐋 Absorção detectada (acumulação silenciosa)';
  else if (volRatio > 1.4) big_players = c > o ? '📈 Volume crescente com alta' : '📉 Volume crescente com baixa';

  let smCall = 0, smPut = 0;
  for (const p of patterns) {
    if (p.includes('Alta') || p.includes('Manhã')) smCall += 12;
    if (p.includes('Baixa') || p.includes('Noite') || p.includes('Cadente')) smPut += 12;
  }
  if (big_players.includes('COMPRANDO') || big_players.includes('crescente com alta')) smCall += 18;
  else if (big_players.includes('VENDENDO') || big_players.includes('crescente com baixa')) smPut += 18;
  if (momentum.includes('⬆️')) smCall += 10; else smPut += 10;
  if (taDir === 'CALL') smCall += 5; else smPut += 5;

  const sm_direction: Direction | 'NEUTRO' = smCall > smPut ? 'CALL' : smPut > smCall ? 'PUT' : 'NEUTRO';
  const sm_confidence = Math.min(90, Math.max(52, Math.round(55 + Math.abs(smCall - smPut))));
  const bullPct = Math.round((smCall / (smCall + smPut || 1)) * 100);

  return {
    candle_type, patterns: patternStr,
    fvg: smCall > smPut ? '🟢 FVG de Alta identificado (suporte)' : '🔴 FVG de Baixa identificado (resistência)',
    order_block: smCall > smPut ? '🟢 Próximo ao OB de Alta (suporte institucional)' : '🔴 Próximo ao OB de Baixa (resistência institucional)',
    bull_bear: `🐂 ${bullPct}% vs 🐻 ${100 - bullPct}% | ${bullPct > 50 ? '🐂 Touros Dominantes' : '🐻 Ursos Dominantes'}`,
    big_players, momentum, sm_direction, sm_confidence,
    support_resistance: smCall > smPut ? '🟢 Próximo ao SUPORTE — possível reversão alta' : '🔴 Próximo à RESISTÊNCIA — possível reversão baixa',
    liquidity: smCall > smPut ? '⬆️ Liquidez de compra próxima — busca stops acima' : '⬇️ Liquidez de venda próxima — busca stops abaixo',
  };
}

// ===== SCALPING ANALYSIS =====

function analyzeScalping(candles: Candle[]): {
  direction: Direction; confidence: number; reasons: string[];
  momentum_score: number; candle_pattern: string; market_structure: string;
  trend_description: string; indicators: IndicatorResult;
} {
  const recent = candles.slice(-30);
  const rC = recent.map(c => c.close);
  const rH = recent.map(c => c.high);
  const rL = recent.map(c => c.low);
  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];

  let bull = 0, bear = 0;
  const reasons: string[] = [];

  const l5 = rC.slice(-5);
  const priceChg = ((l5[4] - l5[0]) / l5[0]) * 10000;
  const avgRange = recent.slice(-10).reduce((s, c) => s + c.high - c.low, 0) / 10;
  const lastRange = last.high - last.low;

  if (priceChg > 0 && lastRange > avgRange * 1.2) {
    bull += Math.min(30, Math.abs(priceChg) * 5); reasons.push('impulsão de alta detectada');
  } else if (priceChg < 0 && lastRange > avgRange * 1.2) {
    bear += Math.min(30, Math.abs(priceChg) * 5); reasons.push('impulsão de baixa detectada');
  }

  const t15 = rC.slice(-15);
  const emaF = emaLast(t15, 5);
  const emaS = emaLast(t15, 12);
  const lastC = rC[rC.length - 1];
  const prevC = rC[rC.length - 2];
  const prev2C = rC[rC.length - 3];

  if (emaF > emaS && lastC > emaS) {
    if (lastC < emaF && prevC >= emaF) { bull += 25; reasons.push('retração em tendência de alta'); }
    else if (lastC <= prevC && prevC <= prev2C) { bull += 18; reasons.push('retração em tendência de alta'); }
  }
  if (emaF < emaS && lastC < emaS) {
    if (lastC > emaF && prevC <= emaF) { bear += 25; reasons.push('retração em tendência de baixa'); }
    else if (lastC >= prevC && prevC >= prev2C) { bear += 18; reasons.push('retração em tendência de baixa'); }
  }

  const rsiVal = calcRSIValue(rC, 7);
  if (rsiVal !== null) {
    if (rsiVal > 60) bull += 12; else if (rsiVal < 40) bear += 12;
    if (rsiVal > 80) { bear += 8; reasons.push('RSI(7) sobrecomprado — retração esperada'); }
    else if (rsiVal < 20) { bull += 8; reasons.push('RSI(7) sobrevendido — retração esperada'); }
  }

  const stochVal = calcStochValue(rH, rL, rC, 7);
  if (stochVal !== null) {
    if (stochVal > 70) bull += 6; else if (stochVal < 30) bear += 6;
  }

  const body = Math.abs(last.close - last.open);
  const lw = Math.min(last.open, last.close) - last.low;
  const uw = last.high - Math.max(last.open, last.close);
  const pb = Math.abs(prev.close - prev.open);
  let candle_pattern = 'nenhum';

  if (prev.close < prev.open && last.close > last.open && last.close > prev.open && last.open < prev.close && body > pb) {
    bull += 15; reasons.push('engolfo de alta (impulsão)'); candle_pattern = 'Engolfo de Alta';
  } else if (prev.close > prev.open && last.close < last.open && last.close < prev.open && last.open > prev.close && body > pb) {
    bear += 15; reasons.push('engolfo de baixa (impulsão)'); candle_pattern = 'Engolfo de Baixa';
  } else if (lw > body * 2.5 && uw < body * 0.5) {
    bull += 12; reasons.push('rejeição de baixa (pin bar)'); candle_pattern = 'Pin Bar de Alta';
  } else if (uw > body * 2.5 && lw < body * 0.5) {
    bear += 12; reasons.push('rejeição de alta (pin bar)'); candle_pattern = 'Pin Bar de Baixa';
  }

  const s1 = lastC - prevC, s2 = prevC - prev2C;
  if (s1 > 0 && s2 > 0 && s1 > s2) { bull += 8; reasons.push('aceleração de alta'); }
  else if (s1 < 0 && s2 < 0 && s1 < s2) { bear += 8; reasons.push('aceleração de baixa'); }

  const sH = [...rH].sort((a, b) => b - a).slice(0, 3);
  const sL = [...rL].sort((a, b) => a - b).slice(0, 3);
  const avgR = sH.reduce((a, b) => a + b, 0) / 3;
  const avgS = sL.reduce((a, b) => a + b, 0) / 3;
  if (lastC < avgS * 1.001 && last.close > last.open) { bull += 10; reasons.push('bounce no suporte'); }
  else if (lastC > avgR * 0.999 && last.close < last.open) { bear += 10; reasons.push('rejeição na resistência'); }

  const micro = emaF > emaS ? 'ALTA' : emaF < emaS ? 'BAIXA' : 'NEUTRO';
  const market_structure = `Micro: ${micro} | Scalping`;
  const trend_description = emaF > emaS ? '📈 Micro Tendência Alta (EMA5 > EMA12)' : emaF < emaS ? '📉 Micro Tendência Baixa (EMA5 < EMA12)' : '➡️ Sem tendência micro definida';

  let mom = 50;
  if (rC.length >= 5) mom += Math.min(25, Math.max(-25, Math.round(priceChg * 3)));
  if (rsiVal !== null) { if (rsiVal > 60) mom += 10; else if (rsiVal < 40) mom -= 10; }
  if (stochVal !== null) { if (stochVal > 60) mom += 5; else if (stochVal < 40) mom -= 5; }
  mom = Math.max(0, Math.min(100, mom));

  const diff = bull - bear;
  const direction: Direction = diff >= 0 ? 'CALL' : 'PUT';
  const confidence = Math.abs(diff) < 10 ? 52 : Math.min(95, Math.max(55, Math.round(55 + Math.abs(diff) * 0.5)));

  const indicators: IndicatorResult = {
    rsi: rsiVal !== null ? `${rsiVal.toFixed(1)} — RSI(7) Scalping${rsiVal > 70 ? ' (Sobrecomprado ↓)' : rsiVal < 30 ? ' (Sobrevendido ↑)' : ''}` : 'N/A',
    macd: '— Não calculado no modo scalping',
    bollinger: '— Não calculado no modo scalping',
    stochastic: stochVal !== null ? `K:${stochVal.toFixed(0)} — Stoch(7)${stochVal > 70 ? ' (Sobrecomprado ↓)' : stochVal < 30 ? ' (Sobrevendido ↑)' : ''}` : 'N/A',
    adx: '— Não calculado no modo scalping',
    trend: `EMA(5) ${emaF > emaS ? '> EMA(12) ↑ Alta' : emaF < emaS ? '< EMA(12) ↓ Baixa' : '≈ EMA(12) Lateral'}`,
  };

  return { direction, confidence, reasons: [...new Set(reasons)].slice(0, 6), momentum_score: mom, candle_pattern, market_structure, trend_description, indicators };
}

// ===== TECHNICAL ANALYSIS =====

function analyzeTechnical(candles: Candle[]): {
  direction: Direction; confidence: number; reasons: string[];
  momentum_score: number; candle_pattern: string; chart_pattern: string;
  market_structure: string; trend_description: string;
  indicators: IndicatorResult; htf: { five: string; fifteen: string };
} {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const e9 = emaLast(closes, 9);
  const e21 = emaLast(closes, 21);
  const e50 = emaLast(closes, 50);
  const rsiVal = calcRSIValue(closes, 14) ?? 50;
  const macdR = calcMACDResult(closes);
  const stochVal = calcStochValue(highs, lows, closes, 14);
  const bbR = calcBBResult(closes);
  const adxR = calcADXResult(highs, lows, closes);
  const cl = last.close;

  let bull = 0, bear = 0;
  const reasons: string[] = [];
  const indicators: IndicatorResult = { rsi: 'N/A', macd: 'N/A', bollinger: 'N/A', stochastic: 'N/A', adx: 'N/A', trend: 'N/A' };

  if (cl > e9 && e9 > e21 && e21 > e50) { bull += 24; reasons.push('EMAs alinhadas em alta (EMA9>21>50)'); indicators.trend = 'Alta Forte (EMA9 > EMA21 > EMA50)'; }
  else if (cl < e9 && e9 < e21 && e21 < e50) { bear += 24; reasons.push('EMAs alinhadas em baixa (EMA9<21<50)'); indicators.trend = 'Baixa Forte (EMA9 < EMA21 < EMA50)'; }
  else if (cl > e9 && e9 > e21) { bull += 18; indicators.trend = 'Alta (EMA9 > EMA21)'; }
  else if (cl < e9 && e9 < e21) { bear += 18; indicators.trend = 'Baixa (EMA9 < EMA21)'; }
  else if (cl > e9) { bull += 8; indicators.trend = 'Alta Leve (acima da EMA9)'; }
  else if (cl < e9) { bear += 8; indicators.trend = 'Baixa Leve (abaixo da EMA9)'; }
  else indicators.trend = 'Lateral';

  if (rsiVal >= 55 && rsiVal <= 70) { bull += 12; indicators.rsi = `${rsiVal.toFixed(1)} (Alta moderada ↑)`; }
  else if (rsiVal >= 30 && rsiVal <= 45) { bear += 12; indicators.rsi = `${rsiVal.toFixed(1)} (Baixa moderada ↓)`; }
  else if (rsiVal > 78) { bear += 10; reasons.push('RSI sobrecomprado'); indicators.rsi = `${rsiVal.toFixed(1)} (Sobrecomprado ↓)`; }
  else if (rsiVal < 22) { bull += 10; reasons.push('RSI sobrevendido'); indicators.rsi = `${rsiVal.toFixed(1)} (Sobrevendido ↑)`; }
  else indicators.rsi = `${rsiVal.toFixed(1)} (Neutro)`;

  if (macdR) {
    const { last: mL, signal: mS, prevLast: pML, prevSignal: pMS, hist } = macdR;
    if (mL > mS && pML <= pMS) { bull += 20; reasons.push('cruzamento de alta MACD'); indicators.macd = 'Cruzamento de Alta ↑'; }
    else if (mL < mS && pML >= pMS) { bear += 20; reasons.push('cruzamento de baixa MACD'); indicators.macd = 'Cruzamento de Baixa ↓'; }
    else if (hist > 0) { bull += 15; indicators.macd = 'Histograma Positivo ↑'; }
    else { bear += 15; indicators.macd = 'Histograma Negativo ↓'; }
  }

  if (stochVal !== null) {
    if (stochVal > 80) { bear += 4; indicators.stochastic = `K:${stochVal.toFixed(0)} (Sobrecomprado ↓)`; }
    else if (stochVal < 20) { bull += 4; indicators.stochastic = `K:${stochVal.toFixed(0)} (Sobrevendido ↑)`; }
    else if (stochVal > 60) { bull += 8; indicators.stochastic = `K:${stochVal.toFixed(0)} (Alta ↑)`; }
    else if (stochVal < 40) { bear += 8; indicators.stochastic = `K:${stochVal.toFixed(0)} (Baixa ↓)`; }
    else indicators.stochastic = `K:${stochVal.toFixed(0)} (Neutro)`;
  }

  if (bbR) {
    if (cl >= bbR.upper) { bear += 6; reasons.push('toque na banda superior Bollinger'); indicators.bollinger = 'Toque Banda Superior ↓'; }
    else if (cl <= bbR.lower) { bull += 6; reasons.push('toque na banda inferior Bollinger'); indicators.bollinger = 'Toque Banda Inferior ↑'; }
    else if (cl < bbR.middle) { bull += 2; indicators.bollinger = 'Abaixo da Média ↑'; }
    else { bear += 2; indicators.bollinger = 'Acima da Média ↓'; }
  }

  if (adxR.adx > 25) {
    if (adxR.dmp > adxR.dmn) { bull += 10; reasons.push('ADX: tendência de alta forte'); indicators.adx = `${adxR.adx.toFixed(0)} (Tendência Alta Forte ↑)`; }
    else { bear += 10; reasons.push('ADX: tendência de baixa forte'); indicators.adx = `${adxR.adx.toFixed(0)} (Tendência Baixa Forte ↓)`; }
  } else indicators.adx = `${adxR.adx.toFixed(0)} (Sem tendência clara)`;

  const micro = detectMarketStructure(candles, 30);
  const macro = detectMarketStructure(candles, 60);
  if (micro === 'ALTA') { bull += 10; reasons.push('estrutura micro em alta (HH+HL)'); }
  else if (micro === 'BAIXA') { bear += 10; reasons.push('estrutura micro em baixa (LL+LH)'); }
  if (macro === 'ALTA') bull += 6; else if (macro === 'BAIXA') bear += 6;
  const market_structure = `Micro: ${micro} | Macro: ${macro}`;

  const candle_pattern = detectCandlePattern(candles);
  const bullCP = new Set(['Engolfo de Alta', 'Martelo (Hammer)', 'Estrela da Manhã', '3 Soldados Brancos', 'Pin Bar de Alta', 'Doji (Reversão Alta)']);
  const bearCP = new Set(['Engolfo de Baixa', 'Estrela Cadente', 'Estrela da Noite', '3 Corvos Negros', 'Pin Bar de Baixa', 'Doji (Reversão Baixa)']);
  if (bullCP.has(candle_pattern)) { bull += 12; reasons.push(`vela: ${candle_pattern}`); }
  else if (bearCP.has(candle_pattern)) { bear += 12; reasons.push(`vela: ${candle_pattern}`); }

  const chart_pattern = detectChartPattern(closes.slice(-40), highs.slice(-40), lows.slice(-40));
  if (chart_pattern === 'Fundo Duplo' || chart_pattern === 'Triângulo Ascendente') { bull += 10; reasons.push(`gráfico: ${chart_pattern}`); }
  else if (chart_pattern === 'Topo Duplo' || chart_pattern === 'Triângulo Descendente') { bear += 10; reasons.push(`gráfico: ${chart_pattern}`); }

  if (last.close > last.open && prev.close > prev.open) bull += 6;
  else if (last.close < last.open && prev.close < prev.open) bear += 6;

  const htf = detectHTFTrend(closes);
  if (htf.five === 'ALTA') bull += 10; else if (htf.five === 'BAIXA') bear += 10;
  if (htf.fifteen === 'ALTA') bull += 12; else if (htf.fifteen === 'BAIXA') bear += 12;
  if (htf.five === htf.fifteen && htf.five === 'ALTA') { bull += 8; reasons.push('tendência de alta confirmada 5m+15m'); }
  else if (htf.five === htf.fifteen && htf.five === 'BAIXA') { bear += 8; reasons.push('tendência de baixa confirmada 5m+15m'); }

  const diff = bull - bear;
  const direction: Direction = diff >= 0 ? 'CALL' : 'PUT';
  const confidence = Math.min(95, Math.max(55, Math.round(55 + Math.abs(diff) * 0.5)));

  let mom = 50;
  if (closes.length >= 5) mom += Math.min(20, Math.max(-20, Math.round(((closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5]) * 100 * 500)));
  if (rsiVal > 60) mom += 10; else if (rsiVal < 40) mom -= 10;
  if (macdR && macdR.hist > 0) mom += 10; else if (macdR) mom -= 10;
  if (stochVal !== null) { if (stochVal > 60) mom += 5; else if (stochVal < 40) mom -= 5; }
  mom = Math.max(0, Math.min(100, mom));

  return { direction, confidence, reasons: [...new Set(reasons)].slice(0, 6), momentum_score: mom, candle_pattern, chart_pattern, market_structure, trend_description: htf.description, indicators, htf };
}

// ===== EXPIRY TIME CALCULATOR =====

function calcExpiryTimestamp(timeframe: Timeframe): { entry_time: string; expiry_time: string; expiry_timestamp: number } {
  const periodMap: Record<Timeframe, number> = { '5s': 5, '10s': 10, '15s': 15, '1m': 60, '3m': 180, '5m': 300 };
  const period = periodMap[timeframe];
  const now = new Date();
  // Entry: next candle open
  const entryTs = Math.ceil(now.getTime() / (period * 1000)) * (period * 1000);
  // Expiry: one period after entry
  const expiryTs = entryTs + period * 1000;

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo'
  });

  return {
    entry_time: fmt(entryTs),
    expiry_time: fmt(expiryTs),
    expiry_timestamp: expiryTs,
  };
}

// ===== MAIN EXPORT =====

export async function generateSignal(assetSymbol: string, assetName: string, timeframe: Timeframe, realCandles?: Candle[]): Promise<Signal> {
  const isScalping = ['5s', '10s', '15s'].includes(timeframe);
  const delay = isScalping ? 1200 + Math.random() * 600 : 2400 + Math.random() * 900;
  await new Promise(r => setTimeout(r, delay));

  const candles = realCandles && realCandles.length >= 60 ? realCandles : generateCandles(assetSymbol);
  const closes = candles.map(c => c.close);

  const gapsR = detectGaps(candles);
  const latR = detectLatency(candles);
  const wickR = detectWickRejection(candles);
  const bosR = detectBOSCHoCH(candles);
  const rsiArrForDiv = calcRSIArray(closes);
  const divStr = detectDivergence(closes, rsiArrForDiv);
  const atrVal = calcATRValue(candles);
  const volImb = detectVolumeImbalance(candles);

  let direction: Direction;
  let confidence: number;
  let reasons: string[];
  let momentum_score: number;
  let candle_pattern: string;
  let chart_pattern: string;
  let market_structure: string;
  let trend_description: string;
  let indicators: IndicatorResult;
  let analysis_mode: AnalysisMode;
  let smart_money: SmartMoneyData | undefined;

  if (isScalping) {
    analysis_mode = 'scalping';
    const r = analyzeScalping(candles);
    direction = r.direction;
    confidence = r.confidence;
    reasons = r.reasons;
    momentum_score = r.momentum_score;
    candle_pattern = r.candle_pattern;
    chart_pattern = 'nenhum';
    market_structure = r.market_structure;
    trend_description = r.trend_description;
    indicators = r.indicators;
  } else {
    analysis_mode = 'technical';
    const r = analyzeTechnical(candles);
    direction = r.direction;
    confidence = r.confidence;
    reasons = r.reasons;
    momentum_score = r.momentum_score;
    candle_pattern = r.candle_pattern;
    chart_pattern = r.chart_pattern;
    market_structure = r.market_structure;
    trend_description = r.trend_description;
    indicators = r.indicators;

    const sm = generateSmartMoney(candles, direction);
    const smScore = sm.sm_direction === 'CALL' ? sm.sm_confidence : sm.sm_direction === 'PUT' ? -sm.sm_confidence : 0;
    const combined = (direction === 'CALL' ? confidence : -confidence) * 0.60 + smScore * 0.40;
    direction = combined >= 0 ? 'CALL' : 'PUT';
    confidence = Math.min(95, Math.max(52, Math.round(Math.abs(combined))));
    smart_money = sm;
  }

  const htfQ = isScalping ? null : detectHTFQuality(closes, direction);
  if (htfQ) confidence += htfQ.bonus;
  if (wickR.direction === direction && wickR.strength > 0) confidence = Math.min(95, confidence + Math.round(wickR.strength * 0.12));
  if (bosR.direction === direction) confidence = Math.min(95, confidence + Math.round(bosR.bonus * 0.5));
  if (divStr.includes('Bullish') && direction === 'CALL') confidence = Math.min(95, confidence + 7);
  if (divStr.includes('Bearish') && direction === 'PUT') confidence = Math.min(95, confidence + 7);
  confidence = Math.round(confidence * latR.reliability);
  confidence = Math.max(52, confidence - Math.min(15, gapsR.count * 4));
  confidence = Math.min(95, Math.max(52, confidence));

  const qFactors = [
    gapsR.count === 0,
    latR.reliability >= 0.9,
    !isScalping && htfQ ? htfQ.htfDir === direction : true,
    wickR.direction === direction && wickR.strength > 0,
    bosR.direction === direction,
    divStr.includes('Bullish') || divStr.includes('Bearish'),
  ].filter(Boolean).length;
  const qScore = Math.round((qFactors / 6) * 100);
  const overallQ: 'ALTA' | 'MÉDIA' | 'BAIXA' = qScore >= 67 ? 'ALTA' : qScore >= 34 ? 'MÉDIA' : 'BAIXA';

  const quality: SignalQuality = {
    gaps_status: gapsR.status,
    gaps_count: gapsR.count,
    latency_status: latR.status,
    feed_reliability: Math.round(latR.reliability * 100),
    htf_5m: htfQ ? htfQ.htf5m : '⚪ N/A — Scalping usa micro-estrutura',
    htf_15m: htfQ ? htfQ.htf15m : '⚪ N/A — Scalping usa micro-estrutura',
    htf_direction: htfQ ? htfQ.htfDir : 'NEUTRO',
    wick_rejection: wickR.signal,
    wick_strength: wickR.strength,
    bos_choch: bosR.signal,
    divergence: isScalping ? '⚪ N/A — Não calculado em scalping' : divStr,
    atr_value: atrVal,
    volume_imbalance: volImb,
    overall_quality: overallQ,
    quality_score: qScore,
  };

  const { entry_time, expiry_time, expiry_timestamp } = calcExpiryTimestamp(timeframe);

  return {
    id: `${assetSymbol}-${Date.now()}`,
    asset_symbol: assetSymbol,
    asset_name: assetName,
    direction,
    timeframe,
    analysis_mode,
    confidence,
    momentum_score,
    entry_time,
    expiry_time,
    expiry_timestamp,
    generated_at: new Date().toISOString(),
    market_structure,
    candle_pattern,
    chart_pattern,
    trend_description,
    reasons,
    indicators,
    smart_money,
    quality,
  };
}
