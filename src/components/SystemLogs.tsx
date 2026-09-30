import React, { useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, CheckCircle, Info, Flame, Trash2 } from 'lucide-react';
import { SystemLog } from '../types';

interface SystemLogsProps {
  logs: SystemLog[];
  onClearLogs: () => void;
}

export default function SystemLogs({ logs, onClearLogs }: SystemLogsProps) {
  const [filter, setFilter] = React.useState<'all' | 'critical' | 'warning' | 'info' | 'success'>('all');
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const getLogIcon = (type: SystemLog['type']) => {
    switch (type) {
      case 'critical':
        return <Flame className="w-4 h-4 text-rose-500 animate-pulse" />;
      case 'warning':
        return <ShieldAlert className="w-4 h-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-cyan-500" />;
    }
  };

  const getLogStyle = (type: SystemLog['type']) => {
    switch (type) {
      case 'critical':
        return 'text-rose-400 bg-rose-950/20 border-rose-950/40';
      case 'warning':
        return 'text-amber-400 bg-amber-950/20 border-amber-950/40';
      case 'success':
        return 'text-emerald-400 bg-emerald-950/20 border-emerald-950/40';
      case 'info':
      default:
        return 'text-cyan-400 bg-cyan-950/20 border-cyan-950/40';
    }
  };

  return (
    <div id="system_logs_panel" className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-rose-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-wider uppercase">Active Telemetry Terminal</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Live emergency dispatch and regulatory logs</p>
          </div>
        </div>
        
        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button 
            id="filter_all"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded transition border ${filter === 'all' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            ALL
          </button>
          <button 
            id="filter_critical"
            onClick={() => setFilter('critical')}
            className={`px-2.5 py-1 rounded transition border ${filter === 'critical' ? 'bg-rose-950/40 border-rose-900/60 text-rose-400 font-bold' : 'border-transparent text-slate-400 hover:text-rose-400'}`}
          >
            CRITICAL
          </button>
          <button 
            id="filter_warning"
            onClick={() => setFilter('warning')}
            className={`px-2.5 py-1 rounded transition border ${filter === 'warning' ? 'bg-amber-950/40 border-amber-900/60 text-amber-400 font-bold' : 'border-transparent text-slate-400 hover:text-amber-400'}`}
          >
            WARNING
          </button>
          <button 
            id="filter_success"
            onClick={() => setFilter('success')}
            className={`px-2.5 py-1 rounded transition border ${filter === 'success' ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400 font-bold' : 'border-transparent text-slate-400 hover:text-emerald-400'}`}
          >
            SUCCESS
          </button>
          
          <div className="w-[1px] h-4 bg-slate-800 mx-1 hidden sm:block" />
          
          <button
            id="clear_logs_btn"
            onClick={onClearLogs}
            className="p-1 text-slate-500 hover:text-rose-400 transition ml-auto"
            title="Clear Logs Console"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Stream Panel */}
      <div className="h-64 overflow-y-auto pr-2 space-y-2 text-xs leading-relaxed border border-slate-900 bg-black/40 rounded-lg p-3 select-text">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 font-sans gap-2">
            <Terminal className="w-8 h-8 text-slate-800" />
            <span>No console events match the current severity filter.</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className={`p-2 rounded border transition-all duration-300 ${getLogStyle(log.type)}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 mt-0.5">{getLogIcon(log.type)}</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-slate-500 font-semibold">
                    <span>[{log.timestamp}]</span>
                    {log.facilityId && <span className="text-slate-400">{log.facilityId}</span>}
                    {log.metric && <span className="bg-slate-900 border border-slate-800 px-1 py-0.25 text-[10px] text-slate-400 rounded uppercase">{log.metric}</span>}
                    {log.value && <span className="text-rose-400 font-bold">{log.value}</span>}
                  </div>
                  <div className="mt-1 text-slate-300 font-sans font-medium whitespace-pre-wrap leading-relaxed">{log.message}</div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* Terminal status line */}
      <div className="flex items-center justify-between text-[10px] text-slate-600 mt-3 border-t border-slate-900 pt-2 font-sans">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Secured Server Port: 3000 | Ingress routing online</span>
        </div>
        <span>CN-HEALTH-CORE v3.14</span>
      </div>
    </div>
  );
}
