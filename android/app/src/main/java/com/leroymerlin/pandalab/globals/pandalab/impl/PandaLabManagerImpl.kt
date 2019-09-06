package com.leroymerlin.pandalab.globals.pandalab.impl

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

class PandaLabManagerImpl(private var context: Context) :
    PandaLabManager {


    private var deviceId: DeviceIdentifier =
        DeviceIdentifier(context)
    private val TAG = "PandaLabManagerImpl"

    private var auth: FirebaseAuth = FirebaseAuth.getInstance()
    private var db: FirebaseFirestore = FirebaseFirestore.getInstance()

    override fun updateDevice(): Completable {
        val deviceDoc = getDeviceDocument()
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
