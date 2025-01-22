import React, { useEffect, useState } from 'react';
import { cryptoExchange, PriceData, WATCHED_COINS } from '../lib/api/exchanges';
import { websocket } from '../lib/websocket';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown } from 'lucide-react';

export function PriceTable() {
  const [watchedPrices, setWatchedPrices] = useState<PriceData[]>([]);
  const [marketMovers, setMarketMovers] = useState<PriceData[]>([]);
  const [topLosers, setTopLosers] = useState<PriceData[]>([]);
  const [activeTab, setActiveTab] = useState<'watched' | 'movers' | 'losers'>('watched');

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [prices, movers, losers] = await Promise.all([
          cryptoExchange.getPrices(WATCHED_COINS),
          cryptoExchange.getMarketMovers(),
          cryptoExchange.getLosers()
        ]);
        setWatchedPrices(prices);
        setMarketMovers(movers);
        setTopLosers(losers);
      } catch (error) {
        console.error('Error fetching market data:', error);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 30000); // Update every 30 seconds

    // WebSocket updates for watched coins
    const handlePriceUpdate = (data: PriceData) => {
      setWatchedPrices(current =>
        current.map(price =>
          price.symbol === data.symbol ? data : price
        )
      );
    };

    websocket.subscribe('price', handlePriceUpdate);

    return () => {
      clearInterval(interval);
      websocket.unsubscribe('price', handlePriceUpdate);
    };
  }, []);

  const renderPriceRow = (price: PriceData) => (
    <tr key={price.symbol} className="hover:bg-gray-700 dark:hover:bg-gray-750">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{price.symbol}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white">${price.price.toLocaleString()}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm flex items-center ${price.change24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {price.change24h >= 0 ? (
            <ArrowUpCircle className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDownCircle className="h-4 w-4 mr-1" />
          )}
          {Math.abs(price.change24h).toFixed(2)}%
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {price.volume24h.toLocaleString()}
      </td>
    </tr>
  );

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Market Data</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('watched')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'watched'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              Watched Coins
            </button>
            <button
              onClick={() => setActiveTab('movers')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'movers'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                Top Movers
              </div>
            </button>
            <button
              onClick={() => setActiveTab('losers')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${activeTab === 'losers'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <div className="flex items-center">
                <TrendingDown className="h-4 w-4 mr-1" />
                Top Losers
              </div>
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Price (USD)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                24h Change
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                24h Volume
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {activeTab === 'watched' && watchedPrices.map(renderPriceRow)}
            {activeTab === 'movers' && marketMovers.map(renderPriceRow)}
            {activeTab === 'losers' && topLosers.map(renderPriceRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
}