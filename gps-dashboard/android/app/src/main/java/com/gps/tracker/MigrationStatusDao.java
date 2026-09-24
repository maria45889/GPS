package com.gps.tracker;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

@Dao
public interface MigrationStatusDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertOrUpdate(MigrationStatusEntity status);

    @Query("SELECT * FROM migration_status WHERE migrationId = :migrationId")
    MigrationStatusEntity getMigrationStatus(String migrationId);
}
