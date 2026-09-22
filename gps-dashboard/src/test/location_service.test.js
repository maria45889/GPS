// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Android LocationService java contracts', () => {
  const javaContent = fs.readFileSync(
    path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/LocationService.java'),
    'utf-8'
  );

  it('ejecuta la transición completa de comandos mediante el RPC ack_vehicle_command (received y resultado final)', () => {
    expect(javaContent).toContain('ackCommandStatus(token, timestamp, cmdId, "received");');
    expect(javaContent).toContain('ackCommandStatus(token, timestamp, cmdId, finalStatus);');
    expect(javaContent).toContain('/rest/v1/rpc/ack_vehicle_command');
  });

  it('implementa límite máximo de cola offline mediante LocationDao', () => {
    expect(javaContent).toContain('LocationDao');
    expect(javaContent).toContain('insertWithLimit');
  });

  it('persiste y recupera la cola offline mediante Room y AppDatabase', () => {
    expect(javaContent).toContain('AppDatabase');
  });

  it('ejecuta upsertDeviceDirectly de forma sincrónica en el worker thread antes de enviar la ubicación', () => {
    expect(javaContent).toContain('upsertDeviceDirectly(token, deviceId, timestamp');
  });

  it('implementa registro de comandos procesados para garantizar idempotencia en relé/hardware', () => {
    expect(javaContent).toContain('processedCommandIds');
  });

  it('registra receptor para resultado del relé físico ACTION_VEHICLE_CONTROL_RESULT', () => {
    expect(javaContent).toContain('ACTION_VEHICLE_CONTROL_RESULT');
    expect(javaContent).toContain('hardwareResultReceiver');
  });

  it('persiste los comandos procesados en SharedPreferences para mantener idempotencia tras reinicios', () => {
    expect(javaContent).toContain('persistProcessedCommandIds()');
    expect(javaContent).toContain('loadProcessedCommandIds()');
  });

  it('evita ejecuciones concurrentes duplicadas mediante la guardia activeExecutingCommandIds', () => {
    expect(javaContent).toContain('activeExecutingCommandIds');
    expect(javaContent).toContain('activeExecutingCommandIds.add(cmdId);');
    expect(javaContent).toContain('activeExecutingCommandIds.remove(cmdId);');
  });

  it('aplica ventana deslizante máxima de 1000 elementos en persistProcessedCommandIds con un Set ordenado (LinkedHashSet)', () => {
    expect(javaContent).toContain('LinkedHashSet');
    expect(javaContent).toContain('MAX_PROCESSED_COMMAND_IDS_SIZE = 1000;');
    expect(javaContent).toContain('subList');
  });

  it('valida la whitelist de comandos y rutas dinámicas en HardwareRelayReceiver.java', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/HardwareRelayReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('ALLOWED_COMMANDS');
    expect(receiverContent).toContain('GPIO_RELAY_CANDIDATE_PATHS');
  });

  it('trata HTTP 409 Conflict como resuelto en la cola de deduplicación offline', () => {
    expect(javaContent).toContain('responseCode == 409');
  });

  it('registra executedHardwareCommandIds para reintentar el acuse RPC sin re-ejecutar la acción física del relé', () => {
    expect(javaContent).toContain('executedHardwareCommandIds');
    expect(javaContent).toContain('persistExecutedHardwareCommandIds');
    expect(javaContent).toContain('loadExecutedHardwareCommandIds');
  });

  it('aísla las claves de SharedPreferences según el device_id mediante getDeviceIdPrefsKey', () => {
    expect(javaContent).toContain('getDeviceIdPrefsKey');
  });

  it('utiliza location.getTime() para capturar la marca de tiempo de fijación satelital real', () => {
    expect(javaContent).toContain('location.getTime()');
  });

  it('separa los hilos ejecutores en locationExecutor y commandExecutor', () => {
    expect(javaContent).toContain('locationExecutor');
    expect(javaContent).toContain('commandExecutor');
  });

  it('valida que SecurePreferences use AndroidKeyStore para cifrar credenciales en DeviceAuthManager.java', () => {
    const authManagerContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/DeviceAuthManager.java'),
      'utf-8'
    );
    expect(authManagerContent).toContain('SecurePreferences');

    const securePrefsContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/SecurePreferences.java'),
      'utf-8'
    );
    expect(securePrefsContent).toContain('AndroidKeyStore');
    expect(securePrefsContent).toContain('AES/GCM/NoPadding');
  });

  it('registra el receptor de reinicio BootReceiver para autoinicio tras reboot', () => {
    const bootContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/BootReceiver.java'),
      'utf-8'
    );
    expect(bootContent).toContain('BOOT_COMPLETED');
    expect(bootContent).toContain('LocationService.class');

    const manifestContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml'),
      'utf-8'
    );
    expect(manifestContent).toContain('BootReceiver');
    expect(manifestContent).toContain('RECEIVE_BOOT_COMPLETED');
    expect(manifestContent).toContain('ACCESS_BACKGROUND_LOCATION');
    expect(manifestContent).toContain('REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
  });

  it('no permite fallback en texto plano si falla AndroidKeyStore en SecurePreferences.java', () => {
    const securePrefsContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/SecurePreferences.java'),
      'utf-8'
    );
    expect(securePrefsContent).not.toContain('prefs.edit().putString(key, value).apply();');
  });

  it('verifica permisos antes de iniciar LocationService en BootReceiver.java mediante PermissionUtils', () => {
    const bootContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/BootReceiver.java'),
      'utf-8'
    );
    expect(bootContent).toContain('PermissionUtils.hasRequiredTrackingPermissions');
    expect(bootContent).toContain('ForegroundServiceStartNotAllowedException');

    const permContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/PermissionUtils.java'),
      'utf-8'
    );
    expect(permContent).toContain('ACCESS_FINE_LOCATION');
    expect(permContent).toContain('POST_NOTIFICATIONS');
  });


  it('utiliza goAsync() en VehicleControlReceiver.java para no bloquear el hilo principal', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('goAsync()');
    expect(receiverContent).toContain('pendingResult.finish()');
  });

  it('filtra ubicaciones simuladas (Mock) y limita la cola offline a iteraciones manejables en LocationService.java', () => {
    expect(javaContent).toContain('isMockLocation(location)');
    expect(javaContent).toContain('location.isMock()');
    expect(javaContent).toContain('getOldest(50)');
  });

  it('genera UUID persistente android-uuid- como fallback de DeviceId en DeviceAuthManager.java', () => {
    const authManagerContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/DeviceAuthManager.java'),
      'utf-8'
    );
    expect(authManagerContent).toContain('android-uuid-');
    expect(authManagerContent).toContain('hasCredentials()');
    expect(authManagerContent).toContain('GpsTrackerAuthKey');
  });

  it('valida cabecera mágica ENC:v1:, aislamiento de alias y descarte de datos corruptos mediante commit() en SecurePreferences.java', () => {
    const securePrefsContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/SecurePreferences.java'),
      'utf-8'
    );
    expect(securePrefsContent).toContain('MAGIC_PREFIX = "ENC:v1:"');
    expect(securePrefsContent).toContain('this.keyAlias =');
    expect(securePrefsContent).toContain('prefs.edit().remove(key).commit();');
    expect(securePrefsContent).not.toContain('.apply();');
  });

  it('verifica que BootReceiver.java consulte isProvisioned() antes de lanzar el servicio', () => {
    const bootContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/BootReceiver.java'),
      'utf-8'
    );
    expect(bootContent).toContain('authManager.isProvisioned()');
  });

  it('clasifica respuestas HTTP (401 limpia token, 403 revoca) y usa fecha satelital en fallback en LocationService.java', () => {
    expect(javaContent).toContain('responseCode == 401');
    expect(javaContent).toContain('responseCode == 403');
    expect(javaContent).toContain('authManager.clearAccessToken();');
    expect(javaContent).toContain('authManager.markDeviceRevoked();');
    expect(javaContent).toContain('responseCode == 400 || responseCode == 422');
  });

  it('lee preferencias dinámicas e implementa comprobación de idempotencia física en HardwareRelayReceiver.java', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/HardwareRelayReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('vehicle_control_prefs');
    expect(receiverContent).toContain('pinValue.equals(currentVal)');
  });

  it('cifra la cola offline usando EncryptionUtils y almacena usando Room en LocationService.java', () => {
    expect(javaContent).toContain('EncryptionUtils');
    expect(javaContent).toContain('AppDatabase.getDatabase(getApplicationContext())');
  });

  it('gestiona backoff exponencial de autenticación mediante KEY_NEXT_AUTH_RETRY en DeviceAuthManager.java', () => {
    const authManagerContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/DeviceAuthManager.java'),
      'utf-8'
    );
    expect(authManagerContent).toContain('KEY_NEXT_AUTH_RETRY');
    expect(authManagerContent).toContain('recordAuthFailure');
  });

  it('procesa el resultado de permisos de ubicación en segundo plano (código 43) y redirige a Ajustes en Android 11+ en MainActivity.java', () => {
    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('BG_LOCATION_PERMISSION_REQUEST');
    expect(mainContent).toContain('ACCESS_BACKGROUND_LOCATION');
    expect(mainContent).toContain('ACTION_APPLICATION_DETAILS_SETTINGS');
    expect(mainContent).toContain('isIgnoringBatteryOptimizations');
  });

  it('consulta comandos pendientes y recibidos con status=in.(pending,received), transmite created_at, usa GpsTrackerCommandKey y valida tolerancia de reloj en LocationService.java', () => {
    expect(javaContent).toContain('status=in.(pending,received)');
    expect(javaContent).toContain('created_at');
    expect(javaContent).toContain('GpsTrackerCommandKey');
    expect(javaContent).toContain('getValidLocationTime');
  });

  it('evalúa la expiración real de created_at en VehicleControlReceiver y tiene debug en HardwareRelayReceiver', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('created_at');
    
    const hwContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/HardwareRelayReceiver.java'),
      'utf-8'
    );
    expect(hwContent).toContain('FLAG_DEBUGGABLE');
  });

  it('sanitiza coordenadas en isValidLocation en LocationService.java', () => {
    expect(javaContent).toContain('isValidLocation(location)');
    expect(javaContent).toContain('Double.isNaN(lat)');
  });

  it('comprueba el permiso de ubicación en segundo plano ACCESS_BACKGROUND_LOCATION en PermissionUtils.java', () => {
    const permContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/PermissionUtils.java'),
      'utf-8'
    );
    expect(permContent).toContain('ACCESS_BACKGROUND_LOCATION');
    expect(permContent).toContain('hasBackgroundLocationPermission');
  });


  it('exige broadcast explícito con setPackage y valida el paquete llamante para evitar falsificación', () => {
    expect(javaContent).toContain('!getPackageName().equals(intent.getPackage())');

    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/HardwareRelayReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('resultIntent.setPackage(context.getPackageName());');
  });

  it('condiciona la ejecución física del relé al acuse confirmado receivedAcked y rechaza comandos sin created_at válido', () => {
    expect(javaContent).toContain('boolean receivedAcked = ackCommandStatus(token, timestamp, cmdId, "received");');
    expect(javaContent).toContain('if (!receivedAcked)');
    expect(javaContent).toContain('timestamp created_at inválido');
  });

  it('gestiona la revocación remota de dispositivos con markDeviceRevoked y reintenta reinicio tras onTaskRemoved', () => {
    const authManagerContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/DeviceAuthManager.java'),
      'utf-8'
    );
    expect(authManagerContent).toContain('KEY_DEVICE_REVOKED');
    expect(authManagerContent).toContain('markDeviceRevoked()');

    expect(javaContent).toContain('authManager.markDeviceRevoked();');
    expect(javaContent).toContain('onTaskRemoved(Intent rootIntent)');
    expect(javaContent).toContain('AlarmManager.ELAPSED_REALTIME');
  });

  it('persiste resultados de hardware pendientes en pending_hardware_results_json para resiliencia ante muerte del servicio', () => {
    expect(javaContent).toContain('flushPendingHardwareResults()');
    expect(javaContent).toContain('removePendingHardwareResult(cmdId)');

    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('pending_hardware_results_json');
    expect(receiverContent).toContain('persistPendingHardwareResult');
  });

  it('limpia activeExecutingCommandIds y notifica failed si sendBroadcast falla en executeCommandAction', () => {
    expect(javaContent).toContain('Error enviando broadcast de control de vehículo para');
    expect(javaContent).toContain('activeExecutingCommandIds.remove(cmdId);');
  });

  it('elimina prefSimulation de SharedPreferences para impedir la activación del modo simulación por configuración local', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).not.toContain('prefSimulation');
  });

  it('actualiza la notificación y solicita de nuevo requestLocationUpdates al desactivar el proveedor GPS en onProviderDisabled', () => {
    expect(javaContent).toContain('Proveedor de ubicación desactivado:');
    expect(javaContent).toContain('GPS desactivado en el dispositivo - Reintentando con red');
    expect(javaContent).toContain('requestLocationUpdates();');
  });

  it('exige el código de activación en DeviceAuthManager.java y lo envía a provision-device en Supabase', () => {
    const authManagerContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/DeviceAuthManager.java'),
      'utf-8'
    );
    expect(authManagerContent).toContain('activationCode');
    expect(authManagerContent).toContain('setActivationCode');
    expect(authManagerContent).not.toContain('x-provision-secret');

    const edgeContent = fs.readFileSync(
      path.resolve(__dirname, '../../../supabase/functions/provision-device/index.ts'),
      'utf-8'
    );
    expect(edgeContent).toContain('activationCode');
  });

  it('implementa parseIsoCreatedAt y fallback dual GPS_PROVIDER / NETWORK_PROVIDER en LocationService.java', () => {
    expect(javaContent).toContain('parseIsoCreatedAt');
    expect(javaContent).toContain('Instant.parse');
    expect(javaContent).toContain('NETWORK_PROVIDER');
  });

  it('implementa máquina de estados de onboarding secuencial en MainActivity.java', () => {
    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('startOnboardingSequence()');
    expect(mainContent).toContain('requestBatteryOptimizationExemptionSequential()');
    expect(mainContent).toContain('BG_LOCATION_PERMISSION_REQUEST');
  });

  it('implementa onStartCommand retornando START_STICKY y remueve listeners previos en requestLocationUpdates', () => {
    expect(javaContent).toContain('public int onStartCommand(Intent intent, int flags, int startId)');
    expect(javaContent).toContain('return START_STICKY;');
    expect(javaContent).toContain('locationManager.removeUpdates(this);');
  });

  it('genera identificadores estables y deterministas con UUID.nameUUIDFromBytes y envía telemetría MOCK_DETECTED', () => {
    expect(javaContent).toContain('UUID.nameUUIDFromBytes');
    expect(javaContent).toContain('sendLocationStatusTelemetry("MOCK_DETECTED");');
  });

  it('captura el código de activación en MainActivity.java desde intent extra y deep link gpstracker://activate', () => {
    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('processActivationIntent(getIntent());');
    expect(mainContent).toContain('authManager.setActivationCode');
    expect(mainContent).toContain('onNewIntent');

    const manifestContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml'),
      'utf-8'
    );
    expect(manifestContent).toContain('android:scheme="gpstracker"');
    expect(manifestContent).toContain('USER_UNLOCKED');
  });

  it('soporta USER_UNLOCKED y programa alarma de recuperación tras fallos temporales de autenticación en BootReceiver.java', () => {
    const bootContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/BootReceiver.java'),
      'utf-8'
    );
    expect(bootContent).toContain('USER_UNLOCKED');
    expect(bootContent).toContain('scheduleServiceStartAlarm');
    expect(bootContent).toContain('authManager.getNextAuthRetrySeconds()');
  });

  it('declara filtro de intent HTTPS para deep links y registra AlarmRecoveryReceiver en AndroidManifest.xml', () => {
    const manifestContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml'),
      'utf-8'
    );
    expect(manifestContent).toContain('android:scheme="https"');
    expect(manifestContent).toContain('AlarmRecoveryReceiver');
    expect(manifestContent).toContain('com.gps.tracker.ACTION_RECOVER_SERVICE');
  });

  it('enmascara y valida el código de activación en MainActivity.java y lo elimina tras aprovisionamiento exitoso en DeviceAuthManager.java', () => {
    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('maskCode');
    expect(mainContent).toContain('isValidActivationCode');

    const authManagerContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/DeviceAuthManager.java'),
      'utf-8'
    );
    expect(authManagerContent).toContain('clearActivationCode()');
  });

  it('prioriza un único proveedor de ubicación y limita/ordena las consultas de comandos en LocationService.java', () => {
    expect(javaContent).toContain('Solicitando lecturas de ubicación del proveedor principal: GPS_PROVIDER');
    expect(javaContent).toContain('&order=created_at.asc&limit=5');
    expect(javaContent).toContain('Deduplicando muestra de ubicación redundante');
  });

  it('condiciona la emisión del broadcast ACK a la persistencia exitosa en almacenamiento cifrado en VehicleControlReceiver.java', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('boolean persisted = persistPendingHardwareResult');
    expect(receiverContent).toContain('Abortando emisión de ACK para evitar confirmaciones sin durabilidad local');
  });

  it('reinicia aprovisionamiento y onboarding en MainActivity.java tras recibir nuevo código de activación', () => {
    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('processActivationIntent');
    expect(mainContent).toContain('authManager.setActivationCode');
    expect(mainContent).toContain('startOnboardingSequence');
  });

  it('deduplica y limita a 100 resultados de hardware pendientes en VehicleControlReceiver.java', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('MAX_PENDING_HARDWARE_RESULTS = 100');
    expect(receiverContent).toContain('command_id');
  });


  it('considera velocidad, proveedor y precisión para la deduplicación de ubicaciones en LocationService.java', () => {
    expect(javaContent).toContain('lastReportedLocation');
    expect(javaContent).toContain('lastReportedTimeMs');
    expect(javaContent).toContain('location.getProvider()');
    expect(javaContent).toContain('location.getSpeed()');
    expect(javaContent).toContain('location.getAccuracy()');
  });

  it('evita inicios duplicados por BOOT_COMPLETED y USER_UNLOCKED mediante debounce persistente en BootReceiver.java', () => {
    const bootContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/BootReceiver.java'),
      'utf-8'
    );
    expect(bootContent).toContain('gps_boot_prefs');
    expect(bootContent).toContain('last_boot_handled_ms');
    expect(bootContent).toContain('10_000L');
  });

  it('cancela alarmas de recuperación al activarse el servicio en LocationService.java', () => {
    expect(javaContent).toContain('cancelRecoveryAlarm(this)');
    expect(javaContent).toContain('AlarmRecoveryReceiver.class');
  });

  it('distingue errores RLS de revocación real de dispositivo ante respuestas HTTP 403 en LocationService.java', () => {
    expect(javaContent).toContain('handleForbiddenError');
    expect(javaContent).toContain('isDeviceRevocationResponse');
  });

  it('centraliza la validación de permisos en PermissionUtils.java para BootReceiver y AlarmRecoveryReceiver', () => {
    const permContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/PermissionUtils.java'),
      'utf-8'
    );
    expect(permContent).toContain('hasRequiredTrackingPermissions');
    expect(permContent).toContain('ACCESS_FINE_LOCATION');
    expect(permContent).toContain('POST_NOTIFICATIONS');

    const alarmContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/AlarmRecoveryReceiver.java'),
      'utf-8'
    );
    expect(alarmContent).toContain('PermissionUtils.hasRequiredTrackingPermissions');

    const bootContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/BootReceiver.java'),
      'utf-8'
    );
    expect(bootContent).toContain('PermissionUtils.hasRequiredTrackingPermissions');
  });

  it('sincroniza el aprovisionamiento globalmente con GLOBAL_AUTH_LOCK en DeviceAuthManager.java para prevenir condiciones de carrera', () => {
    const authManagerContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/DeviceAuthManager.java'),
      'utf-8'
    );
    expect(authManagerContent).toContain('GLOBAL_AUTH_LOCK');
    expect(authManagerContent).toContain('synchronized (GLOBAL_AUTH_LOCK)');
  });

  it('aplica retención TTL de 24 horas y fallback a SharedPreferences en VehicleControlReceiver.java', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('MAX_HARDWARE_RESULT_AGE_MS = 86_400_000L');
    expect(receiverContent).toContain('vehicle_control_fallback_prefs');
  });

  it('acepta ubicación precisa o aproximada en PermissionUtils.hasRequiredTrackingPermissions', () => {
    const permContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/PermissionUtils.java'),
      'utf-8'
    );
    expect(permContent).toContain('boolean locationOk = hasAnyLocationPermission(context);');
  });

  it('marca pending_perm_prompt si faltan permisos en AlarmRecoveryReceiver.java', () => {
    const alarmContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/AlarmRecoveryReceiver.java'),
      'utf-8'
    );
    expect(alarmContent).toContain('pending_perm_prompt');
  });

  it('ejecuta clearDeviceRevoked() en DeviceAuthManager.java solo tras la confirmación exitosa del servidor en provision()', () => {
    const authManagerContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/DeviceAuthManager.java'),
      'utf-8'
    );
    expect(authManagerContent).toContain('clearDeviceRevoked()');
    const setCodeIndex = authManagerContent.indexOf('public void setActivationCode');
    const setCodeSnippet = authManagerContent.substring(setCodeIndex, setCodeIndex + 200);
    expect(setCodeSnippet).not.toContain('clearDeviceRevoked()');
  });

  it('procesa y limpia registros individuales de la cola fallback mediante remove("pending_hardware_results_json").commit() en LocationService.java', () => {
    expect(javaContent).toContain('pending_hardware_result_');
    expect(javaContent).toContain('vehicle_control_fallback_prefs');
    expect(javaContent).toContain('fallback.edit().remove("pending_hardware_results_json").commit();');
    expect(javaContent).not.toContain('fallback.edit().clear()');
  });

  it('sincroniza la escritura en fallback con HARDWARE_RESULT_LOCK en VehicleControlReceiver.java', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    expect(receiverContent).toContain('HARDWARE_RESULT_LOCK');
    expect(receiverContent).toContain('synchronized (HARDWARE_RESULT_LOCK)');
  });

  it('soporta almacenamiento Direct Boot seguro mediante createDeviceProtectedStorageContext en BootReceiver.java', () => {
    const bootContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/BootReceiver.java'),
      'utf-8'
    );
    expect(bootContent).toContain('createDeviceProtectedStorageContext');
  });

  it('elimina registros fallback únicamente cuando acked == true o expirados en LocationService.java', () => {
    expect(javaContent).toContain('boolean acked = ackCommandStatus(token, timestamp, cmdId, finalStatus);');
    expect(javaContent).toContain('if (acked) {');
    expect(javaContent).toContain('fallback.edit().remove(key).commit();');
  });

  it('consume pending_perm_prompt al abrir MainActivity.java para guiar al usuario tras fallos por permisos', () => {
    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('pending_perm_prompt');
    expect(mainContent).toContain('remove("pending_perm_prompt")');
  });

  it('usa Room para la cola offline en loadOfflineQueueFromStorage', () => {
    expect(javaContent).toContain('getDatabase');
  });

  it('revalida permisos en onResume() y maneja la activación con ExecutorService controlado en MainActivity.java', () => {
    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('public void onResume()');
    expect(mainContent).toContain('activationExecutor');
    expect(mainContent).toContain('safeRunOnUiThread');
    expect(mainContent).toContain('onDestroy()');
  });

  it('limita los reintentos de resultados fallback a 5 con retry_count y verifica retorno de removePendingHardwareResult en LocationService.java', () => {
    expect(javaContent).toContain('retryCount >= 5');
    expect(javaContent).toContain('retry_count');
    expect(javaContent).toContain('private boolean removePendingHardwareResult(String commandId)');
  });

  it('verifica interrupción de hilos y timeouts reducidos a 8s en DeviceAuthManager.java', () => {
    const authContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/DeviceAuthManager.java'),
      'utf-8'
    );
    expect(authContent).toContain('Thread.currentThread().isInterrupted()');
    expect(authContent).toContain('setConnectTimeout(8000)');
  });

  it('comprueba isServiceRunning para evitar reinicios en onResume(), tolera desvío de reloj futuro (now + 5min) y registra errores de fallback corruptos', () => {
    expect(javaContent).toContain('public static volatile boolean isServiceRunning');
    expect(javaContent).toContain('ts > now + 300_000L');
    expect(javaContent).toContain('Fallo al procesar resultado fallback para clave');
    expect(javaContent).toContain('entrada corrupta. Eliminando entrada de cuarentena.');

    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('LocationService.isServiceActuallyRunning');
    expect(mainContent).toContain('Omitiendo reinicio en startLocationService');

    const manifestContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml'),
      'utf-8'
    );
    expect(manifestContent).toContain('android:name=".BootReceiver"');
    expect(manifestContent).toContain('android:exported="true"');
    expect(manifestContent).toContain('android:permission="android.permission.RECEIVE_BOOT_COMPLETED"');

    const bootContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/BootReceiver.java'),
      'utf-8'
    );
    expect(bootContent).toContain('context.getPackageName().equals(intent.getPackage())');
  });

  it('procesa fallback individual aunque no haya JSON cifrado, limpia fallback individual en removePendingHardwareResult y aplica retry_count a JSON', () => {
    expect(javaContent).toContain('if (!TextUtils.isEmpty(rawJson) && !"[]".equals(rawJson))');
    expect(javaContent).toContain('Map<String, ?> allFallback = fallback.getAll();');
    expect(javaContent).toContain('fallback.edit().remove("pending_hardware_result_" + commandId).commit();');
    expect(javaContent).toContain('obj.put("retry_count", retryCount + 1);');
    expect(javaContent).toContain('obj.put("last_attempt_at", now);');
    expect(javaContent).toContain('Resultado de hardware en JSON cifrado excedió el límite máximo de reintentos');
  });

  it('extrae el código de activación del path URI (/activate/), mueve JSON corrupto a cuarentena, verifica commit() y registra command_id en parseIsoCreatedAt', () => {
    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('path.contains("/activate/")');
    expect(mainContent).toContain('Uri.decode(code)');

    expect(javaContent).toContain('corrupt_hardware_results_quarantine_');
    expect(javaContent).toContain('fallbackCommitted');
    expect(javaContent).toContain('No se pudo interpretar el formato de fecha created_at');
  });

  it('desacopla el vaciado de cola con NetworkCallback y offlineFlushExecutor y valida latido en isServiceActuallyRunning', () => {
    expect(javaContent).toContain('triggerAsyncOfflineFlush()');
    expect(javaContent).toContain('registerNetworkCallback()');
    expect(javaContent).toContain('offlineFlushExecutor');
    expect(javaContent).toContain('Desechando punto GPS offline sin timestamp válido');
    expect(javaContent).toContain('isServiceActuallyRunning');

    const mainContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    expect(mainContent).toContain('LocationService.isServiceActuallyRunning(this)');
  });

  it('usa tiempo monotónico SystemClock.elapsedRealtime(), maneja RejectedExecutionException, aplica backoff y valida latido 0 tras grace period', () => {
    expect(javaContent).toContain('service_last_heartbeat_elapsed_ms');
    expect(javaContent).toContain('SystemClock.elapsedRealtime()');
    expect(javaContent).toContain('RejectedExecutionException');
    expect(javaContent).toContain('offlineFlushBackoffMs');
    expect(javaContent).toContain('uptime > 45_000L');
  });

  it('verifica el contrato exacto de claves extras en el broadcast de resultado entre VehicleControlReceiver y LocationService', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    const serviceContent = javaContent;

    const requiredResultExtras = ['command_id', 'command', 'success', 'created_at_ms'];

    // Validar que VehicleControlReceiver emita todas las claves extras esperadas
    for (const key of requiredResultExtras) {
      expect(receiverContent).toContain(`resultIntent.putExtra("${key}"`);
    }

    // Validar que LocationService consuma created_at_ms en hardwareResultReceiver y envíe created_at_ms en el comando
    expect(serviceContent).toContain('intent.getLongExtra("created_at_ms", -1)');
    expect(serviceContent).toContain('intent.putExtra("created_at_ms", createdAtMillis)');
  });

  it('rechaza comandos con fechas futuras (> 5 min) en pollCommands y en VehicleControlReceiver', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    expect(javaContent).toContain('createdAtMillis > now + 300_000L');
    expect(receiverContent).toContain('createdAt > now + 300_000L || now - createdAt > 300_000L');
  });

  it('protege isServiceRunning en onCreate con try-catch en startForeground y asignación posterior', () => {
    expect(javaContent).toContain('startForeground(NOTIFICATION_ID, notification');
    expect(javaContent).toContain('isServiceRunning = true;');
    expect(javaContent).toContain('isServiceRunning = false;');
    expect(javaContent).toContain('stopSelf();');
  });

  it('ejecuta primero la actualización cifrada y verifica su durabilidad antes de remover el fallback en removePendingHardwareResult', () => {
    expect(javaContent).toContain('boolean encryptedUpdated = true;');
    expect(javaContent).toContain('encryptedUpdated = securePrefs.putString("pending_hardware_results_json", remaining.toString());');
    expect(javaContent).toContain('if (!encryptedUpdated)');
    expect(javaContent).toContain('Conservando copia de respaldo fallback');
    expect(javaContent).toContain('fallback.edit().remove("pending_hardware_result_" + commandId).commit();');
  });

  it('utiliza el enum FlushResult (SUCCESS_EMPTY, SUCCESS_PARTIAL, FAILED) y ajusta backoff a 0ms en vaciado parcial', () => {
    expect(javaContent).toContain('enum FlushResult');
    expect(javaContent).toContain('SUCCESS_EMPTY');
    expect(javaContent).toContain('SUCCESS_PARTIAL');
    expect(javaContent).toContain('FAILED');
    expect(javaContent).toContain('result == FlushResult.SUCCESS_PARTIAL');
    expect(javaContent).toContain('offlineFlushBackoffMs = 0L');
  });

  it('valida la protección por permiso android.permission.RECEIVE_BOOT_COMPLETED en AndroidManifest.xml para BootReceiver', () => {
    const manifestContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml'),
      'utf-8'
    );
    expect(manifestContent).toContain('android.permission.RECEIVE_BOOT_COMPLETED');
    expect(manifestContent).toContain('android:exported="true"');
  });

  it('rechaza resultados hardware sin timestamp created_at_ms y atrapa RejectedExecutionException en ejecutor de comandos', () => {
    expect(javaContent).toContain('Rechazando resultado de hardware para comando');
    expect(javaContent).toContain('timestamp created_at_ms inexistente o inválido');
    expect(javaContent).toContain('Omitiendo procesamiento de resultado hardware para');
    expect(javaContent).toContain('Omitiendo polling de comandos; ejecutor cerrado');
  });

  it('valida el reseteo de categoría con handleCategoryChange y confirmación de geocerca en Dashboard.jsx', () => {
    const dashboardContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/Dashboard.jsx'),
      'utf-8'
    );
    expect(dashboardContent).toContain('handleCategoryChange(item.id)');
    expect(dashboardContent).toContain('closeMobileDrawer()');
    expect(dashboardContent).toContain('Confirmar Nueva Geocerca');
    expect(dashboardContent).toContain('window.history.back()');
  });

  it('evita crashes por denegación o error de GPS verificando userLocation?.position en RightSidebarPanel y LeftSidebarPanel', () => {
    const rightPanel = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/RightSidebarPanel.jsx'),
      'utf-8'
    );
    const leftPanel = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/LeftSidebarPanel.jsx'),
      'utf-8'
    );
    expect(rightPanel).toContain('userLocation?.position');
    expect(rightPanel).toContain('userLocation?.error ? \'GPS no disponible\'');
    expect(leftPanel).toContain('userLocation?.position');
  });

  it('habilita la lista de dispositivos y el botón Nueva Geocerca en móviles integrando RightSidebarPanel isMobile en el drawer', () => {
    const dashboardContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/Dashboard.jsx'),
      'utf-8'
    );
    expect(dashboardContent).toContain('<RightSidebarPanel');
    expect(dashboardContent).toContain('isMobile');
    expect(dashboardContent).toContain('closeMobileDrawer()');
  });

  it('conecta la previsualización del círculo pendingCenter al colocar geocercas y al presionar Escape en el drawer', () => {
    const dashboardContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/Dashboard.jsx'),
      'utf-8'
    );
    const mapAreaContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/MapArea.jsx'),
      'utf-8'
    );
    expect(dashboardContent).toContain('setPendingCenter(latlng)');
    expect(dashboardContent).toContain('pendingCenter={pendingGeofenceConfirm ? pendingGeofenceConfirm.center : (isPlacingOnMap ? pendingCenter : null)}');
    expect(dashboardContent).toContain("if (e.key === 'Escape') {\n        closeMobileDrawer()");
    expect(mapAreaContent).toContain('{pendingCenter && (');
    expect(mapAreaContent).toContain('onMapHover');
  });

  it('implementa resiliencia en useDevices con polling de 30s, listeners de visibilidad y reconexión de Realtime', () => {
    const useDevicesContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/hooks/useDevices.js'),
      'utf-8'
    );
    expect(useDevicesContent).toContain('setInterval(() => {');
    expect(useDevicesContent).toContain('30000');
    expect(useDevicesContent).toContain("document.addEventListener('visibilitychange'");
    expect(useDevicesContent).toContain("status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'");
  });

  it('sobrescribe display: none !important para .dashboard-right-panel dentro de .mobile-drawer-panel en index.css', () => {
    const cssContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/index.css'),
      'utf-8'
    );
    expect(cssContent).toContain('.mobile-drawer-panel .dashboard-right-panel');
    expect(cssContent).toContain('display: flex !important');
  });

  it('calcula estadísticas en LeftSidebarPanel según categoría activa y muestra banner para ubicar geocerca en Dashboard.jsx', () => {
    const dashboardContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/Dashboard.jsx'),
      'utf-8'
    );
    expect(dashboardContent).toContain("vehicles={category === 'devices' ? devicesList : vehiclesList}");
    expect(dashboardContent).toContain('Toca o haz clic en el mapa para ubicar la geocerca');
    expect(dashboardContent).toContain('pendingGeofenceConfirm ? pendingGeofenceConfirm.center : (isPlacingOnMap ? pendingCenter : null)');
  });

  it('acepta permiso de ubicación aproximada (ACCESS_COARSE_LOCATION) y desactiva el estado isServiceRunning si no hay proveedores activos', () => {
    const locationServiceContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/LocationService.java'),
      'utf-8'
    );
    const mainActivityContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    const permissionUtilsContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/PermissionUtils.java'),
      'utf-8'
    );

    expect(permissionUtilsContent).toContain('hasAnyLocationPermission');
    expect(mainActivityContent).toContain('PermissionUtils.hasAnyLocationPermission(this)');
    expect(locationServiceContent).toContain('Proveedores GPS y Red desactivados');
  });

  it('sincroniza categoría al seleccionar alerta, equipara resiliencia en useVehicles, desduplica registros en LocationService y limita eventos mousemove en MapArea', () => {
    const dashboardContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/Dashboard.jsx'),
      'utf-8'
    );
    const useVehiclesContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/hooks/useVehicles.js'),
      'utf-8'
    );
    const locationServiceContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/LocationService.java'),
      'utf-8'
    );
    const mapAreaContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/MapArea.jsx'),
      'utf-8'
    );
    const headerContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/HeaderBar.jsx'),
      'utf-8'
    );

    expect(dashboardContent).toContain("if (category !== 'vehicles')");
    expect(useVehiclesContent).toContain('setInterval(() => {');
    expect(useVehiclesContent).toContain("document.addEventListener('visibilitychange'");
    expect(locationServiceContent).toContain('activeLocationProvider = targetProvider;');
    expect(mapAreaContent).toContain('lastHoverRef.current');
    expect(headerContent).toContain('hidden min-[310px]:flex');
  });

  it('valida el parámetro category en enlaces compartidos, el toast de cambio de categoría por alerta, el reseteo de proveedor en Android y el uso de 100dvh', () => {
    const dashboardContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/Dashboard.jsx'),
      'utf-8'
    );
    const locationServiceContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/LocationService.java'),
      'utf-8'
    );
    const cssContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/index.css'),
      'utf-8'
    );

    expect(dashboardContent).toContain("routeUrl.searchParams.set('category', category)");
    expect(dashboardContent).toContain("setOperationMessage('Cambiado a vista de Motos por alerta seleccionada')");
    expect(dashboardContent).toContain("setOperationMessage('Cambiado a vista de Dispositivos por alerta seleccionada')");
    expect(dashboardContent).toContain('h-[calc(100dvh-2rem)]');

    expect(locationServiceContent).toContain('activeLocationProvider = null;');
    expect(locationServiceContent).toContain('updateNotification("Error de proveedor de ubicación: " + targetProvider);');

    expect(cssContent).toContain('.auth-shell { display: flex; min-height: 100dvh;');
  });

  it('valida rechazo inmediato de comandos sin command_id o con createdAt <= 0 en VehicleControlReceiver, arranque por permiso en BootReceiver y tolerancia de 5 min en mapLogic', () => {
    const receiverContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/VehicleControlReceiver.java'),
      'utf-8'
    );
    const bootContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/BootReceiver.java'),
      'utf-8'
    );
    const permContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/PermissionUtils.java'),
      'utf-8'
    );
    const mapLogicContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/lib/mapLogic.js'),
      'utf-8'
    );

    expect(receiverContent).toContain('TextUtils.isEmpty(commandId)');
    expect(receiverContent).toContain('createdAt <= 0');
    expect(bootContent).toContain('PermissionUtils.hasRequiredTrackingPermissions(context)');
    expect(permContent).toContain('hasAnyLocationPermission(context)');
    expect(permContent).not.toContain('hasBackgroundLocationPermission(context)');
    expect(mapLogicContent).toContain('maxFutureMs = 300000');
  });

  it('valida la conservación de datos ante errores de red, la deduplicación de consultas con isFetchingRef y el timeout de mapa de 90s en queries y hooks', () => {
    const useDevicesContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/hooks/useDevices.js'),
      'utf-8'
    );
    const useVehiclesContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/hooks/useVehicles.js'),
      'utf-8'
    );
    const queriesContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/lib/queries.js'),
      'utf-8'
    );

    expect(useDevicesContent).toContain('isFetchingRef.current');
    expect(useDevicesContent).not.toContain('setDevices([])');
    expect(useVehiclesContent).toContain('isFetchingRef.current');
    expect(useVehiclesContent).not.toContain('setVehicles([])');
    expect(queriesContent).toContain('REALTIME_LOCATION_TIMEOUT_MS = 90 * 1000');
    expect(queriesContent).toContain('lastSeenAgeMs < -5 * 60 * 1000');
  });

  it('valida el comportamiento del servicio Android ante expiración de sesión (401), deduplicación determinista, desbordamiento de cola y botón de seguimiento en mapa', () => {
    const locationServiceContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/LocationService.java'),
      'utf-8'
    );
    const mapAreaContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/MapArea.jsx'),
      'utf-8'
    );

    expect(locationServiceContent).toContain('GPS_PROVIDER');
    expect(locationServiceContent).toContain('NETWORK_PROVIDER');
    expect(locationServiceContent).toContain('responseCode == 401');
    expect(locationServiceContent).toContain('authManager.clearAccessToken()');
    expect(locationServiceContent).toContain('enqueueOfflineLocation(body)');
    expect(locationServiceContent).toContain('UUID.nameUUIDFromBytes');
    expect(locationServiceContent).toContain('MAX_OFFLINE_QUEUE_SIZE');

    expect(mapAreaContent).toContain('disabled={!selectedVehicle?.position}');
    expect(mapAreaContent).toContain('Sin posición GPS para seguir');
  });

  it('valida la sincronización JWT native-to-webview, secreto de Edge Function, resiliencia en alertas/geocercas y priorización de estado offline de motos', () => {
    const mainActivityContent = fs.readFileSync(
      path.resolve(__dirname, '../../android/app/src/main/java/com/gps/tracker/MainActivity.java'),
      'utf-8'
    );
    const supabaseJsContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/lib/supabase.js'),
      'utf-8'
    );
    const provisionEdgeContent = fs.readFileSync(
      path.resolve(__dirname, '../../../supabase/functions/provision-device/index.ts'),
      'utf-8'
    );
    const useAlertsContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/hooks/useAlerts.js'),
      'utf-8'
    );
    const useGeofencesContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/hooks/useGeofences.js'),
      'utf-8'
    );
    const useVehiclesContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/hooks/useVehicles.js'),
      'utf-8'
    );
    const dashboardContent = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/Dashboard.jsx'),
      'utf-8'
    );

    expect(mainActivityContent).toContain('addJavascriptInterface');
    expect(mainActivityContent).toContain('CapacitorDeviceAuth');
    expect(mainActivityContent).toContain('getDeviceAuthJson');

    expect(supabaseJsContent).toContain('getNativeDeviceAuth');
    expect(supabaseJsContent).toContain('Authorization');
    expect(supabaseJsContent).toContain('setSession');

    expect(provisionEdgeContent).toContain('expectedSecret && providedSecret && providedSecret !== expectedSecret');


    expect(useAlertsContent).toContain('prev && prev.length > 0 ? prev');
    expect(useGeofencesContent).toContain('prev && prev.length > 0 ? prev');

    expect(useVehiclesContent).toContain("connectionStatus === 'offline'");

    expect(dashboardContent).toContain('activeNetworkError');
    expect(dashboardContent).toContain('alertsError');
    expect(dashboardContent).toContain('geofencesError');
    expect(dashboardContent).toContain('Puedes reintentar');
  });
});






