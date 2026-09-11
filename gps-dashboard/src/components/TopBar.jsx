import React from 'react';
import { Search, Bell, User, Menu, Cpu } from 'lucide-react';

const TopBar = ({ onMenuClick, onToggleAlerts, alertCount = 1 }) => {
  return (
    <header style={{
      width: '100%', height: 60, padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'linear-gradient(180deg, rgba(10,15,26,0.95) 0%, rgba(6,9,18,0.9) 100%)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(0,230,118,0.15)',
      flexShrink: 0, zIndex: 20,
      position: 'relative',
    }}>
      {/* Subtle gradient accent at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,230,118,0.3) 50%, transparent 100%)',
      }} />

      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onMenuClick}
          style={{
            display: 'none', width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(0,230,118,0.1) 0%, rgba(0,180,216,0.08) 100%)', 
            border: '1px solid rgba(0,230,118,0.25)',
            color: '#00E676', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'all 0.25s', boxShadow: '0 0 15px rgba(0,230,118,0.1)',
          }}
          className="md:hidden"
          aria-label="Toggle menu"
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 25px rgba(0,230,118,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,230,118,0.1)'; }}
        >
          <Menu size={18} strokeWidth={2.5} />
        </button>

        {/* Brand logo */}
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
            <Cpu size={16} color="#0A0F1A" strokeWidth={2.5} style={{ position: 'relative', zIndex: 1 }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '0.15em', color: '#ffffff', textShadow: '0 0 20px rgba(0,230,118,0.2)' }}>
            RIDE<span style={{ color: '#00E676' }}>GUARD</span>
          </span>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search style={{ position: 'absolute', left: 12, color: '#64748B', zIndex: 1 }} size={15} strokeWidth={2} />
          <input
            type="text"
            placeholder="Buscar vehículo, ruta..."
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 11, paddingLeft: 38, paddingRight: 16,
              paddingTop: 8, paddingBottom: 8,
              fontSize: 13, color: '#ffffff', outline: 'none',
              width: 220, transition: 'all 0.25s',
              fontWeight: 400,
            }}
            onFocus={e => { 
              e.target.style.borderColor = 'rgba(0,230,118,0.4)'; 
              e.target.style.background = 'rgba(255,255,255,0.08)';
              e.target.style.boxShadow = '0 0 20px rgba(0,230,118,0.15)';
            }}
            onBlur={e => { 
              e.target.style.borderColor = 'rgba(255,255,255,0.1)'; 
              e.target.style.background = 'rgba(255,255,255,0.05)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Live indicator */}
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 24, 
          background: 'linear-gradient(135deg, rgba(0,230,118,0.12) 0%, rgba(0,180,216,0.08) 100%)', 
          border: '1px solid rgba(0,230,118,0.25)',
          boxShadow: '0 0 20px rgba(0,230,118,0.15)',
        }}>
          <span style={{ 
            width: 7, height: 7, borderRadius: '50%', background: '#00E676', 
            boxShadow: '0 0 10px #00E676, 0 0 20px rgba(0,230,118,0.5)', 
            animation: 'pulse 2s infinite', display: 'inline-block' 
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#00E676', letterSpacing: '0.1em' }}>EN VIVO</span>
        </div>

        <button
          onClick={onToggleAlerts}
          style={{
            position: 'relative', width: 38, height: 38, borderRadius: 11,
            background: alertCount > 0 
              ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.1) 100%)' 
              : 'rgba(255,255,255,0.05)',
            border: alertCount > 0 
              ? '1px solid rgba(239,68,68,0.35)' 
              : '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: alertCount > 0 ? '#F87171' : '#94A3B8', cursor: 'pointer',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { 
            e.currentTarget.style.transform = 'scale(1.05)'; 
            if (alertCount > 0) {
              e.currentTarget.style.boxShadow = '0 0 25px rgba(239,68,68,0.3)';
            } else {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.transform = 'scale(1)'; 
            e.currentTarget.style.boxShadow = 'none';
            if (alertCount === 0) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }
          }}
        >
          <Bell size={17} strokeWidth={2} />
          {alertCount > 0 && (
            <span style={{
              position: 'absolute', top: 7, right: 7,
              width: 8, height: 8, borderRadius: '50%',
              background: '#EF4444', boxShadow: '0 0 12px #EF4444, 0 0 24px rgba(239,68,68,0.4)',
              animation: 'pulse 2s infinite',
            }} />
          )}
        </button>

        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: 'linear-gradient(135deg, rgba(0,230,118,0.12) 0%, rgba(0,180,216,0.08) 100%)',
          border: '1px solid rgba(0,230,118,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#00E676', cursor: 'pointer',
          transition: 'all 0.25s',
          boxShadow: '0 0 20px rgba(0,230,118,0.15)',
        }}
          onMouseEnter={e => { 
            e.currentTarget.style.transform = 'scale(1.05)'; 
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0,230,118,0.25)';
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.transform = 'scale(1)'; 
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,230,118,0.15)';
          }}
        >
          <User size={17} strokeWidth={2} />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
