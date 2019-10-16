package com.leroymerlin.pandalab.globals.utils

import android.content.Context
import android.content.SharedPreferences

class DeviceIdentifier(context: Context) {

    private val sharedPreferences: SharedPreferences by lazy {
        context.applicationContext.getSharedPreferences(PREF_SERIAL_ID, Context.MODE_PRIVATE)
    }

    companion object {
        private const val PREF_SERIAL_ID = "PANDALAB_UUID"
    }

    fun getValue(): String? {
        return sharedPreferences.getString(PREF_SERIAL_ID, null)
    }

    fun save(serialId: String) {
        return sharedPreferences.edit().putString(PREF_SERIAL_ID, serialId).apply()
    }
}