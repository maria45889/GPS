// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const JAVA_DIR = path.resolve(
  __dirname,
  '../../android/app/src/main/java/com/gps/tracker'
);
const MANIFEST_PATH = path.resolve(
  __dirname,
  '../../android/app/src/main/AndroidManifest.xml'
);

const readJava = (name) =>
  fs.readFileSync(path.join(JAVA_DIR, name), 'utf-8');

let securePrefs;
let authManager;
let bootReceiver;
let alarmReceiver;
let mainActivity;
let watchdog;
let launcherVisibility;
let tracker;
let manifest;

beforeAll(() => {
  securePrefs = readJava('SecurePreferences.java');
  authManager = readJava('DeviceAuthManager.java');
  bootReceiver = readJava('BootReceiver.java');
  alarmReceiver = readJava('AlarmRecoveryReceiver.java');
  mainActivity = readJava('MainActivity.java');
  watchdog = readJava('TrackingWatchdog.java');
  launcherVisibility = readJava('LauncherVisibility.java');
  tracker = fs.readFileSync(
    path.resolve(__dirname, '../lib/gpsTracker.js'),
    'utf-8'
  );
  manifest = fs.readFileSync(MANIFEST_PATH, 'utf-8');
});

describe('SecurePreferences: cifrado sin fallback en texto plano', () => {
  it('usa AndroidKeyStore con AES/GCM/NoPadding y clave de 256 bits', () => {
    expect(securePrefs).toContain('"AndroidKeyStore"');
    expect(securePrefs).toContain('AES/GCM/NoPadding');
    expect(securePrefs).toContain('.setKeySize(256)');
    expect(securePrefs).toContain('.setBlockModes(KeyProperties.BLOCK_MODE_GCM)');
    expect(securePrefs).toContain(
      '.setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)'
    );
  });

  it('usa IV de 12 bytes y tag GCM de 128 bits', () => {
    expect(securePrefs).toMatch(/GCM_IV_LENGTH\s*=\s*12/);
    expect(securePrefs).toMatch(/GCM_TAG_LENGTH\s*=\s*128/);
    expect(securePrefs).toContain('new GCMParameterSpec(GCM_TAG_LENGTH, iv)');
  });

  it('marca todo valor cifrado con el prefijo mágico ENC:v1:', () => {
    expect(securePrefs).toMatch(/MAGIC_PREFIX\s*=\s*"ENC:v1:"/);
    expect(securePrefs).toContain('MAGIC_PREFIX + Base64.encodeToString');
  });

  it('concatena IV + ciphertext en un solo blob cifrado', () => {
    expect(securePrefs).toContain(
      'byte[] combined = new byte[iv.length + encrypted.length]'
    );
    expect(securePrefs).toContain('System.arraycopy(encrypted, 0, combined, iv.length');
  });

  it('aborta el guardado si la clave no está disponible, sin escribir en claro', () => {
    expect(securePrefs).toContain('if (secretKey == null)');
    expect(securePrefs).toContain('guardado abortado por seguridad');
    expect(securePrefs).toMatch(/guardado abortado[\s\S]{0,200}return false/);
  });

  it('elimina la entrada si el descifrado falla en vez de devolver el valor en claro', () => {
    expect(securePrefs).toContain('Fallo al descifrar preferencia');
    expect(securePrefs).toMatch(/Fallo al descifrar[\s\S]{0,400}prefs\.edit\(\)\.remove\(key\)\.commit\(\)/);
    expect(securePrefs).not.toMatch(/catch \(Exception e\) \{\s*return raw;/);
  });

  it('elimina el payload si no se puede descifrar por clave ausente', () => {
    expect(securePrefs).toMatch(
      /if \(secretKey == null\) \{[\s\S]{0,300}prefs\.edit\(\)\.remove\(key\)\.commit\(\)/
    );
  });

  it('descarta payloads corruptos más cortos que el IV', () => {
    expect(securePrefs).toMatch(
      /combined\.length <= GCM_IV_LENGTH[\s\S]{0,300}prefs\.edit\(\)\.remove\(key\)\.commit\(\)/
    );
  });

  it('migra valores legacy en texto plano re-cifrándolos, y borra si no puede', () => {
    expect(securePrefs).toContain('migración desde texto plano legado');
    expect(securePrefs).toContain('boolean migrated = putString(key, raw)');
    expect(securePrefs).toMatch(
      /if \(migrated\) \{[\s\S]{0,200}return raw;[\s\S]{0,400}eliminando entrada no cifrada por seguridad[\s\S]{0,200}return defaultValue/
    );
  });

  it('trata null como borrado en putString', () => {
    expect(securePrefs).toMatch(
      /if \(value == null\) \{\s*return prefs\.edit\(\)\.remove\(key\)\.commit\(\);/
    );
  });

  it('aísla las claves por alias y cae al alias por defecto si viene vacío', () => {
    expect(securePrefs).toContain('DEFAULT_KEY_ALIAS = "GpsTrackerMasterKey"');
    expect(securePrefs).toMatch(
      /keyAlias != null && !keyAlias\.trim\(\)\.isEmpty\(\)[\s\S]{0,120}DEFAULT_KEY_ALIAS/
    );
  });
});

describe('DeviceAuthManager: revocación y backoff exponencial', () => {
  it('aplica backoff exponencial acotado a 1 hora', () => {
    expect(authManager).toContain(
      'long delaySec = Math.min(3600, (long) Math.pow(2, Math.min(failCount, 8)) * 15);'
    );
  });

  it('limpia los contadores de backoff al guardar una sesión válida', () => {
    expect(authManager).toMatch(
      /boolean storeSession[\s\S]{0,600}prefs\.remove\(KEY_AUTH_FAIL_COUNT\);[\s\S]{0,200}prefs\.remove\(KEY_NEXT_AUTH_RETRY\);/
    );
  });

  it('revocar el dispositivo borra el access_token y bloquea el reaprovisionamiento', () => {
    expect(authManager).toMatch(
      /public void markDeviceRevoked\(\) \{[\s\S]{0,200}prefs\.putString\(KEY_DEVICE_REVOKED, "true"\);[\s\S]{0,200}clearAccessToken\(\);/
    );
    expect(authManager).toMatch(
      /public boolean isProvisioned\(\) \{[\s\S]{0,300}"true"\.equals\(prefs\.getString\(KEY_DEVICE_REVOKED, "false"\)\)/
    );
  });

  it('isProvisioned es falso dentro de la ventana de backoff', () => {
    expect(authManager).toMatch(
      /public boolean isProvisioned\(\) \{[\s\S]{0,500}long now = System\.currentTimeMillis\(\) \/ 1000;[\s\S]{0,200}return now >= nextRetry;/
    );
  });

  it('getAccessToken respeta el margen de 60 s antes de renovar', () => {
    expect(authManager).toContain(
      'if (token != null && now < expiresAt - 60) return token;'
    );
  });

  it('realiza la petición de red fuera del bloque synchronized', () => {
    // A6: el lock solo protege la lectura de preferencias; la red va fuera.
    expect(authManager).toContain(
      'A6: Realizar la petición de red fuera del bloque synchronized'
    );
    const lockBlock =
      authManager.match(/synchronized \(GLOBAL_AUTH_LOCK\) \{([\s\S]*?)\n {8}\}/)?.[1] ??
      '';
    expect(lockBlock.length).toBeGreaterThan(0);
    expect(lockBlock).not.toContain('signIn()');
    expect(lockBlock).not.toContain('refreshToken(');
    expect(lockBlock).not.toContain('provision()');
  });

  it('envía el activationCode en el body del POST, no en un header', () => {
    expect(authManager).toContain('body.put("activationCode", activationCode)');
    expect(authManager).not.toContain('x-provision-secret');
  });

  it('respeta la interrupción del hilo en cada etapa del POST', () => {
    const interruptChecks = authManager.match(
      /Thread\.currentThread\(\)\.isInterrupted\(\)/g
    );
    expect(interruptChecks.length).toBeGreaterThanOrEqual(4);
  });

  it('usa un alias de clave propio para no colisionar con el de SecurePreferences', () => {
    expect(authManager).toContain(
      'new SecurePreferences(this.context, PREFS, "GpsTrackerAuthKey")'
    );
  });
});

describe('Arranque en background tras reboot', () => {
  it('BootReceiver lee las credenciales del almacenamiento cifrado por credenciales', () => {
    // Regresión evitada: usar createDeviceProtectedStorageContext() para
    // DeviceAuthManager haría que hasCredentials() devolviera false en silencio.
    expect(bootReceiver).toContain('new DeviceAuthManager(context)');
    expect(bootReceiver).not.toMatch(/new DeviceAuthManager\(safeContext\)/);
    expect(alarmReceiver).toContain('new DeviceAuthManager(context)');
    expect(alarmReceiver).not.toMatch(/new DeviceAuthManager\(safeContext\)/);
  });

  it('usa Device Protected Storage solo para las preferencias de deduplicación', () => {
    expect(bootReceiver).toContain('context.createDeviceProtectedStorageContext()');
    expect(bootReceiver).toContain(
      'safeContext.getSharedPreferences("gps_boot_prefs", Context.MODE_PRIVATE)'
    );
  });

  it('deduplica BOOT_COMPLETED y USER_UNLOCKED en una ventana de 10 s', () => {
    expect(bootReceiver).toContain('if (now - lastHandled < 10_000L)');
    expect(bootReceiver).toContain('Intent.ACTION_BOOT_COMPLETED.equals(action)');
    expect(bootReceiver).toContain('"android.intent.action.USER_UNLOCKED".equals(action)');
  });

  it('pospone el arranque si faltan permisos y deja marca para el onboarding', () => {
    expect(bootReceiver).toContain('PermissionUtils.hasRequiredTrackingPermissions(context)');
    expect(bootReceiver).toContain('putBoolean("pending_perm_prompt", true)');
  });

  it('no intenta autenticarse en Direct Boot: espera a USER_UNLOCKED', () => {
    // Las credenciales viven en credential-encrypted storage, ilegible antes del
    // primer desbloqueo. Con directBootAware el receiver sí se instancia en
    // BOOT_COMPLETED, por eso debe cortar explícitamente en vez de fallar.
    expect(bootReceiver).toContain('!userManager.isUserUnlocked()');
    expect(bootReceiver).toContain('Esperando ACTION_USER_UNLOCKED');
    // La arranque real queda a cargo de USER_UNLOCKED, declarado en el manifest.
    expect(manifest).toContain('android.intent.action.USER_UNLOCKED');
  });

  it('pospone el arranque si el token está en ventana de reintento', () => {
    expect(bootReceiver).toContain('getNextAuthRetrySeconds()');
    expect(bootReceiver).toContain('scheduleRecoveryAlarm(context, delayMs)');
  });

  it('los receivers lanzan MainActivity, ya no un Service eliminado', () => {
    expect(bootReceiver).toContain('new Intent(context, MainActivity.class)');
    expect(bootReceiver).not.toContain('new Intent(context, LocationService.class)');
    expect(bootReceiver).not.toContain('startForegroundService');
    expect(alarmReceiver).toContain('new Intent(context, MainActivity.class)');
    expect(alarmReceiver).not.toContain('new Intent(context, LocationService.class)');
    expect(alarmReceiver).not.toContain('startForegroundService');
  });

  it('usa setAlarmClock en Android 12+ para poder arrancar desde la alarma', () => {
    expect(bootReceiver).toMatch(
      /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.S[\s\S]{0,400}setAlarmClock/
    );
    expect(bootReceiver).toMatch(
      /Build\.VERSION\.SDK_INT >= Build\.VERSION_CODES\.M[\s\S]{0,400}setExactAndAllowWhileIdle/
    );
  });
});

describe('MainActivity: puente de autenticacion nativa', () => {
  it('expone DeviceAuthJavascriptInterface al WebView de Capacitor', () => {
    expect(mainActivity).toContain('addJavascriptInterface');
    expect(mainActivity).toContain('"CapacitorDeviceAuth"');
    expect(mainActivity).toContain('@android.webkit.JavascriptInterface');
    expect(mainActivity).toContain('getDeviceAuthJson');
  });

  it('valida el formato del codigo de activacion antes de persistirlo', () => {
    expect(mainActivity).toMatch(
      /private boolean isValidActivationCode[\s\S]{0,300}\^?\[?A-Za-z0-9_-\]/
    );
  });

  it('enmascara el codigo en los logs de la UI', () => {
    expect(mainActivity).toContain('maskCode');
  });

  it('acepta el codigo por intent extra y por deep link', () => {
    expect(mainActivity).toContain('getStringExtra("activation_code")');
    expect(mainActivity).toContain('getData()');
  });

  it('no loguea el access_token en texto plano', () => {
    expect(mainActivity).not.toMatch(/Log\.[diwev]\([^)]*access_token/);
  });
});

describe('Ocultacion del icono del cajon', () => {
  const activityBlock = () =>
    manifest.slice(
      manifest.indexOf('<activity'),
      manifest.indexOf('</activity>')
    );

  it('deja MAIN + LAUNCHER en un activity-alias, no en MainActivity', () => {
    // La entrada del cajon debe ser un componente aparte: es lo unico que se puede
    // desactivar sin romper los intents explicitos de los receivers.
    expect(manifest).toContain('<activity-alias');
    expect(manifest).toContain('android:name=".LauncherAlias"');
    expect(manifest).toContain('android:targetActivity=".MainActivity"');
    expect(activityBlock()).not.toContain(
      'android.intent.category.LAUNCHER'
    );
    const aliasBlock = manifest.slice(
      manifest.indexOf('<activity-alias'),
      manifest.indexOf('</activity-alias>')
    );
    expect(aliasBlock).toContain('android.intent.category.LAUNCHER');
    expect(aliasBlock).toContain('android:enabled="true"');
  });

  it('mantiene MAIN + CATEGORY_INFO en MainActivity para la notificacion de tracking', () => {
    // getLaunchIntentForPackage() consulta MAIN + CATEGORY_INFO y el plugin lo usa
    // como contentIntent: sin este filtro, tocar la notificacion no abriria la app.
    expect(activityBlock()).toContain('android.intent.category.INFO');
    expect(activityBlock()).toContain('android.intent.action.MAIN');
  });

  it('usa DONT_KILL_APP al desactivar, que es lo que protege el foreground service', () => {
    expect(launcherVisibility).toContain('PackageManager.DONT_KILL_APP');
    expect(launcherVisibility).toMatch(
      /setComponentEnabledSetting\([\s\S]{0,120}state, flags\)/
    );
  });

  it('exige los tres permisos y el aprovisionamiento antes de ocultar el icono', () => {
    expect(launcherVisibility).toContain(
      'PermissionUtils.hasFineLocationPermission(context)'
    );
    expect(launcherVisibility).toContain(
      'PermissionUtils.hasBackgroundLocationPermission(context)'
    );
    expect(launcherVisibility).toContain(
      'PermissionUtils.hasNotificationPermission(context)'
    );
    expect(launcherVisibility).toContain('new DeviceAuthManager(context).isProvisioned()');
  });

  it('sincroniza el icono al terminar el onboarding y en cada resume', () => {
    const onboarding = mainActivity.slice(
      mainActivity.indexOf('private void startOnboardingSequence()'),
      mainActivity.indexOf('private void requestBatteryOptimizationExemptionSequential()')
    );
    expect(onboarding).toContain('LauncherVisibility.sync(this)');
    expect(mainActivity).toMatch(/onResume\(\)[\s\S]{0,600}LauncherVisibility\.sync\(this\)/);
  });

  it('restaura el icono si el propietario revoca permisos o credenciales', () => {
    const sync = launcherVisibility.slice(
      launcherVisibility.indexOf('public static void sync('),
      launcherVisibility.indexOf('public static boolean isFullyConfigured(')
    );
    expect(sync).toMatch(/if \(configured && !hidden\) \{\s*hide\(context\);/);
    expect(sync).toMatch(/else if \(!configured && hidden\) \{\s*show\(context\);/);
  });

  it('deja una via de soporte por deep link para recuperar el icono', () => {
    expect(mainActivity).toContain('private void maybeRestoreLauncherIcon(Intent intent)');
    expect(mainActivity).toContain('LauncherVisibility.show(this)');
    expect(mainActivity).toMatch(/maybeRestoreLauncherIcon\(intent\);/);
  });

  it('no restaura el icono desde setTrackingEnabled(false), que start() emite siempre', () => {
    // gpsTracker.start() llama a this.stop() antes de arrancar, asi que el puente
    // recibe false en cada inicio: mostrar ahi el icono lo haria parpadear.
    const bridge = mainActivity.slice(
      mainActivity.indexOf('public void setTrackingEnabled('),
      mainActivity.indexOf('public void heartbeat(')
    );
    expect(bridge).not.toContain('LauncherVisibility');
  });

  it('no rompe el arranque por boot: los receivers siguen lanzando MainActivity', () => {
    // MainActivity nunca se desactiva, por eso estos intents explicitos siguen
    // funcionando y el tracking sobrevive a un reinicio con el icono oculto.
    expect(bootReceiver).toContain('new Intent(context, MainActivity.class)');
    expect(alarmReceiver).toContain('new Intent(context, MainActivity.class)');
    expect(activityBlock()).toContain('android:exported="true"');
  });
});

describe('AndroidManifest: superficie de permisos', () => {
  it('declara los permisos de tracking necesarios', () => {
    for (const p of [
      'android.permission.INTERNET',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
    ]) {
      expect(manifest).toContain(p);
    }
  });

  it('no declara el permiso de la funcionalidad de comandos de vehiculo retirada', () => {
    expect(manifest).not.toContain('CONTROL_VEHICLE');
  });

  it('mantiene SCHEDULE_EXACT_ALARM, requerido por setAlarmClock y setExactAndAllowWhileIdle', () => {
    expect(manifest).toContain('android.permission.SCHEDULE_EXACT_ALARM');
  });

  it('no declara componentes de la funcionalidad de comandos retirada', () => {
    expect(manifest).not.toContain('VehicleControlReceiver');
    expect(manifest).not.toContain('HardwareRelayReceiver');
    expect(manifest).not.toContain('LocationService');
  });

  it('declara BootReceiver y AlarmRecoveryReceiver como receivers no exportados', () => {
    const bootBlock = manifest.slice(
      manifest.indexOf('.BootReceiver'),
      manifest.indexOf('.AlarmRecoveryReceiver')
    );
    expect(bootBlock).toContain('android:exported="false"');
  });

  it('mantiene el deep link HTTPS con autoVerify y el esquema custom', () => {
    expect(manifest).toContain('android:autoVerify="true"');
    expect(manifest).toContain('android:host="app.gpstracker.com"');
    expect(manifest).toContain('android:pathPrefix="/activate"');
    expect(manifest).toContain('android:scheme="gpstracker" android:host="activate"');
  });

  it('prohibe trafico cleartext y solo permite excepciones de loopback', () => {
    const nsc = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../android/app/src/main/res/xml/network_security_config.xml'
      ),
      'utf-8'
    );
    expect(nsc).toContain('cleartextTrafficPermitted="false"');
    expect(nsc).toContain('10.0.2.2');
  });
});

describe('TrackingWatchdog: supervivencia del proceso', () => {
  it('expone un puente JS que informa del estado y del heartbeat', () => {
    expect(mainActivity).toContain('addJavascriptInterface(new TrackingBridge(), "CapacitorTracking")');
    expect(mainActivity).toContain('TrackingWatchdog.setTrackingEnabled(MainActivity.this, enabled)');
    expect(mainActivity).toContain('TrackingWatchdog.heartbeat(MainActivity.this)');
  });

  it('solo se arma si el seguimiento esta habilitado, para no despertar el dispositivo', () => {
    const setter = watchdog.slice(
      watchdog.indexOf('public static void setTrackingEnabled('),
      watchdog.indexOf('public static void heartbeat(')
    );
    expect(setter).toContain('schedule(context)');
    expect(setter).toContain('cancel(context)');
    // schedule solo en la rama enabled.
    expect(setter.indexOf('if (enabled) {')).toBeLessThan(setter.indexOf('schedule(context)'));
    expect(setter.indexOf('cancel(context)')).toBeGreaterThan(setter.indexOf('schedule(context)'));
  });

  it('considera el seguimiento muerto solo tras el margen de gracia', () => {
    const interval = Number(watchdog.match(/WATCHDOG_INTERVAL_MS\s*=\s*(\d+)L/)[1]);
    const stale = Number(watchdog.match(/STALE_AFTER_MS\s*=\s*(\d+)L/)[1]);
    expect(watchdog).toContain('age <= STALE_AFTER_MS');
    // El margen debe tolerar Doze y arranques lentos: mayor que la cadencia.
    expect(stale).toBeGreaterThan(interval);
  });

  it('usa alarma exacta, que es la que concede el Power Allowlist para relanzar la Activity', () => {
    // Una alarma inexacta NO permitiria el startActivity en background de Android 10+.
    expect(watchdog).toContain('setExactAndAllowWhileIdle');
    expect(watchdog).not.toContain('setInexactRepeating');
  });

  it('re-lanza MainActivity solo cuando el heartbeat esta vencido', () => {
    expect(alarmReceiver).toContain('TrackingWatchdog.ACTION_WATCHDOG_CHECK.equals(action)');
    expect(alarmReceiver).toContain('if (TrackingWatchdog.isAlive(context))');
    expect(alarmReceiver).toContain('relaunchMainActivity(context, "watchdog_launch")');
  });

  it('re-arma el watchdog antes de comprobar, para no desarmarlo ante un fallo', () => {
    expect(alarmReceiver.indexOf('TrackingWatchdog.schedule(context)')).toBeLessThan(
      alarmReceiver.indexOf('TrackingWatchdog.isAlive(context)')
    );
  });

  it('valida credenciales, revocacion, permisos y Direct Boot antes de relanzar', () => {
    const relaunch = alarmReceiver.slice(alarmReceiver.indexOf('private void relaunchMainActivity'));
    expect(relaunch).toContain('!userManager.isUserUnlocked()');
    expect(relaunch).toContain('!authManager.hasCredentials() || authManager.isRevoked()');
    expect(relaunch).toContain('PermissionUtils.hasRequiredTrackingPermissions(context)');
  });
});

describe('gpsTracker: handshake con el watchdog nativo', () => {
  it('notifica la activacion del watcher solo tras addWatcher exitoso', () => {
    // Debe ir DESPUES de addWatcher: si la promesa rechaza, el watchdog no debe
    // quedar armado creyendo que hay seguimiento.
    expect(tracker.indexOf('BackgroundGeolocation.addWatcher(')).toBeLessThan(
      tracker.indexOf('this.nativeSetTrackingEnabled(true)')
    );
  });

  it('envia un heartbeat en cada posicion recibida', () => {
    const cb = tracker.slice(tracker.indexOf('if (location) {'));
    expect(cb.indexOf('this.nativeHeartbeat()')).toBeLessThan(cb.indexOf('this.sendCurrentLocation(pos)'));
  });

  it('desarma el watchdog al detener el seguimiento', () => {
    const stop = tracker.slice(tracker.indexOf('  stop() {'));
    expect(stop).toContain('this.nativeSetTrackingEnabled(false)');
  });

  it('tolera la ausencia del puente en web sin lanzar', () => {
    expect(tracker).toContain('window.CapacitorTracking?.setTrackingEnabled?.(enabled)');
    expect(tracker).toContain('window.CapacitorTracking?.heartbeat?.()');
  });

  it('no deja el guard de start() anulado por el stop() interno', () => {
    // El guard comprobaba watcherId y luego stop() lo borraba: nunca podia dispararse.
    const start = tracker.slice(tracker.indexOf('  async start('), tracker.indexOf('  stop() {'));
    expect(start).not.toContain('Tracker ya iniciado');
    expect(start.indexOf('this.stop()')).toBeLessThan(start.indexOf('this.intervalMs = intervalMs'));
  });
});
