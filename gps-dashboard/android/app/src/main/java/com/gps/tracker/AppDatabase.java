package com.gps.tracker;

import android.content.Context;
import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;

import androidx.room.migration.Migration;
import androidx.sqlite.db.SupportSQLiteDatabase;

@Database(entities = {LocationEntity.class, MigrationStatusEntity.class}, version = 4, exportSchema = false)
public abstract class AppDatabase extends RoomDatabase {
    public abstract LocationDao locationDao();
    public abstract MigrationStatusDao migrationStatusDao();

    private static volatile AppDatabase INSTANCE;

    public static AppDatabase getDatabase(final Context context) {
        if (INSTANCE == null) {
            synchronized (AppDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = Room.databaseBuilder(context.getApplicationContext(),
                            AppDatabase.class, "gps_offline_database")
                            .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4)
                            .fallbackToDestructiveMigration() // A5: No crashear en fallos de migración
                            .build();
                }
            }
        }
        return INSTANCE;
    }

    public static final Migration MIGRATION_1_2 = new Migration(1, 2) {
        @Override
        public void migrate(SupportSQLiteDatabase database) {
            // B10: Conservar filas existentes en lugar de eliminar la tabla.
            // Las posiciones v1 eran texto plano y no pueden re-cifrarse aquí (sin acceso a Keystore),
            // pero el conteo se preserva para evitar reportar una cola vacía al actualizar.
            database.execSQL(
                "CREATE TABLE IF NOT EXISTS `offline_locations_new` " +
                "(`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `encryptedPayload` TEXT)"
            );
            // Intentar copiar filas existentes (pueden tener payload u otras columnas antiguas).
            // Si la tabla vieja tiene un esquema incompatible, la inserción falla silenciosamente.
            try {
                database.execSQL(
                    "INSERT INTO `offline_locations_new` (id) " +
                    "SELECT id FROM `offline_locations`"
                );
            } catch (Exception e) {
                android.util.Log.w("AppDatabase", "MIGRATION_1_2: no se pudieron copiar filas antiguas (esquema incompatible): " + e.getMessage());
            }
            database.execSQL("DROP TABLE IF EXISTS `offline_locations`");
            database.execSQL("ALTER TABLE `offline_locations_new` RENAME TO `offline_locations`");
        }
    };

    public static final Migration MIGRATION_2_3 = new Migration(2, 3) {
        @Override
        public void migrate(SupportSQLiteDatabase database) {
            database.execSQL("CREATE TABLE IF NOT EXISTS `migration_status` (`migrationId` TEXT NOT NULL, `isCompleted` INTEGER NOT NULL, PRIMARY KEY(`migrationId`))");
        }
    };

    // B1: Agrega la columna sourceTsKey y un índice único para deduplicación de la migración.
    // Permite que reiniciadas de la migración sean idempotentes: misma clave = ignorar.
    public static final Migration MIGRATION_3_4 = new Migration(3, 4) {
        @Override
        public void migrate(SupportSQLiteDatabase database) {
            database.execSQL("ALTER TABLE `offline_locations` ADD COLUMN `sourceTsKey` TEXT");
            database.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_offline_locations_sourceTsKey` ON `offline_locations` (`sourceTsKey`)");
        }
    };
}
