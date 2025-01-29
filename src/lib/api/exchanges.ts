import { supabase } from "../supabase";
import * as CryptoJS from "crypto-js";

// API endpoints for different exchanges
const BINANCE_API = "https://api.binance.com/api/v3";
const COINBASE_API = "https://api.pro.coinbase.com";
const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL;
console.log("SUPABASE_FUNCTIONS_URL: ",SUPABASE_FUNCTIONS_URL);
// const SUPABASE_API_URL = import.meta.env.VITE_SUPABASE_API_URL;

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  exchange: string;
  marketCap: number;
  rank: number;
  priceChange1h: number;
}

export interface OrderData {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  exchange?: string;
}

export interface PortfolioData {
  assets: {
    symbol: string;
    balance: number;
    value_usd: number;
  }[];
  total_value_usd: number;
}

export interface ExchangeApiKeys {
  binance?: {
    apiKey: string;
    secretKey: string;
  };
  coinbase?: {
    apiKey: string;
    secretKey: string;
  };
}

export const WATCHED_COINS = [
  "BTC", // Bitcoin
  "ETH", // Ethereum
  "SOL", // Solana
  "ADA", // Cardano
  "DOT", // Polkadot
  "FET", // Fetch.ai
  "LINK", // Chainlink
  "AVAX", // Avalanche
];

class CryptoExchangeService {
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = 5000
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  async getPrices(symbols: string[] = WATCHED_COINS): Promise<PriceData[]> {
    try {
      // Fetch from Binance
      const [tickerPromises, marketDataPromise] = await Promise.all([
        Promise.all(
          symbols.map((symbol) =>
            this.fetchWithTimeout(
              `${BINANCE_API}/ticker/24hr?symbol=${symbol}USDT`
            )
          )
        ),
        this.fetchWithTimeout(`${BINANCE_API}/ticker/price`),
      ]);

      const marketData = await marketDataPromise.json();
      const allPrices = new Map(
        marketData.map((item: any) => [
          item.symbol.replace("USDT", ""),
          parseFloat(item.price),
        ])
      );

      const prices = await Promise.all(
        tickerPromises.map(async (res, index) => {
          const data = await res.json();
          return {
            symbol: symbols[index],
            price: parseFloat(data.lastPrice),
            change24h: parseFloat(data.priceChangePercent),
            volume24h: parseFloat(data.volume),
            exchange: "Binance",
            marketCap: parseFloat(data.quoteVolume),
            rank: index + 1, // This would ideally come from a market cap API
            priceChange1h: parseFloat(data.priceChangePercent) / 24, // Approximation for demo
          };
        })
      );

      // Sort by 24h volume to get market movers
      return prices.sort((a, b) => b.volume24h - a.volume24h);
    } catch (error) {
      console.error("Error fetching prices:", error);
      throw new Error("Failed to fetch cryptocurrency prices");
    }
  }

