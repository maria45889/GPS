package com.gps.tracker;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

public class EncryptionUtils {
    private static final String TAG = "EncryptionUtils";
    private static final String KEY_ALIAS = "gps_location_key";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private static SecretKey getOrCreateSecretKey() {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            
            if (!keyStore.containsAlias(KEY_ALIAS)) {
                KeyGenerator keyGenerator = KeyGenerator.getInstance(
                        KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
                
                KeyGenParameterSpec keySpec = new KeyGenParameterSpec.Builder(
                        KEY_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(256)
                        .build();
                
                keyGenerator.init(keySpec);
                return keyGenerator.generateKey();
            } else {
                return ((KeyStore.SecretKeyEntry) keyStore.getEntry(KEY_ALIAS, null)).getSecretKey();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting or creating secret key", e);
            return null;
        }
    }

    public static String encrypt(String plainText) {
        if (plainText == null) return null;
        try {
            SecretKey secretKey = getOrCreateSecretKey();
            if (secretKey == null) return null; // Fail securely if keystore fails

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            
            byte[] iv = cipher.getIV();
            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            
            // Combine IV and encrypted bytes
            byte[] combined = new byte[iv.length + encryptedBytes.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);
            
            return Base64.encodeToString(combined, Base64.DEFAULT);
        } catch (Exception e) {
            Log.e(TAG, "Encryption failed", e);
            return null; // Fail securely
        }
    }

    public static String decrypt(String encryptedText) {
        if (encryptedText == null) return null;
        try {
            SecretKey secretKey = getOrCreateSecretKey();
            if (secretKey == null) return null; // Fail securely

            byte[] combined = Base64.decode(encryptedText, Base64.DEFAULT);
            if (combined == null || combined.length < GCM_IV_LENGTH) {
                // Not encrypted or corrupted
                return null;
            }

            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
            
            byte[] encryptedBytes = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, GCM_IV_LENGTH, encryptedBytes, 0, encryptedBytes.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);
            
            byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
            
            // Basic JSON validation since our payload is always JSON
            String decryptedStr = new String(decryptedBytes, StandardCharsets.UTF_8);
            if (!decryptedStr.startsWith("{") && !decryptedStr.startsWith("[")) {
                return null; // Invalid payload
            }
            return decryptedStr;
        } catch (Exception e) {
            Log.e(TAG, "Decryption failed", e);
            return null; // Fail securely
        }
    }
}
