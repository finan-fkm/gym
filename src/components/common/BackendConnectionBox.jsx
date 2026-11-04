import React, { useState, useEffect } from 'react';
import { useGymState } from '../../context/GymStateContext';
import { Server, Globe, CheckCircle2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export default function BackendConnectionBox({ theme = 'dark', error = '', onConnected }) {
  const { API_URL, saveBackendUrl } = useGymState();
  const [urlInput, setUrlInput] = useState(API_URL || '');
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' | 'warning' | 'error' | ''
  const [showGuide, setShowGuide] = useState(false);

  // Auto-expand if no API_URL configured, or if there's a backend connection error
  const hasConnectionError = error && (
    error.toLowerCase().includes('backend url') ||
    error.toLowerCase().includes('could not reach') ||
    error.toLowerCase().includes('could not connect') ||
    error.toLowerCase().includes('html response')
  );

  const [isExpanded, setIsExpanded] = useState(!API_URL || Boolean(hasConnectionError));

  useEffect(() => {
    if (!API_URL || hasConnectionError) {
      setIsExpanded(true);
    }
  }, [API_URL, hasConnectionError]);

  useEffect(() => {
    if (API_URL) {
      setUrlInput((prev) => prev || API_URL);
    }
  }, [API_URL]);

  const handleTestAndSave = async (e) => {
    if (e) e.preventDefault();
    const trimmed = (urlInput || '').trim();
    if (!trimmed) {
      setStatusType('error');
      setStatusMessage('Please enter your Render service URL (e.g. https://your-service.onrender.com)');
      return;
    }

    setIsTesting(true);
    setStatusType('');
    setStatusMessage('Testing connection to backend...');

    const formatted = saveBackendUrl(trimmed);
    setUrlInput(formatted);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${formatted}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setStatusType('success');
        setStatusMessage('Connected successfully! Backend is online and ready.');
        if (onConnected) onConnected(formatted);
      } else {
        setStatusType('warning');
        setStatusMessage(`Backend reached (${res.status} ${res.statusText}). URL saved!`);
        if (onConnected) onConnected(formatted);
      }
    } catch {
      // If abort or network error, backend might be waking up on Render free tier
      setStatusType('warning');
      setStatusMessage('Backend URL saved! Free-tier Render servers take ~30–50s to wake up from idle. Give it a moment, then try logging in.');
      if (onConnected) onConnected(formatted);
    } finally {
      setIsTesting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`rounded-2xl border transition-all text-xs my-2 ${
      isDark 
        ? 'bg-[#15191e]/90 border-gray-800 text-gray-300' 
        : 'bg-amber-50/70 border-amber-200/80 text-gray-700'
    }`}>
      {/* Header / Toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left select-none group"
      >
        <div className="flex items-center gap-2">
          <Server size={14} className={API_URL ? (isDark ? 'text-[#00af87]' : 'text-amber-600') : 'text-red-400'} />
          <span className="font-bold text-[10px] tracking-wide uppercase">
            Backend Connection
          </span>
          {API_URL ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Setup Needed
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400 group-hover:text-gray-200">
          <span>{isExpanded ? 'Hide' : 'Configure'}</span>
          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className={`px-3.5 pb-3.5 pt-1 border-t flex flex-col gap-2.5 ${
          isDark ? 'border-gray-800/80' : 'border-amber-200/60'
        }`}>
          <p className="text-[10px] leading-relaxed text-gray-400">
            Paste your Render backend URL below so this website connects to your live server:
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                required
                placeholder="https://gym-xxxx.onrender.com"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className={`w-full text-xs rounded-xl pl-8 pr-3 py-2 outline-none transition-all font-mono ${
                  isDark
                    ? 'bg-[#1f242b] border border-gray-700/80 text-white placeholder-gray-500 focus:border-[#00af87]'
                    : 'bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:border-[#ff9f29]'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={isTesting}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0 ${
                isDark
                  ? 'bg-gradient-to-r from-[#00af87] to-teal-600 hover:opacity-95 text-white disabled:opacity-50'
                  : 'bg-gradient-to-r from-[#ff9f29] to-orange-500 hover:opacity-95 text-white disabled:opacity-50'
              }`}
            >
              {isTesting ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} />
                  <span>Connect</span>
                </>
              )}
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className={`p-2 rounded-xl text-[10px] flex items-start gap-2 ${
              statusType === 'success'
                ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                : statusType === 'warning'
                ? 'bg-amber-950/40 border border-amber-800/50 text-amber-300'
                : 'bg-red-950/40 border border-red-800/50 text-red-300'
            }`}>
              {statusType === 'success' ? (
                <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400" />
              )}
              <span className="leading-tight">{statusMessage}</span>
            </div>
          )}

          {/* Quick Guide Toggle */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-[10px] text-gray-400 hover:text-gray-200 underline flex items-center gap-1"
            >
              <span>{showGuide ? 'Hide instructions' : 'Where do I find my Render URL?'}</span>
            </button>

            {showGuide && (
              <div className={`mt-2 p-2.5 rounded-xl border text-[10px] space-y-1 leading-relaxed ${
                isDark ? 'bg-[#1a1f26] border-gray-800 text-gray-300' : 'bg-white border-gray-200 text-gray-600'
              }`}>
                <p className="font-bold text-gray-200">How to find your Render URL:</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-0.5 text-gray-400">
                  <li>Log in to <a href="https://dashboard.render.com" target="_blank" rel="noreferrer" className="text-teal-400 underline">dashboard.render.com</a></li>
                  <li>Click on your Web Service (e.g. <em>gym</em>)</li>
                  <li>Copy the URL under the service name (ends in <code>.onrender.com</code>)</li>
                  <li>Paste it into the box above and click <strong>Connect</strong>!</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
