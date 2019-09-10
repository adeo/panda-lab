package com.leroymerlin.pandalab.globals.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat.checkSelfPermission
import java.net.Inet4Address
import java.net.Inet6Address
import java.net.NetworkInterface
import java.util.*


class UtilsPhone {
    companion object {
        fun getPhoneIp(useIPv4: Boolean): String {
            try {
                val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
                for (intf in interfaces) {
                    val addrs = Collections.list(intf.getInetAddresses())
                    for (addr in addrs) {
                        if (!addr.isLoopbackAddress()) {
                            val sAddr = addr.getHostAddress().toUpperCase()
                            if (useIPv4) {
                                if (addr is Inet4Address)
                                    return sAddr
                            } else {
                                if (addr is Inet6Address) {
                                    val delim = sAddr.indexOf('%') // drop ip6 port suffix
                                    return if (delim < 0) sAddr else sAddr.substring(0, delim)
                                }
                            }
                        }
                    }
                }
            } catch (ex: Exception) {
            }
            // for now eat exceptions
            return ""
        }

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
                        if (checkSelfPermission(
                                context,
                                Manifest.permission.READ_PHONE_STATE
                            ) == PackageManager.PERMISSION_GRANTED
                        ) {
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