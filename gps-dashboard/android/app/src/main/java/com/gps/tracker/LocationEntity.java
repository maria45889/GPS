package com.gps.tracker;

import androidx.room.ColumnInfo;
import androidx.room.Entity;
import androidx.room.Index;
import androidx.room.PrimaryKey;

// B1: sourceTsKey es la clave de deduplicación para la migración de SharedPreferences → Room.
// Se deriva del timestamp del evento GPS (texto plano, no cifrado) para que inserciones
// repetidas durante una migración reiniciada sean silenciosamente ignoradas (IGNORE conflict).
@Entity(
    tableName = "offline_locations",
    indices = {@Index(value = {"sourceTsKey"}, unique = true)}
)
public class LocationEntity {
    @PrimaryKey(autoGenerate = true)
    public int id;

    public String encryptedPayload;

    @ColumnInfo(name = "sourceTsKey")
    public String sourceTsKey; // null para registros normales; timestamp ISO para migrados
}
