import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ApiKeysSettings = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'binance' | 'coinbase'>('binance');
    const [apiKeys, setApiKeys] = useState({
        binance: {
            apiKey: '',
            secretKey: ''
        },
        coinbase: {
            apiKey: '',
            secretKey: ''
        }
    });

    useEffect(() => {
        loadApiKeys();
    }, []);

    const loadApiKeys = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('api_keys')
                .eq('id', user.id)
                .single();

            if (profile?.api_keys) {
                setApiKeys({
                    binance: profile.api_keys.binance || { apiKey: '', secretKey: '' },
                    coinbase: profile.api_keys.coinbase || { apiKey: '', secretKey: '' }
                });
            }
        } catch (err) {
            console.error('Error loading API keys:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (exchange: 'binance' | 'coinbase', field: 'apiKey' | 'secretKey', value: string) => {
        setApiKeys(prev => ({
            ...prev,
            [exchange]: {
                ...prev[exchange],
                [field]: value
            }
        }));
    };

    const saveApiKeys = async (exchange: 'binance' | 'coinbase') => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get current API keys
            const { data: profile } = await supabase
                .from('profiles')
                .select('api_keys')
                .eq('id', user.id)
                .single();

            // Merge new keys with existing ones
            const updatedApiKeys = {
                ...(profile?.api_keys || {}),
                [exchange]: apiKeys[exchange]
            };

            // Update the database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ api_keys: updatedApiKeys })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setSuccess(`${exchange.charAt(0).toUpperCase() + exchange.slice(1)} API keys saved successfully`);
        } catch (err) {
            console.error('Error saving API keys:', err);
            setError('Failed to save API keys. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Exchange API Keys</h2>

            <div className="mb-4">
                <div className="flex border-b">
                    <button
                        className={`px-4 py-2 ${activeTab === 'binance' ? 'border-b-2 border-blue-500' : ''}`}
                        onClick={() => setActiveTab('binance')}
                    >
                        Binance
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'coinbase' ? 'border-b-2 border-blue-500' : ''}`}
                        onClick={() => setActiveTab('coinbase')}
                    >
                        Coinbase
                    </button>
                </div>
            </div>

            {activeTab === 'binance' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">API Key</label>
                        <input
                            type="password"
                            className="w-full p-2 border rounded"
                            value={apiKeys.binance.apiKey}
                            onChange={(e) => handleInputChange('binance', 'apiKey', e.target.value)}
                            placeholder="Enter your Binance API key"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Secret Key</label>
                        <input
                            type="password"
                            className="w-full p-2 border rounded"
                            value={apiKeys.binance.secretKey}
                            onChange={(e) => handleInputChange('binance', 'secretKey', e.target.value)}
                            placeholder="Enter your Binance secret key"
                        />
                    </div>
                    <button
                        onClick={() => saveApiKeys('binance')}
                        disabled={loading}
                        className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                    >
                        {loading ? 'Saving...' : 'Save Binance Keys'}
                    </button>
                </div>
            )}

            {activeTab === 'coinbase' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">API Key</label>
                        <input
                            type="password"
                            className="w-full p-2 border rounded"
                            value={apiKeys.coinbase.apiKey}
                            onChange={(e) => handleInputChange('coinbase', 'apiKey', e.target.value)}
                            placeholder="Enter your Coinbase API key"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Secret Key</label>
                        <input
                            type="password"
                            className="w-full p-2 border rounded"
                            value={apiKeys.coinbase.secretKey}
                            onChange={(e) => handleInputChange('coinbase', 'secretKey', e.target.value)}
                            placeholder="Enter your Coinbase secret key"
                        />
                    </div>
                    <button
                        onClick={() => saveApiKeys('coinbase')}
                        disabled={loading}
                        className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                    >
                        {loading ? 'Saving...' : 'Save Coinbase Keys'}
                    </button>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                    <p className="font-bold">Success</p>
                    <p>{success}</p>
                </div>
            )}
        </div>
    );
};

export default ApiKeysSettings;