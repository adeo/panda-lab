package com.leroymerlin.pandalab.globals.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.support.v4.content.ContextCompat.checkSelfPermission
import com.leroymerlin.pandalab.BuildConfig
import com.leroymerlin.pandroid.utils.DeviceUtils
import com.leroymerlin.pandroid.utils.NetworkUtils

class UtilsPhone {
    companion object {
        fun getPhoneIp() = NetworkUtils.getIPAddress(true)

        fun getPhoneModel() = Build.MODEL

        fun getPhoneProduct() = Build.PRODUCT

        fun getPhoneDevice() = Build.DEVICE

        fun getPhoneManufacturer() = Build.MANUFACTURER

        fun getPhoneBrand() = Build.BRAND

        fun getPhoneAndroidVersion() = android.os.Build.VERSION.RELEASE

        fun getPhoneSerialId(context: Context): String? {
            var serialNumber: String?

            try {
                val c = Class.forName("android.os.SystemProperties")
                val get = c.getMethod("get", String::class.java)

                serialNumber = get.invoke(c, "gsm.sn1") as String

                if (serialNumber == "")
                    serialNumber = get.invoke(c, "ril.serialnumber") as String

                if (serialNumber == "")
                    serialNumber = get.invoke(c, "ro.serialno") as String

                if (serialNumber == "")
                    serialNumber = get.invoke(c, "sys.serialnumber") as String

                if (serialNumber == "")
                    serialNumber = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        if (checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED) {
                            Build.getSerial()
                        } else {
                            Build.SERIAL
                        }
                    } else {
                        Build.SERIAL
                    }
                if (serialNumber == "")
                    serialNumber = null
            } catch (e: Exception) {
                e.printStackTrace()
                serialNumber = null
            }

            return serialNumber
        }
    }
}