  async getMarketMovers(): Promise<PriceData[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${BINANCE_API}/ticker/24hr`
      );
      const data = await response.json();

      return data
        .filter((item: any) => item.symbol.endsWith("USDT"))
        .map((item: any) => ({
          symbol: item.symbol.replace("USDT", ""),
          price: parseFloat(item.lastPrice),
          change24h: parseFloat(item.priceChangePercent),
          volume24h: parseFloat(item.volume),
          exchange: "Binance",
          marketCap: parseFloat(item.quoteVolume),
          rank: 0,
          priceChange1h: parseFloat(item.priceChangePercent) / 24,
        }))
        .sort(
          (a: PriceData, b: PriceData) =>
            Math.abs(b.change24h) - Math.abs(a.change24h)
        )
        .slice(0, 25);
    } catch (error) {
      console.error("Error fetching market movers:", error);
      throw new Error("Failed to fetch market movers");
    }
  }

  async getLosers(): Promise<PriceData[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${BINANCE_API}/ticker/24hr`
      );
      const data = await response.json();
      return data
        .filter((item: any) => item.symbol.endsWith("USDT"))
        .map((item: any) => ({
          symbol: item.symbol.replace("USDT", ""),
          price: parseFloat(item.lastPrice),
          change24h: parseFloat(item.priceChangePercent),
          volume24h: parseFloat(item.volume),
          exchange: "Binance",
          marketCap: parseFloat(item.quoteVolume),
          rank: 0,
          priceChange1h: parseFloat(item.priceChangePercent) / 24,
        }))
        .filter((item: PriceData) => item.change24h < 0)
        .sort((a: PriceData, b: PriceData) => a.change24h - b.change24h)
        .slice(0, 15);
    } catch (error) {
      console.error("Error fetching top losers:", error);
      throw new Error("Failed to fetch top losers");
    }
  }

  // async executeTrade(order: OrderData): Promise<boolean> {
  //   try {
  //     // Get user's API keys from Supabase
  //     const { data: { user } } = await supabase.auth.getUser();
  //     const { data: profile } = await supabase
  //       .from('profiles')
  //       .select('api_keys')
  //       .eq('id', user?.id)
  //       .single();

  //     if (!profile?.api_keys) {
  //       throw new Error('No API keys configured');
  //     }

  //     // In a real implementation, you would:
  //     // 1. Sign the request with API keys
  //     // 2. Send to the appropriate exchange
  //     // 3. Handle the response

  //     // For demo purposes, we'll just simulate a successful trade
  //     return true;
  //   } catch (error) {
  //     console.error('Error executing trade:', error);
  //     throw error;
  //   }
  // }

  private async getApiKeys(): Promise<ExchangeApiKeys> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: profile } = await supabase
      .from("profiles")
      .select("api_keys")
      .eq("id", user.id)
      .single();

    if (!profile?.api_keys) {
      throw new Error("No API keys configured");
    }

    return profile.api_keys;
  }

  private signRequest(payload: string, secretKey: string): string {
    const crypto_res = CryptoJS.HmacSHA256(payload, secretKey).toString(
      CryptoJS.enc.Hex
    );
    console.log(crypto_res);
    return crypto_res;
  }

  // private async signRequest(payload: string, secretKey: string): Promise<string> {
  //   // Convert the payload and secret key to Uint8Array
  //   const encoder = new TextEncoder();
  //   const payloadBuffer = encoder.encode(payload);
  //   const keyBuffer = encoder.encode(secretKey);

  //   // Import the secret key
  //   const cryptoKey = await crypto.subtle.importKey(
  //     'raw',
  //     keyBuffer,
  //     { name: 'HMAC', hash: 'SHA-256' },
  //     false,
  //     ['sign']
  //   );

  //   // Sign the payload
  //   const signature = await crypto.subtle.sign(
  //     'HMAC',
  //     cryptoKey,
  //     payloadBuffer
  //   );

  //   // Convert the signature to hex string
  //   return Array.from(new Uint8Array(signature))
  //     .map(b => b.toString(16).padStart(2, '0'))
  //     .join('');
  // }

  async executeTrade(order: OrderData): Promise<boolean> {
    try {
      const apiKeys = await this.getApiKeys();
      const exchange = order.exchange || "binance"; // Default to Binance if not specified

      if (exchange === "binance" && apiKeys.binance) {
        const timestamp = Date.now();
        const params = new URLSearchParams({
          symbol: `${order.symbol}USDT`,
          side: order.side.toUpperCase(),
          type: "LIMIT",
          quantity: order.quantity.toString(),
          price: order.price.toString(),
          timestamp: timestamp.toString(),
        });

        const signature = await this.signRequest(
          params.toString(),
          apiKeys.binance.secretKey
        );
        params.append("signature", signature);

        const response = await this.fetchWithTimeout(
          `${BINANCE_API}/order?${params.toString()}`,
          {
            method: "POST",
            headers: {
              "X-MBX-APIKEY": apiKeys.binance.apiKey,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Trade execution failed: ${error.msg}`);
        }

        const result = await response.json();
        return result.orderId != null;
      } else if (exchange === "coinbase" && apiKeys.coinbase) {
        const timestamp = Math.floor(Date.now() / 1000);
        const method = "POST";
        const path = "/orders";

        const body = JSON.stringify({
          product_id: `${order.symbol}-USDT`,
          side: order.side,
          price: order.price.toString(),
          size: order.quantity.toString(),
          type: "limit",
        });

        const message = timestamp + method + path + body;
        const signature = await this.signRequest(
          message,
          apiKeys.coinbase.secretKey
        );

        const response = await this.fetchWithTimeout(`${COINBASE_API}${path}`, {
          method,
          headers: {
            "CB-ACCESS-KEY": apiKeys.coinbase.apiKey,
            "CB-ACCESS-SIGN": signature,
            "CB-ACCESS-TIMESTAMP": timestamp.toString(),
            "Content-Type": "application/json",
          },
          body,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Trade execution failed: ${error.message}`);
        }

        const result = await response.json();
        return result.id != null;
      }

      throw new Error(
        `Exchange ${exchange} not supported or API keys not configured`
      );
    } catch (error) {
      console.error("Error executing trade:", error);
      throw error;
    }
  }

  async getPortfolio(): Promise<PortfolioData> {
    try {
      const apiKeys = await this.getApiKeys();
      const assets: PortfolioData["assets"] = [];

      // Fetch current prices for conversion to USD
      const prices = await this.getPrices();
      const priceMap = new Map(prices.map((p) => [p.symbol, p.price]));

      // Fetch Binance balances if configured
      if (apiKeys.binance) {
        const timestamp = Date.now();
        const params = new URLSearchParams({ timestamp: timestamp.toString() });
        console.log("keys:", apiKeys.binance);
        const signature = await this.signRequest(
          params.toString(),
          apiKeys.binance.secretKey
        );
        params.append("signature", signature);
        console.log("params:", params.toString());

        // const response = await this.fetchWithTimeout(
        //   `${BINANCE_API}/account?${params.toString()}`,
        //   {
        //     headers: {
        //       "X-MBX-APIKEY": apiKeys.binance.apiKey,
        //     },
        //   }
        // );
       
        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/binance-proxy`, {
          method: 'POST',
          body: JSON.stringify({
            endpoint: '/api/v3/account',
            method: 'GET',
            params: {
              timestamp: Date.now(),
              signature: await this.signRequest(params.toString(), apiKeys.binance.secretKey)
            },
            headers: {
              'X-MBX-APIKEY': apiKeys.binance.apiKey
            }
          })
        });
        console.log("response: ", response);

        if (response.ok) {
          const data = await response.json();
          const nonZeroBalances = data.balances.filter(
            (b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
          );

          for (const balance of nonZeroBalances) {
            const symbol = balance.asset.replace("USDT", "");
            const total = parseFloat(balance.free) + parseFloat(balance.locked);
            const price = priceMap.get(symbol) || 0;

            assets.push({
              symbol,
              balance: total,
              value_usd: total * price,
            });
          }
        }
      }

      // Fetch Coinbase balances if configured
      if (apiKeys.coinbase) {
        const timestamp = Math.floor(Date.now() / 1000);
        const method = "GET";
        const path = "/accounts";
        const message = timestamp + method + path;
        const signature = await this.signRequest(
          message,
          apiKeys.coinbase.secretKey
        );

        const response = await this.fetchWithTimeout(`${COINBASE_API}${path}`, {
          headers: {
            "CB-ACCESS-KEY": apiKeys.coinbase.apiKey,
            "CB-ACCESS-SIGN": signature,
            "CB-ACCESS-TIMESTAMP": timestamp.toString(),
          },
        });

        if (response.ok) {
          const accounts = await response.json();
          const nonZeroAccounts = accounts.filter(
            (a: any) => parseFloat(a.balance) > 0
          );

          for (const account of nonZeroAccounts) {
            const symbol = account.currency;
            const balance = parseFloat(account.balance);
            const price = priceMap.get(symbol) || 0;

            // Merge with existing assets or add new
            const existingAssetIndex = assets.findIndex(
              (a) => a.symbol === symbol
            );
            if (existingAssetIndex >= 0) {
              assets[existingAssetIndex].balance += balance;
              assets[existingAssetIndex].value_usd += balance * price;
            } else {
              assets.push({
                symbol,
                balance,
                value_usd: balance * price,
              });
            }
          }
        }
      }

      // Calculate total portfolio value
      const total_value_usd = assets.reduce(
        (sum, asset) => sum + asset.value_usd,
        0
      );

      return {
        assets: assets.sort((a, b) => b.value_usd - a.value_usd), // Sort by value
        total_value_usd,
      };
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      throw error;
    }
  }
}

export const cryptoExchange = new CryptoExchangeService();
