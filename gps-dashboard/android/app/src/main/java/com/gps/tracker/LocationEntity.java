package com.gps.tracker;

import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "offline_locations")
public class LocationEntity {
    @PrimaryKey(autoGenerate = true)
    public int id;

    public String encryptedPayload;
}
