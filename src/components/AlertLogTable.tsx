import React from 'react';
import { AlertLogItem } from '../types';
import { Download, Trash2, FileSpreadsheet } from 'lucide-react';

interface AlertLogTableProps {
  logs: AlertLogItem[];
  onClearLogs: () => void;
}

export const AlertLogTable: React.FC<AlertLogTableProps> = ({ logs, onClearLogs }) => {
  // Export as CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      'Event ID',
      'Time of Day',
      'Date',
      'Alert State',
      'Trigger Reason',
      'Active Signals',
      'EAR',
      'MAR',
      'Head Pitch (deg)',
      'Duration (sec)',
    ];

    const rows = logs.map((log, idx) => [
      `#${logs.length - idx}`,
      `"${log.timestamp}"`,
      `"${log.date}"`,
      `"${log.alertState}"`,
      `"${log.reason.replace(/"/g, '""')}"`,
      `"${log.activeSignals.join(', ')}"`,
      log.ear,
      log.mar,
      log.headPitch,
      log.durationSeconds,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `incident_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export as JSON
  const handleExportJSON = () => {
    if (logs.length === 0) return;
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `incident_log_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      id="alert-logs-section"
      className="bg-zinc-900/40 border border-zinc-800 p-4 flex flex-col font-mono"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
        <div>
          <h3 className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
            Alert Incident Log
          </h3>
          <span className="text-[11px] text-zinc-400">
            {logs.length} {logs.length === 1 ? 'EVENT' : 'EVENTS RECORDED'}
          </span>
        </div>

        {/* Actions */}
        {logs.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              id="btn-export-csv"
              type="button"
              onClick={handleExportCSV}
              title="Export CSV Log"
              className="flex items-center gap-1 h-6 px-2 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-3 w-3 text-emerald-500" />
              CSV
            </button>

            <button
              id="btn-export-json"
              type="button"
              onClick={handleExportJSON}
              title="Export JSON Log"
              className="flex items-center gap-1 h-6 px-2 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Download className="h-3 w-3 text-blue-400" />
              JSON
            </button>

            <button
              id="btn-clear-logs"
              type="button"
              onClick={onClearLogs}
              title="Clear Alert Logs"
              className="flex items-center gap-1 h-6 px-2 border border-red-900/60 bg-red-950/20 hover:bg-red-900/40 text-red-400 text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table Content or Empty State */}
      {logs.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 text-xs">
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
            STATUS: STANDBY
          </div>
          No fatigue incidents recorded in current session.
        </div>
      ) : (
        <div className="mt-2 overflow-x-auto max-h-64">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800 text-[10px]">
                <th className="pb-1.5 font-normal uppercase tracking-wider">Timestamp</th>
                <th className="pb-1.5 font-normal uppercase tracking-wider">Event Type</th>
                <th className="pb-1.5 font-normal uppercase tracking-wider">EAR / MAR / Pitch</th>
                <th className="pb-1.5 font-normal uppercase tracking-wider text-right">Action Taken</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/60 transition-colors">
                  <td className="py-2 font-mono text-zinc-300">{log.timestamp}</td>
                  <td className={`py-2 font-semibold ${log.alertState === 'Drowsy' ? 'text-red-500' : 'text-yellow-500'}`}>
                    {log.reason}
                  </td>
                  <td className="py-2 font-mono text-zinc-400">
                    E:{log.ear.toFixed(2)} | M:{log.mar.toFixed(2)} | P:{log.headPitch}°
                  </td>
                  <td className="py-2 text-right uppercase text-[10px] text-zinc-500">
                    {log.alertState === 'Drowsy' ? 'AUDIO ALARM' : 'LOGGED'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
