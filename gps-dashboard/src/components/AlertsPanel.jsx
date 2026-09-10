import React from 'react';
import { MoreHorizontal, X } from 'lucide-react';

const alerts = [
  {
    id: 1,
    type: 'danger',
    title: 'GeoFence Breach',
    desc: 'Home Zone, Exit',
    time: '12:48 PM',
    badgeColor: 'bg-[#FF3366]'
  },
  {
    id: 2,
    type: 'warning',
    title: 'Speeding Alert',
    desc: '95 km/h in 60 km/h zone',
    time: '12:45 PM',
    badgeColor: 'bg-[#FF5722]'
  },
  {
    id: 3,
    type: 'info',
    title: 'Route Started',
    desc: '',
    time: '11:32 AM',
    badgeColor: 'bg-[#00A3FF]'
  }
];

const AlertsPanel = ({ alerts: propAlerts, onSelectAlert, onClose }) => {
  const displayAlerts = (propAlerts && propAlerts.length > 0) ? propAlerts : [
    {
      id: 'ALT-101',
      severity: 'critical',
      title: 'GeoFence Breach',
      description: 'Home Zone, Exit',
      timestamp: '12:48 PM',
      badgeColor: 'bg-[#FF3366]'
    },
    {
      id: 'ALT-103',
      severity: 'warning',
      title: 'Speeding Alert',
      description: '95 km/h in 60 km/h zone',
      timestamp: '12:45 PM',
      badgeColor: 'bg-[#FF5722]'
    },
    {
      id: 'ALT-104',
      severity: 'info',
      title: 'Route Started',
      description: '',
      timestamp: '11:32 AM',
      badgeColor: 'bg-[#00A3FF]'
    }
  ];

  return (
    <div className="w-72 sm:w-80 max-w-[calc(100vw-2rem)] pointer-events-auto select-none">
      <div className="bg-[#101726]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-xs font-semibold text-white">
            Active Alerts
          </h2>

          <div className="flex items-center gap-1">
            <button 
              className="w-6 h-6 rounded flex items-center justify-center text-[#64748B] hover:text-white transition-colors"
              title="Options"
            >
              <MoreHorizontal size={16} />
            </button>
            {onClose && (
              <button 
                onClick={onClose}
                className="w-6 h-6 rounded flex items-center justify-center text-[#64748B] hover:text-white transition-colors md:hidden"
                title="Close"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex flex-col gap-2.5">
          {displayAlerts.map((alert) => {
            const badgeColor = alert.severity === 'critical' ? 'bg-[#FF3366]' : alert.severity === 'warning' ? 'bg-[#FF5722]' : 'bg-[#00A3FF]';
            return (
              <div 
                key={alert.id} 
                onClick={() => onSelectAlert && onSelectAlert(alert)}
                className="flex gap-2.5 items-start cursor-pointer group"
              >
                {/* Timeline Indicator Badge */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${badgeColor} shadow-[0_0_8px_currentColor]`}></span>
                </div>

                {/* Alert Content Box */}
                <div className="flex-1 bg-white/[0.03] border border-white/5 group-hover:border-cyan-400/40 group-hover:bg-cyan-500/[0.05] rounded-xl px-3 py-2 transition-all">
                  <span className="text-[10px] text-[#64748B] font-mono block mb-0.5">
                    {alert.timestamp || alert.time}
                  </span>
                  <h4 className="text-xs font-semibold text-white leading-snug group-hover:text-cyan-300 transition-colors">
                    {alert.title}
                  </h4>
                  {(alert.description || alert.desc) && (
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-1">
                      {alert.description || alert.desc}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;