package com.gps.tracker;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.Query;
import androidx.room.Delete;
import androidx.room.Transaction;

import java.util.List;

@Dao
public interface LocationDao {
    @Insert
    void insert(LocationEntity location);

    @Insert
    void insertAll(List<LocationEntity> locations);

    // B1: Inserción que ignora conflictos de clave única (sourceTsKey).
    // Usada en migración para que re-ejecuciones sean idempotentes.
    @Insert(onConflict = androidx.room.OnConflictStrategy.IGNORE)
    void insertAllIgnoreConflict(List<LocationEntity> locations);

    // B9: Contar TODOS los registros (migrados y normales) para calcular correctamente el presupuesto de slots.
    @Query("SELECT COUNT(*) FROM offline_locations")
    int getTotalCount();

    @Query("SELECT * FROM offline_locations ORDER BY id ASC LIMIT :limit")
    List<LocationEntity> getOldest(int limit);

    @Delete
    void delete(LocationEntity location);

    @Query("SELECT COUNT(*) FROM offline_locations")
    int getCount();

    @Query("DELETE FROM offline_locations WHERE id IN (SELECT id FROM offline_locations ORDER BY id ASC LIMIT 1)")
    void deleteOldest();

    @Transaction
    default void insertWithLimit(LocationEntity location, int limit) {
        if (getCount() >= limit) {
            deleteOldest();
        }
        insert(location);
    }

    @Transaction
    default void insertAllWithLimit(List<LocationEntity> locations, int limit) {
        for (LocationEntity loc : locations) {
            if (getCount() >= limit) {
                deleteOldest();
            }
            insert(loc);
        }
    }
}
