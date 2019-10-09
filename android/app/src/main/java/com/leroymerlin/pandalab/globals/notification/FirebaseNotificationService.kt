package com.leroymerlin.pandalab.globals.notification

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.leroymerlin.pandalab.PandaLabApplication
import com.leroymerlin.pandalab.globals.model.DeviceStatus
import io.reactivex.functions.Action

class FirebaseNotificationService : FirebaseMessagingService() {

    private val TAG = "FirebaseNotification"

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "From: " + remoteMessage.from)

        // Check if message contains a data payload.
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Message data payload: " + remoteMessage.data)
            remoteMessage.data["action"]?.let { action ->
                when (action) {
                    "refresh" -> {
                        PandaLabApplication.getApp(context = this).component.pandaLabManager()
                            .updateDevice()
                            .subscribe({
                                Log.d(TAG, "Device infos updated")
                            }, {
                                Log.e(TAG, "Can't update device infos", it)
                            })
                    }
                    "status" -> {
                        PandaLabApplication.getApp(context = this).component.pandaLabManager()
                            .updateOverlay(
                                DeviceStatus.valueOf(remoteMessage.data["status"] ?: DeviceStatus.offline.name)
                            ).subscribe({
                                Log.d(TAG, "Overlay service opened")
                            }, {
                                Log.e(TAG, "Can't update overlay", it)
                            }, {
                                Log.d(TAG, "Overlay updated")
                            })
                    }
                    else -> {
                        Log.w(TAG, "Can't handle this notification")
                    }
                }

            }
        }

        // Check if message contains a notification payload.
        if (remoteMessage.notification != null) {
            Log.d(TAG, "Message Notification Body: " + remoteMessage.notification!!.body!!)
        }
    }
}