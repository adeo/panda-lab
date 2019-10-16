package com.leroymerlin.pandalab.globals.utils

import android.os.Build
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

        fun getPhoneAndroidVersion() = Build.VERSION.RELEASE

    }
}