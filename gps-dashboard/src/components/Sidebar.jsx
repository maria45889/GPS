import React from 'react';
import { LayoutGrid, Truck, Route, Bell, MapPin, Settings, User, X, Cpu } from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'fleet', label: 'Flota', icon: Truck },
  { id: 'routes', label: 'Rutas', icon: Route },
  { id: 'alerts', label: 'Alertas', icon: Bell },
  { id: 'geofences', label: 'GeoVallas', icon: MapPin },
  { id: 'settings', label: 'Config', icon: Settings },
];

const Sidebar = ({ activeTab = 'dashboard', onSelectTab, onClose }) => {
  return (
    <aside style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #0A0F1A 0%, #060912 100%)',
      borderRight: '1px solid rgba(0,230,118,0.15)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '24px 12px', userSelect: 'none',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background gradient accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at 50% 0%, rgba(0,230,118,0.03) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ padding: '0 8px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #00E676 0%, #00B4D8 50%, #0096C9 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,230,118,0.3), 0 0 40px rgba(0,180,216,0.15)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
              }} />
              <Cpu size={17} color="#0A0F1A" strokeWidth={2.5} style={{ position: 'relative', zIndex: 1 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', letterSpacing: '0.12em', textShadow: '0 0 20px rgba(0,230,118,0.3)' }}>
                RIDE<span style={{ color: '#00E676' }}>GUARD</span>
              </div>
              <div style={{ fontSize: 8, color: '#475569', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 2 }}>Fleet Intelligence</div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden"
              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#F87171'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94A3B8'; }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { if (onSelectTab) onSelectTab(item.id); if (onClose) onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 13px', borderRadius: 11,
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(0,230,118,0.12) 0%, rgba(0,180,216,0.08) 100%)' 
                    : 'transparent',
                  border: isActive 
                    ? '1px solid rgba(0,230,118,0.3)' 
                    : '1px solid transparent',
                  color: isActive ? '#00E676' : '#64748B',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', textAlign: 'left',
                  boxShadow: isActive 
                    ? '0 4px 20px rgba(0,230,118,0.15), 0 0 40px rgba(0,230,118,0.05)' 
                    : 'none',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { 
                  if (!isActive) { 
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; 
                    e.currentTarget.style.color = '#E2E8F0'; 
                    e.currentTarget.style.transform = 'translateX(4px)';
                  } 
                }}
                onMouseLeave={e => { 
                  if (!isActive) { 
                    e.currentTarget.style.background = 'transparent'; 
                    e.currentTarget.style.color = '#64748B';
                    e.currentTarget.style.transform = 'translateX(0)';
                  } 
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                    background: 'linear-gradient(180deg, #00E676 0%, #00B4D8 100%)',
                    borderRadius: '0 4px 4px 0',
                    boxShadow: '0 0 12px rgba(0,230,118,0.5)',
                  }} />
                )}
                <Icon size={17} style={{ strokeWidth: isActive ? 2.5 : 2 }} />
                <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                {isActive && (
                  <span style={{ 
                    marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', 
                    background: '#00E676', boxShadow: '0 0 10px #00E676, 0 0 20px rgba(0,230,118,0.5)',
                    animation: 'pulse 2s infinite',
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div style={{ padding: '12px 4px', borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative', zIndex: 1 }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, 
          cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent',
        }}
          onMouseEnter={e => { 
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; 
            e.currentTarget.style.borderColor = 'rgba(0,230,118,0.2)';
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.background = 'transparent'; 
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0,230,118,0.15) 0%, rgba(0,180,216,0.1) 100%)', 
            border: '1px solid rgba(0,230,118,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E676',
            boxShadow: '0 0 15px rgba(0,230,118,0.2)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 70%)',
            }} />
            <User size={16} style={{ position: 'relative', zIndex: 1 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>Alex R.</div>
            <div style={{ fontSize: 9, color: '#475569', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 1 }}>ADMIN</div>
          </div>
          <div style={{ 
            width: 7, height: 7, borderRadius: '50%', background: '#00E676', 
            boxShadow: '0 0 12px #00E676, 0 0 24px rgba(0,230,118,0.4)',
            animation: 'pulse 2s infinite',
          }} />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
