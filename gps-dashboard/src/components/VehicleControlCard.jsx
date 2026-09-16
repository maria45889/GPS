import React, { useState } from 'react';
import { Ban, CircleStop, Power, Trash2 } from 'lucide-react';

export const VehicleControlCard = ({ vehicle, onControl, onDelete, isBusy = false }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!vehicle) return null;

  return (
    <div className="vehicle-control-card">
      <div className="vehicle-control-heading">
        <div>
          <span className="vehicle-control-eyebrow">Control del vehículo</span>
          <strong>{vehicle.name}</strong>
          <small>{vehicle.plate || vehicle.id}</small>
        </div>
        <span className={`vehicle-control-state ${vehicle.status}`}>
          {vehicle.controlState === 'immobilized' ? 'Inmovilizado' : vehicle.status === 'active' ? 'Activo' : vehicle.status === 'stopped' ? 'Detenido' : 'Offline'}
        </span>
      </div>

      <div className="vehicle-control-actions">
        <button type="button" disabled={isBusy} onClick={() => onControl('activate')}>
          <Power size={15} /> Activar
        </button>
        <button type="button" disabled={isBusy} onClick={() => onControl('stop')}>
          <CircleStop size={15} /> Detener
        </button>
        <button type="button" disabled={isBusy} onClick={() => onControl('immobilize')} className="vehicle-control-warning">
          <Ban size={15} /> Inmovilizar
        </button>
      </div>

      <p className="mt-2 text-[9px] leading-snug text-[#89a9b5]">
        Los comandos se encolan para el dispositivo; el corte físico de la ignición requiere un módulo GPS/relé instalado en la moto.
      </p>

      {!confirmDelete ? (
        <button type="button" disabled={isBusy} onClick={() => setConfirmDelete(true)} className="vehicle-delete-button">
          <Trash2 size={14} /> Eliminar vehículo
        </button>
      ) : (
        <div className="vehicle-delete-confirmation">
          <span>Se quitará del panel y de la flota.</span>
          <div>
            <button type="button" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            <button type="button" disabled={isBusy} onClick={() => onDelete(vehicle.id)} className="confirm-delete">Confirmar eliminación</button>
          </div>
        </div>
      )}
    </div>
  );
};
