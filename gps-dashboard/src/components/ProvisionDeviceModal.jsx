import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Loader, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const ProvisionDeviceModal = ({ onClose }) => {
  const [activationCode, setActivationCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateCode();
  }, []);

  const generateCode = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create a random code, e.g., "MOVIL-12345"
      const code = `MOVIL-${Math.floor(10000 + Math.random() * 90000)}`;
      
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('user_id', (await supabase.auth.getSession()).data.session.user.id).single();
      
      const { error: insertError } = await supabase.from('device_activation_codes').insert({
        code: code,
        organization_id: profile.organization_id,
        label: 'Nuevo Móvil'
      });

      if (insertError) throw insertError;
      setActivationCode(code);
    } catch (err) {
      setError(err.message || 'Error al generar código');
    } finally {
      setLoading(false);
    }
  };

  const link = `gpstracker://activate?code=${activationCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-[#2b4c59] bg-[#0c1a20] p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-[#8b9ba1] hover:text-white transition-colors">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-6 border-b border-[#2b4c59] pb-4">
          <div className="rounded-full bg-[#102b38] p-2 text-[#67e8f9]">
            <Smartphone size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Vincular Móvil</h2>
            <p className="text-xs text-[#8b9ba1]">Escanea el código para activar la app</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader size={30} className="animate-spin text-[#67e8f9]" />
            <p className="text-sm text-[#8b9ba1]">Generando pase de seguridad...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-sm">
            {error}
            <button onClick={generateCode} className="block mt-2 text-[#67e8f9] underline">Reintentar</button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-white p-3 rounded-xl mb-6 shadow-[0_0_20px_rgba(103,232,249,0.2)]">
              <QRCodeSVG value={link} size={200} level="H" includeMargin={false} />
            </div>
            
            <p className="text-center text-sm text-[#edf5ef] mb-4">
              Abre la cámara del celular que quieres rastrear y apunta a este código QR.
            </p>

            <div className="w-full bg-[#102b38] border border-[#1f4d59] rounded-lg p-3 flex items-center justify-between gap-2">
              <code className="text-xs text-[#67e8f9] truncate flex-1">{link}</code>
              <button onClick={copyLink} className="text-[#8b9ba1] hover:text-white shrink-0" title="Copiar enlace">
                {copied ? <Check size={16} className="text-[#c8ef9b]" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
