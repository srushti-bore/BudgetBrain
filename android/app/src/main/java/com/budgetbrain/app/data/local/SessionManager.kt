package com.budgetbrain.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.budgetbrain.app.BuildConfig
import com.budgetbrain.app.data.model.User
import com.google.gson.Gson

class SessionManager(context: Context) {

    private val prefs: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "budgetbrain_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        context.getSharedPreferences("budgetbrain_prefs_fallback", Context.MODE_PRIVATE)
    }

    private val gson = Gson()

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_USER = "current_user"
        private const val KEY_CURRENCY = "view_currency"
        private const val KEY_BASE_URL = "api_base_url"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_lock_enabled"
        private const val KEY_DAILY_REMINDER_TIME = "daily_reminder_time"
        private const val KEY_SPEND_ALERT_ENABLED = "spend_alert_enabled"
    }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_ACCESS_TOKEN, token).apply()
    }

    fun getToken(): String? {
        return prefs.getString(KEY_ACCESS_TOKEN, null)
    }

    fun saveUser(user: User) {
        val json = gson.toJson(user)
        prefs.edit().putString(KEY_USER, json).apply()
    }

    fun getUser(): User? {
        val json = prefs.getString(KEY_USER, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun getCurrency(): String {
        return prefs.getString(KEY_CURRENCY, "INR") ?: "INR"
    }

    fun setCurrency(currency: String) {
        prefs.edit().putString(KEY_CURRENCY, currency).apply()
    }

    fun getBaseUrl(): String {
        val defaultUrl = try {
            BuildConfig.BASE_URL
        } catch (e: Exception) {
            "https://budgetbrain-ojnr.onrender.com/api/v1/"
        }
        return prefs.getString(KEY_BASE_URL, defaultUrl) ?: defaultUrl
    }

    fun setBaseUrl(url: String) {
        val formattedUrl = if (url.endsWith("/")) url else "$url/"
        prefs.edit().putString(KEY_BASE_URL, formattedUrl).apply()
    }

    fun isBiometricEnabled(): Boolean {
        return prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false)
    }

    fun setBiometricEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
    }

    fun getDailyReminderTime(): String {
        return prefs.getString(KEY_DAILY_REMINDER_TIME, "21:00") ?: "21:00"
    }

    fun setDailyReminderTime(time: String) {
        prefs.edit().putString(KEY_DAILY_REMINDER_TIME, time).apply()
    }

    fun isSpendAlertEnabled(): Boolean {
        return prefs.getBoolean(KEY_SPEND_ALERT_ENABLED, true)
    }

    fun setSpendAlertEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_SPEND_ALERT_ENABLED, enabled).apply()
    }

    fun isLoggedIn(): Boolean {
        return !getToken().isNullOrBlank()
    }

    fun clearSession() {
        prefs.edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_USER)
            .apply()
    }
}

