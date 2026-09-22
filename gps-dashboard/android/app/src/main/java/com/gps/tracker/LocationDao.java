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
}
