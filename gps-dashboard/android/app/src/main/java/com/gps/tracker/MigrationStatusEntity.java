package com.gps.tracker;

import androidx.room.Entity;
import androidx.room.PrimaryKey;
import androidx.annotation.NonNull;

@Entity(tableName = "migration_status")
public class MigrationStatusEntity {
    @PrimaryKey
    @NonNull
    public String migrationId;

    public boolean isCompleted;

    public MigrationStatusEntity(@NonNull String migrationId, boolean isCompleted) {
        this.migrationId = migrationId;
        this.isCompleted = isCompleted;
    }
}
