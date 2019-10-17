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
import com.google.gson.GsonBuilder
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
        return this.isEnrolled()
            .filter { it }
            .firstOrError()
            .flatMapObservable {
                getDeviceId()?.let { serialId ->
                    RxFirestore.observeDocumentRef(this.getDeviceDocument(serialId))
                        .map { DeviceStatus.secureValueOf(it.getString("status")) }
                        .toObservable()
                } ?: Observable.error(Error("Device not enrolled"))
            }
    }

    override fun listenDevice(): Observable<Device> {
        return this.isEnrolled()
            .filter { it }
            .firstOrError()
            .flatMapObservable {
                getDeviceId()?.let { serialId ->
                    RxFirestore.observeDocumentRef(this.getDeviceDocument(serialId))
                        .map {
                            val model = getDeviceModel(serialId, getDeviceDocument(serialId))
                            model.lastConnexion = it.getLong("lastConnexion") ?: 0
                            model
                        }
                        .toObservable()
                } ?: Observable.error(Error("Device not enrolled"))
            }
    }

    override fun bookDevice(): Completable {
        return getDeviceId()?.let { serialId ->
            RxFirestore.updateDocument(
                this.getDeviceDocument(serialId),
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
        } ?: Completable.error(Error("Device not enrolled"))


    }

    override fun cancelDeviceBooking(): Completable {
        return getDeviceId()?.let { serialId ->
            RxFirestore.updateDocument(
                this.getDeviceDocument(serialId),
                "status",
                DeviceStatus.offline.name
            ).doOnComplete {
                with(NotificationManagerCompat.from(context)) {
                    this.cancel(bookNotificationId)
                }
            }
        } ?: Completable.error(Error("Device not enrolled"))
    }

    override fun updateDevice(): Completable {
        return getDeviceId()?.let { serialId ->
            val deviceDoc = getDeviceDocument(serialId)
            if (this.auth.currentUser == null) {
                Log.w(TAG, "device is not enrolled")
                return Completable.complete()
            }
            RxFirestore.getDocument(deviceDoc)
                .map { data -> data.getDocumentReference("agent") }
                .map { agentDoc -> getDeviceModel(serialId, agentDoc) }
                .flatMapCompletable { RxFirestore.setDocument(deviceDoc, it, SetOptions.merge()) }
        } ?: Completable.error(Error("Device not enrolled"))
    }

    override fun enroll(serialId: String, token: String, agentId: String): Completable {
        this.deviceId.save(serialId)
        val deviceDoc = getDeviceDocument(serialId)
        this.auth.signOut()
        return RxFirebaseAuth.signInWithCustomToken(this.auth, token)
            .map { getDeviceModel(serialId, this.db.collection("agents").document(agentId)) }
            .flatMapCompletable { RxFirestore.setDocument(deviceDoc, it, SetOptions.merge()) }
            .andThen(subscribeToFirebaseTopic(serialId))


    }


    override fun isEnrolled(): Observable<Boolean> {
        return RxFirebaseAuth.observeAuthState(this.auth)
            .map { it.currentUser != null }
    }

    private fun getDeviceDocument(serialId: String) =
        this.db.collection("devices").document(serialId)

    private fun getDeviceModel(serialId: String, agentDoc: DocumentReference): Device {
        return Device(
            serialId,
            UtilsPhone.getPhoneModel(),
            UtilsPhone.getPhoneIp(true),
            UtilsPhone.getPhoneModel(),
            UtilsPhone.getPhoneProduct(),
            UtilsPhone.getPhoneDevice(),
            UtilsPhone.getPhoneManufacturer(),
            UtilsPhone.getPhoneBrand(),
            UtilsPhone.getPhoneAndroidVersion(),
            Timestamp(System.currentTimeMillis()).time,
            BuildConfig.BUILD_TIME,
            agentDoc
        )
    }

    override fun getDeviceId(): String? {
        return deviceId.getValue()
    }

    private fun subscribeToFirebaseTopic(serialId: String): Completable {
        return Completable.create {
            FirebaseMessaging.getInstance().subscribeToTopic(serialId)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        Log.d(TAG, "Subscription to $serialId firebase topic is successful")
                        it.onComplete()
                    } else {
                        Log.e(TAG, "Subscription to $serialId firebase topic has failed")
                        it.onError(task.exception!!)
                    }
                }
        }
    }

}
