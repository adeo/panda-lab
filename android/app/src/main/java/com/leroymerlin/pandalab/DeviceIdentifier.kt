package com.leroymerlin.pandalab

import android.content.Context
import android.content.SharedPreferences
import kotlin.reflect.KProperty

class DeviceIdentifier(context: Context) {

    private val sharedPreferences: SharedPreferences by lazy {
        context.applicationContext.getSharedPreferences(DeviceIdentifier.PREF_UNIQUE_ID, Context.MODE_PRIVATE)
    }

    companion object {
        private const val PREF_UNIQUE_ID = "PANDALAB_UUID"
    }

    operator fun getValue(thisRef: Any?, property: KProperty<*>): String? {
        return sharedPreferences.getString(DeviceIdentifier.PREF_UNIQUE_ID, null)
    }

    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: String?) {
        val editor = sharedPreferences.edit()
        editor.putString(DeviceIdentifier.PREF_UNIQUE_ID, value)
        editor.apply()
    }
}