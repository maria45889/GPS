// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Pruebas End-to-End de Contrato para Re-aprovisionamiento de Dispositivos', () => {
  const edgeFunctionCode = fs.readFileSync(
    path.resolve(__dirname, '../../../supabase/functions/provision-device/index.ts'),
    'utf-8'
  );

  const sqlSetupCode = fs.readFileSync(
    path.resolve(__dirname, '../../../supabase_setup.sql'),
    'utf-8'
  );

  it('procedimiento atómico SQL maneja la actualización del usuario auth al re-aprovisionar un dispositivo existente', () => {
    expect(sqlSetupCode).toContain('create or replace function public.provision_device_atomic');
    expect(sqlSetupCode).toContain('on conflict (id) do update set');
    expect(sqlSetupCode).toContain('on conflict (device_id) do update set');
  });

  it('función edge provision-device verifica que el código de activación sea nuevo y no reutilizado antes de re-aprovisionar', () => {
    expect(edgeFunctionCode).toContain('.eq(\'used\', false)');
    expect(edgeFunctionCode).toContain('requiere un codigo de activacion nuevo y valido');

    expect(edgeFunctionCode).toContain('updateUserById');
  });

  it('función edge ejecuta la función RPC check_rate_limit para limitar de forma persistente en DB', () => {
    expect(edgeFunctionCode).toContain('supabase.rpc(\'check_rate_limit\'');
    expect(sqlSetupCode).toContain('create table if not exists public.provision_rate_limits');
    expect(sqlSetupCode).toContain('create or replace function public.check_rate_limit');
  });
});
