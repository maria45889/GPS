import React, { useState } from 'react';
import { Ban, CircleStop, Power, Trash2, Edit3 } from 'lucide-react';

export const VehicleControlCard = ({ vehicle, onControl, onDelete, onEdit, isBusy = false }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!vehicle) return null;

  const isPending = isBusy || vehicle.controlState === 'command_pending' || vehicle.status === 'command_pending';
  const stateClass = isPending
    ? 'command_pending'
    : vehicle.controlState === 'immobilized' || vehicle.status === 'immobilized'
      ? 'immobilized'
      : vehicle.status;
  const stateLabel = isPending
    ? 'Enviando comando...'
    : vehicle.controlState === 'immobilized' || vehicle.status === 'immobilized'
      ? 'Inmovilizado'
      : vehicle.status === 'active'
        ? 'Activo'
        : vehicle.status === 'stopped'
          ? 'Detenido'
          : 'Offline';

  return (
    <div className="vehicle-control-card">
      <div className="vehicle-control-heading">
        <div>
          <span className="vehicle-control-eyebrow">Control del vehículo</span>
          <strong>{vehicle.name}</strong>
          <small>{vehicle.plate || vehicle.id}</small>
        </div>
        <span className={`vehicle-control-state ${stateClass}`}>
          {stateLabel}
        </span>
      </div>

      {onControl && (
        <>
          <div className="vehicle-control-actions">
            <button type="button" disabled={isPending} onClick={() => onControl('activate')}>
              <Power size={15} /> Activar
            </button>
            <button type="button" disabled={isPending} onClick={() => onControl('stop')}>
              <CircleStop size={15} /> Detener
            </button>
            <button type="button" disabled={isPending} onClick={() => onControl('immobilize')} className="vehicle-control-warning">
              <Ban size={15} /> Inmovilizar
            </button>
          </div>

          <p className="mt-2 text-[9px] leading-snug text-[#89a9b5]">
            Los comandos se encolan para el dispositivo; el corte físico de la ignición requiere un módulo GPS/relé instalado en la moto.
          </p>
        </>
      )}

      {!confirmDelete ? (
        <div className="flex flex-col gap-2">
          {onEdit && (
            <button type="button" disabled={isBusy} onClick={() => onEdit(vehicle)} className="vehicle-action-button text-[#b8f36b] border-[#1f4d59] border hover:bg-[#b8f36b]/10 bg-transparent flex items-center justify-center gap-2 py-2 rounded-md text-[11px] font-bold">
              <Edit3 size={14} /> Editar detalles
            </button>
          )}
          <button type="button" disabled={isBusy} onClick={() => setConfirmDelete(true)} className="vehicle-delete-button">
            <Trash2 size={14} /> Eliminar {vehicle.plate ? 'vehículo' : 'dispositivo'}
          </button>
        </div>
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
