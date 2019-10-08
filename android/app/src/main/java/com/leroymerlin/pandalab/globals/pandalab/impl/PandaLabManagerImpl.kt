package com.leroymerlin.pandalab.globals.pandalab.impl

import android.app.PendingIntent
import android.content.Context
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.leroymerlin.pandalab.BuildConfig
import com.leroymerlin.pandalab.globals.model.Device
import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import com.leroymerlin.pandalab.globals.utils.DeviceIdentifier
import com.leroymerlin.pandalab.globals.utils.UtilsPhone
import durdinapps.rxfirebase2.RxFirebaseAuth
import durdinapps.rxfirebase2.RxFirestore
import io.reactivex.Completable
import java.sql.Timestamp
import androidx.core.content.ContextCompat
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.leroymerlin.pandalab.AgentReceiver
import com.leroymerlin.pandalab.OverlayService
import com.leroymerlin.pandalab.R
import com.leroymerlin.pandalab.globals.model.DeviceStatus
import io.reactivex.Maybe
import io.reactivex.Observable
import java.util.concurrent.TimeUnit


class PandaLabManagerImpl(private var context: Context) :
    PandaLabManager {

    private val bookNotificationId = 10

    private var deviceId: DeviceIdentifier =
        DeviceIdentifier(context)
    private val TAG = "PandaLabManagerImpl"

    private var auth: FirebaseAuth = FirebaseAuth.getInstance()
    private var db: FirebaseFirestore = FirebaseFirestore.getInstance()

    override fun updateOverlay(status: DeviceStatus): Maybe<DeviceStatus> {
//        offline = "offline",
//        available = "available",
//        working = "working",
//        booked = "booked",
        if (status.lockDevice) {
            return this.listenDeviceStatus()
                .filter { it == status }
                .firstElement()
                .timeout(5, TimeUnit.SECONDS)
                .doOnSuccess {
                    val serviceIntent = Intent(context, OverlayService::class.java)
                    ContextCompat.startForegroundService(context, serviceIntent)
                }
        }
        return Maybe.empty()
    }

    override fun listenDeviceStatus(): Observable<DeviceStatus> {
        return RxFirestore.observeDocumentRef(this.getDeviceDocument())
            .map { it.getString("status") ?: DeviceStatus.offline.name }
            .map { DeviceStatus.valueOf(it) }
            .toObservable()
    }

    override fun bookDevice(): Completable {
        return RxFirestore.updateDocument(
            this.getDeviceDocument(),
            "status",
            DeviceStatus.booked.name
        ).doOnComplete {
            val notificationIntent = Intent(context, AgentReceiver::class.java)
            notificationIntent.action = "com.leroymerlin.pandalab.INTENT.CANCEL_BOOK"
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                0, notificationIntent, 0
            )

            val notification = NotificationCompat.Builder(context, OverlayService.CHANNEL_ID)
                .setContentTitle("Pandalab device booked")
                .setContentText("Click to release the device")
                .setSmallIcon(R.drawable.ic_close_black)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .build()

            with(NotificationManagerCompat.from(context)) {
                this.notify(bookNotificationId, notification)
            }

        }


    }

    override fun cancelDeviceBooking(): Completable {
        return RxFirestore.updateDocument(
            this.getDeviceDocument(),
            "status",
            DeviceStatus.offline.name
        ).doOnComplete {
            with(NotificationManagerCompat.from(context)) {
                this.cancel(bookNotificationId)
            }
        }
    }

    override fun updateDevice(): Completable {
        val deviceDoc = getDeviceDocument()

        if (this.auth.currentUser == null) {
            Log.w(TAG, "device is not enrolled")
            return Completable.complete()
        }
        return RxFirestore.getDocument(deviceDoc)
            .map { data -> data.getDocumentReference("agent") }
            .map { agentDoc -> getDevice(agentDoc) }
            .flatMapCompletable { RxFirestore.setDocument(deviceDoc, it, SetOptions.merge()) }
    }

    override fun enroll(token: String, agentId: String): Completable {
        val deviceDoc = getDeviceDocument()
        this.auth.signOut()

        return RxFirebaseAuth.signInWithCustomToken(this.auth, token)
            .map { getDevice(this.db.collection("agents").document(agentId)) }
            .flatMapCompletable { RxFirestore.setDocument(deviceDoc, it, SetOptions.merge()) }
            .andThen(subscribeToFirebaseTopic(this.getDeviceId()))


    }


    override fun isLogged(): Boolean {
        return this.auth.currentUser?.let { true } ?: false
    }

    private fun getDeviceDocument() = this.db.collection("devices").document(getDeviceId())

    private fun getDevice(agentDoc: DocumentReference): Device {
        return Device(
            UtilsPhone.getPhoneSerialId(this.context)!!,
            UtilsPhone.getPhoneModel(),
            UtilsPhone.getPhoneIp(true),
            UtilsPhone.getPhoneModel(),
            UtilsPhone.getPhoneProduct(),
            UtilsPhone.getPhoneDevice(),
            UtilsPhone.getPhoneManufacturer(),
            UtilsPhone.getPhoneBrand(),
            UtilsPhone.getPhoneAndroidVersion(),
            BuildConfig.VERSION_NAME,
            Timestamp(System.currentTimeMillis()).time,
            agentDoc
        )
    }

    override fun getDeviceId(): String {
        return deviceId.getValue()
    }

    private fun subscribeToFirebaseTopic(serialId: String): Completable {
        return Completable.create {
            FirebaseMessaging.getInstance().subscribeToTopic(serialId)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        Log.d(TAG, "Subscription to $serialId firebase topic is sucessful")
                        it.onComplete()
                    } else {
                        Log.e(TAG, "Subscription to $serialId firebase topic has failed")
                        it.onError(task.exception!!)
                    }
                }
        }
    }

}
