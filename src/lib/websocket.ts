import { cryptoExchange, WATCHED_COINS } from './api/exchanges';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    // Create WebSocket streams for all watched coins
    const streams = WATCHED_COINS.map(symbol => `${symbol.toLowerCase()}usdt@ticker`).join('/');
    this.ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.notifySubscribers('price', {
        symbol: data.s.replace('USDT', ''),
        price: parseFloat(data.c),
        change24h: parseFloat(data.P),
        volume24h: parseFloat(data.v),
        exchange: 'Binance',
        marketCap: parseFloat(data.q),
        rank: 0,
        priceChange1h: parseFloat(data.P) / 24
      });
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 5000 * this.reconnectAttempts);
    }
  }

  subscribe(channel: string, callback: (data: any) => void) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)?.add(callback);
  }

  unsubscribe(channel: string, callback: (data: any) => void) {
    this.subscribers.get(channel)?.delete(callback);
  }

  private notifySubscribers(channel: string, data: any) {
    this.subscribers.get(channel)?.forEach(callback => callback(data));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const websocket = new WebSocketService();