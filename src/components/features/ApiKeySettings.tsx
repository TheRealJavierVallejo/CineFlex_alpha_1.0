import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Eye, EyeOff, Save, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ApiKeySettings: React.FC = () => {
  const navigate = useNavigate();
  const [claudeKey, setClaudeKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('claude_api_key, gemini_api_key')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
         console.error('Error loading API keys:', error);
      }

      if (data) {
        setClaudeKey(data.claude_api_key || '');
        setGeminiKey(data.gemini_api_key || '');
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const saveApiKeys = async () => {
    setLoading(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated. Please sign in.');

      // Validate Claude key format
      if (claudeKey && !claudeKey.startsWith('sk-ant-')) {
        throw new Error('Invalid Claude API key format. Must start with "sk-ant-"');
      }

      // Validate Gemini key format
      if (geminiKey && !geminiKey.startsWith('AIza')) {
        throw new Error('Invalid Gemini API key format. Must start with "AIza"');
      }

      const updates = {
        claude_api_key: claudeKey || null,
        gemini_api_key: geminiKey || null,
        claude_api_key_updated_at: new Date().toISOString(),
        gemini_api_key_updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error: any) {
      console.error('Error saving API keys:', error);
      setErrorMessage(error.message || 'Failed to save API keys');
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/')} 
        className="mb-6 flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronLeft size={18} />
        <span className="text-sm font-medium">Back to Projects</span>
      </button>

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-text-primary">API Key Settings</h2>
          <p className="text-text-secondary">
            Provide your own API keys to enable AI features. Your keys are stored securely in your private profile.
          </p>
        </div>

        {/* Claude API Key Section */}
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
              <span className="text-blue-500">🤖</span>
              Claude API Key (Chat & Writing Assistance)
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Used for Syd chat, story development, character advice, and beat suggestions.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">
              API Key
            </label>
            <div className="relative">
              <input
                type={showClaudeKey ? 'text' : 'password'}
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="w-full px-4 py-2 pr-12 bg-surface-secondary border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm text-text-primary outline-none"
              />
              <button
                type="button"
                onClick={() => setShowClaudeKey(!showClaudeKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showClaudeKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-block"
            >
              Get your Claude API key →
            </a>
          </div>
        </div>

        {/* Gemini API Key Section */}
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
              <span className="text-green-500">🎨</span>
              Google Gemini API Key (Image Generation)
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Used only for generating images in the Shot Editor.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">
              API Key
            </label>
            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-2 pr-12 bg-surface-secondary border border-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm text-text-primary outline-none"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                {showGeminiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-500 hover:underline inline-block"
            >
              Get your Gemini API key →
            </a>
          </div>
        </div>

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div className="flex items-center gap-2 p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-400">
            <CheckCircle size={20} />
            <span>API keys saved successfully!</span>
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={saveApiKeys}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save API Keys'}
        </button>

        {/* Security Notice */}
        <div className="bg-surface-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
          <p className="font-medium mb-1 text-text-primary">🔒 Security Notice:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your API keys are stored in your profile database record.</li>
            <li>Row Level Security (RLS) ensures only you can access them.</li>
            <li>You can update or remove your keys at any time.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};