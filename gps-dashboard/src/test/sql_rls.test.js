// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SQL & RLS Security Contracts in supabase_setup.sql', () => {
  const sqlContent = fs.readFileSync(
    path.resolve(__dirname, '../../../supabase_setup.sql'),
    'utf-8'
  );

  it('incluye columna organization_id en gps_locations y vehicle_commands', () => {
    expect(sqlContent).toContain('alter table public.gps_locations add column if not exists organization_id uuid');
    expect(sqlContent).toContain('alter table public.vehicle_commands add column if not exists organization_id uuid');
  });

  it('configura la vista latest_gps_locations con security_invoker = true para aplicar RLS', () => {
    expect(sqlContent).toContain('create or replace view public.latest_gps_locations');
    expect(sqlContent).toContain('with (security_invoker = true)');
  });

  it('garantiza que handle_new_user asigne rol viewer por defecto', () => {
    expect(sqlContent).toContain('create or replace function public.handle_new_user()');
    expect(sqlContent).toContain("'viewer'");
  });

  it('define la tabla device_activation_codes con políticas RLS para administradores', () => {
    expect(sqlContent).toContain('create table if not exists public.device_activation_codes');
    expect(sqlContent).toContain('create policy "device_activation_codes_admin_all"');
  });

  it('registra triggers de atribución automática de organización para ubicaciones y comandos', () => {
    expect(sqlContent).toContain('create trigger gps_locations_set_org');
    expect(sqlContent).toContain('create trigger vehicle_commands_set_org');
  });

  it('define el procedimiento atómico de aprovisionamiento provision_device_atomic con FOR UPDATE', () => {
    expect(sqlContent).toContain('create or replace function public.provision_device_atomic');
    expect(sqlContent).toContain('for update');
  });

  it('revoca la ejecución pública de provision_device_atomic y la otorga a service_role', () => {
    expect(sqlContent).toContain('revoke execute on function public.provision_device_atomic(text, text, uuid) from public, anon, authenticated;');
    expect(sqlContent).toContain('grant execute on function public.provision_device_atomic(text, text, uuid) to service_role;');
  });

  it('restringe la inserción de comandos a vehículos y dispositivos pertenecientes a la organización del operador', () => {
    expect(sqlContent).toContain('organization_id = public.current_user_org_id()');
    expect(sqlContent).toContain('v.device_id = vehicle_commands.device_id');
  });

  it('define un índice compuesto en gps_locations para consultas multitenant', () => {
    expect(sqlContent).toContain('create index if not exists gps_locations_org_device_ts_idx');
  });

  it('restringe ack_vehicle_command al dispositivo autenticado y define admin_cancel_vehicle_command para operadores', () => {
    expect(sqlContent).toContain('device_id = public.current_device_id()');
    expect(sqlContent).toContain('create or replace function public.admin_cancel_vehicle_command');
    expect(sqlContent).toContain('organization_id = public.current_user_org_id()');
  });

  it('define el trigger protect_vehicle_structural_fields para prevenir la inmutabilidad de device_id sin recursión RLS', () => {
    expect(sqlContent).toContain('create or replace function public.protect_vehicle_structural_fields()');
    expect(sqlContent).toContain('before update on public.vehicles');
  });

  it('restringe la política de escritura en device_registry exclusivamente a administradores', () => {
    expect(sqlContent).toContain('create policy "device_registry_admin_write"');
    expect(sqlContent).toContain('public.is_admin()');
  });

  it('valida las filas afectadas en update_vehicle_status para lanzar excepción si la actualización no afectó registros', () => {
    expect(sqlContent).toContain('get diagnostics updated_count = row_count;');
    expect(sqlContent).toContain('if updated_count = 0 then');
  });

  it('sobrescribe obligatoriamente organization_id en set_gps_location_org_id y valida la política gps_locations_device_insert', () => {
    expect(sqlContent).toContain('create or replace function public.set_gps_location_org_id()');
    expect(sqlContent).toContain('select organization_id into new.organization_id');
    expect(sqlContent).toContain('create policy "gps_locations_device_insert"');
  });

  it('protege la inmutabilidad de organization_id en public.devices mediante trigger sin subconsultas autoreferenciales en RLS', () => {
    expect(sqlContent).toContain('create or replace function public.protect_device_structural_fields()');
    expect(sqlContent).toContain('before update on public.devices');
    expect(sqlContent).toContain('create policy "devices_device_update"');
    expect(sqlContent).not.toContain('organization_id is not distinct from (select d.organization_id from public.devices d');
  });

  it('sincroniza automáticamente el estado del vehículo en public.vehicles cuando un comando pasa a done y exige updated_count > 0', () => {
    expect(sqlContent).toContain('create or replace function public.sync_vehicle_status_on_command_done()');
    expect(sqlContent).toContain('after update on public.vehicle_commands');
    expect(sqlContent).toContain("when NEW.command = 'activate' then 'active'");
    expect(sqlContent).toContain("when NEW.command = 'immobilize' then 'immobilized'");
    expect(sqlContent).toContain("when NEW.command = 'stop' then 'stopped'");
    expect(sqlContent).toContain('get diagnostics updated_count = row_count;');
    expect(sqlContent).toContain("raise exception 'No se pudo actualizar el estado del vehiculo");
  });

  it('evita subconsultas a public.devices en la política gps_locations_authenticated_read para prevenir recursión RLS', () => {
    expect(sqlContent).toContain('create policy "gps_locations_authenticated_read"');
    expect(sqlContent).toContain('device_id = public.current_device_id()');
    expect(sqlContent).not.toContain('select 1 from public.devices d');
  });

  it('incluye el estado failed en la cláusula WITH CHECK de la política vehicle_commands_device_ack', () => {
    expect(sqlContent).toContain('create policy "vehicle_commands_device_ack"');
    expect(sqlContent).toContain("with check (device_id = public.current_device_id() and status in ('pending', 'received', 'done', 'failed'));");
  });

  it('sobrescribe obligatoriamente la organización del dispositivo en set_gps_location_org_id y exige un dispositivo registrado', () => {
    expect(sqlContent).toContain('create or replace function public.set_gps_location_org_id()');
    expect(sqlContent).toContain('new.organization_id := target_org_id;');
    expect(sqlContent).toContain("raise exception 'El dispositivo % no esta registrado o asignado a una organizacion'");
  });

  it('registra el trigger set_device_insert_org_id para prevenir la inserción de dispositivos con organización arbitraria', () => {
    expect(sqlContent).toContain('create or replace function public.set_device_insert_org_id()');
    expect(sqlContent).toContain('create trigger trg_set_device_insert_org_id');
    expect(sqlContent).toContain('before insert on public.devices');
  });

  it('define la función RPC clean_stale_vehicle_commands exclusiva de service_role con validación de timeout positivo', () => {
    expect(sqlContent).toContain('create or replace function public.clean_stale_vehicle_commands');
    expect(sqlContent).toContain("p_timeout_minutes <= 0");
    expect(sqlContent).toContain('revoke execute on function public.clean_stale_vehicle_commands(int) from public, anon, authenticated;');
    expect(sqlContent).toContain('grant execute on function public.clean_stale_vehicle_commands(int) to service_role;');
  });

  it('define la función RPC update_device_telemetry y protege la estructura del dispositivo', () => {
    expect(sqlContent).toContain('create or replace function public.update_device_telemetry');
    expect(sqlContent).toContain('create or replace function public.protect_device_structural_fields()');
    expect(sqlContent).toContain('NEW.auth_user_id is distinct from OLD.auth_user_id');
  });
});
