// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Edge Function provision-device contract', () => {
  const edgeFunctionContent = fs.readFileSync(
    path.resolve(__dirname, '../../../supabase/functions/provision-device/index.ts'),
    'utf-8'
  );

  it('valida el secreto de aprovisionamiento mediante x-provision-secret header', () => {
    expect(edgeFunctionContent).toContain("Deno.env.get('PROVISION_SECRET')");
    expect(edgeFunctionContent).toContain("req.headers.get('x-provision-secret')");
  });

  it('ejecuta el procedimiento atómico provision_device_atomic para evitar condiciones de carrera', () => {
    expect(edgeFunctionContent).toContain("supabase.rpc('provision_device_atomic'");
  });

  it('incluye cabeceras CORS completas en todas las respuestas HTTP', () => {
    expect(edgeFunctionContent).toContain("Access-Control-Allow-Origin': '*'");
    expect(edgeFunctionContent).toContain("Access-Control-Allow-Headers'");
  });

  it('realiza limpieza eliminando el usuario Auth si el upsert en devices falla', () => {
    expect(edgeFunctionContent).toContain("supabase.auth.admin.deleteUser");
  });

  it('exige un código de activación nuevo y válido para re-aprovisionar un dispositivo ya registrado', () => {
    expect(edgeFunctionContent).toContain('dispositivo ya registrado. requiere un codigo de activacion nuevo y valido');
    expect(edgeFunctionContent).toContain("from('device_activation_codes')");
  });

  it('aplica limitación de tasa (rate limit) devolviendo error 429 ante solicitudes excesivas', () => {
    expect(edgeFunctionContent).toContain('demasiados intentos de aprovisionamiento. intente mas tarde');
    expect(edgeFunctionContent).toContain('status = 200');
    expect(edgeFunctionContent).toContain('checkRateLimit');
  });
});

