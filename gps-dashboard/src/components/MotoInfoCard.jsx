import React from 'react';

const MotoInfoCard = ({ vehicle }) => {
  const current = vehicle || {
    id: 'MT-2101',
    name: 'Yamaha YZF-R1',
    plate: 'XYZ-987',
    status: 'active',
    speed: 84,
    battery: 92,
    odometer: '14,352 km',
    temp: 82,
    fuel: 78,
  };

  const isMoving = current.status === 'active';

  return (
    <div className="flex flex-col gap-3 pointer-events-auto w-76 sm:w-84 max-w-[calc(100vw-2rem)] select-none">
      {/* 1. Vehicle Status Card */}
      <div className="bg-[#101726]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
        <h2 className="text-xs font-semibold text-[#94A3B8] mb-3">
          Vehicle Status
        </h2>

        <div className="flex items-center gap-3">
          {/* Motorcycle Image */}
          <div className="w-24 h-20 shrink-0 flex items-center justify-center relative">
            <img 
              src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=300" 
              alt={current.name} 
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]" 
            />
          </div>

          {/* Vehicle Stats List */}
          <div className="flex-1 min-w-0 text-xs leading-relaxed">
            <h3 className="font-bold text-white text-sm truncate leading-tight">
              {current.name}
            </h3>
            <p className="text-[#64748B] text-[11px] mb-1 font-mono">
              ({current.plate || current.id})
            </p>

            <div className="space-y-0.5 text-[#94A3B8] text-[11px]">
              <div className="flex items-center gap-1.5">
                <span>Status:</span>
                <span className="font-medium text-white">
                  {isMoving ? 'Moving' : current.status === 'stopped' ? 'Stopped' : 'Offline'}
                </span>
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isMoving ? 'bg-[#00E676] shadow-[0_0_6px_#00E676]' : 
                  current.status === 'stopped' ? 'bg-amber-400 shadow-[0_0_6px_#F59E0B]' : 
                  'bg-rose-500'
                }`}></span>
              </div>

              <div>
                <span>Speed: </span>
                <span className="font-medium text-white font-mono">{current.speed ?? 0} km/h</span>
              </div>

              <div>
                <span>Battery: </span>
                <span className="font-medium text-white font-mono">{current.battery}%</span>
              </div>

              <div>
                <span>Odometer: </span>
                <span className="font-medium text-white font-mono">{current.odometer || '14,352 km'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Live Data Card */}
      <div className="bg-[#101726]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
        <h3 className="text-xs font-semibold text-[#94A3B8] mb-2.5">
          Live Data
        </h3>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/[0.03] rounded-xl py-2 px-1 border border-white/5">
            <p className="text-[10px] text-[#64748B] mb-0.5 uppercase tracking-wider font-medium">Engine Temp</p>
            <p className="text-xs font-bold text-white font-mono">{current.temp ?? 82}°C</p>
          </div>

          <div className="bg-white/[0.03] rounded-xl py-2 px-1 border border-white/5">
            <p className="text-[10px] text-[#64748B] mb-0.5 uppercase tracking-wider font-medium">Fuel</p>
            <p className="text-xs font-bold text-white font-mono">{current.fuel ?? 78}%</p>
          </div>

          <div className="bg-white/[0.03] rounded-xl py-2 px-1 border border-white/5">
            <p className="text-[10px] text-[#64748B] mb-0.5 uppercase tracking-wider font-medium">Signal</p>
            <p className="text-xs font-bold text-[#00F0FF] font-mono">4G LTE</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotoInfoCard;