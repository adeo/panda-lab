package com.leroymerlin.pandalab.globals.utils

import android.content.Context
import android.content.SharedPreferences
import java.util.*

class DeviceIdentifier(context: Context) {

    private val sharedPreferences: SharedPreferences by lazy {
        context.applicationContext.getSharedPreferences(PREF_UNIQUE_ID, Context.MODE_PRIVATE)
    }

    companion object {
        private const val PREF_UNIQUE_ID = "PANDALAB_UUID"
    }

    fun getValue(): String {
        var uuid = sharedPreferences.getString(PREF_UNIQUE_ID, null)
        if (uuid == null) {
            uuid = UUID.randomUUID().toString()
            val editor = sharedPreferences.edit()
            editor.putString(PREF_UNIQUE_ID, uuid)
            editor.apply()
        }
        return uuid
    }
}