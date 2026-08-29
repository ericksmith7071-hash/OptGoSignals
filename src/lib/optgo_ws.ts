import type { Candle } from '@/types';

type WSState = 'disconnected' | 'connecting' | 'connected' | 'error';

class OptGoWS {
  private socket: WebSocket | null = null;
  private state: WSState = 'disconnected';
  private candles: Record<string, Candle[]> = {};
  private subscribers: ((asset: string, candles: Candle[]) => void)[] = [];
  private ssid: string | null = null;

  constructor() {
    this.ssid = localStorage.getItem('optgo_ssid');
  }

  setSSID(ssid: string) {
    this.ssid = ssid;
    localStorage.setItem('optgo_ssid', ssid);
    if (this.state === 'connected') {
      this.disconnect();
      this.connect();
    }
  }

  connect() {
    if (this.state === 'connecting' || this.state === 'connected') return;

    this.state = 'connecting';
    const wsUrl = `wss://int.trade.optgobroker.com/socket.io/?EIO=3&transport=websocket`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('OptGo WS Connected');
        this.state = 'connected';
        this.socket?.send('40');

        if (this.ssid) {
          this.socket?.send(`42["auth",{"session":"${this.ssid}"}]`);
        }
      };

      this.socket.onmessage = (event) => {
        const data = event.data as string;

        if (data === '2') {
          this.socket?.send('3');
          return;
        }

        if (data.startsWith('42')) {
          try {
            const parsed = JSON.parse(data.substring(2));
            const [event, payload] = parsed;

            if (event === 'candles' || event === 'history') {
              const { asset, data: candleData } = payload;
              this.candles[asset] = candleData;
              this.notifySubscribers(asset, candleData);
            }

            if (event === 'tick') {
              const { asset, price, time } = payload;
              this.updateLastCandle(asset, price, time);
            }
          } catch (e) {
            // silently fail
          }
        }
      };

      this.socket.onclose = () => {
        this.state = 'disconnected';
        console.log('OptGo WS Disconnected');
        setTimeout(() => this.connect(), 5000);
      };

      this.socket.onerror = () => {
        this.state = 'error';
        console.error('OptGo WS Error');
      };

    } catch (e) {
      this.state = 'error';
      console.error('Failed to connect to OptGo WS', e);
    }
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.state = 'disconnected';
  }

  subscribe(asset: string, timeframe: string) {
    if (this.state === 'connected') {
      this.socket?.send(`42["subscribe",{"asset":"${asset}","timeframe":"${timeframe}"}]`);
    }
  }

  onUpdate(callback: (asset: string, candles: Candle[]) => void) {
    this.subscribers.push(callback);
  }

  private notifySubscribers(asset: string, candles: Candle[]) {
    this.subscribers.forEach(cb => cb(asset, candles));
  }

  private updateLastCandle(_asset: string, _price: number, _time: number) {
    // Update last candle with received tick
  }

  getCandles(asset: string): Candle[] | null {
    return this.candles[asset] || null;
  }

  getState(): WSState {
    return this.state;
  }
}

export const optgoWS = new OptGoWS();
