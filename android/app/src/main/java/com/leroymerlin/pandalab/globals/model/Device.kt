package com.leroymerlin.pandalab.globals.model

import com.google.firebase.firestore.DocumentReference
import java.io.Serializable
import java.lang.Exception

data class Device(
    val serialId: String,
    val name: String,
    val ip: String,
    val phoneModel: String,
    val phoneProduct: String,
    val phoneDevice: String,
    val phoneManufacturer: String,
    val phoneBrand: String,
    val phoneAndroidVersion: String,
    val currentServiceVersion: String,
    var lastConnexion: Long,
    val agent: DocumentReference
) : Serializable


enum class DeviceStatus(val lockDevice: Boolean) {
    offline(false),
    working(true),
    available(true),
    booked(false);

    companion object {
        fun secureValueOf(value: String?): DeviceStatus {
            return try {
                valueOf(value!!)
            } catch (ignored: Exception) {
                offline
            }
        }
    }

}