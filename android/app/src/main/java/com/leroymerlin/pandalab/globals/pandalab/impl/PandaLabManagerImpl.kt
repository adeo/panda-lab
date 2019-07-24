package com.leroymerlin.pandalab.globals.pandalab.impl

import android.app.Activity
import android.content.Context
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import com.leroymerlin.pandalab.BuildConfig
import com.leroymerlin.pandalab.globals.model.Device
import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import com.leroymerlin.pandalab.globals.utils.UtilsPhone
import com.leroymerlin.pandroid.log.LogWrapper
import io.reactivex.Completable
import io.reactivex.Single
import java.sql.Timestamp

class PandaLabManagerImpl(private var context: Context, private var logWrapper: LogWrapper) : PandaLabManager {

    private val TAG = "PandaLabManagerImpl"

    private var auth: FirebaseAuth = FirebaseAuth.getInstance()
    private var db: FirebaseFirestore = FirebaseFirestore.getInstance()

    companion object {
        const val DEVICE_DB = "devices"
    }

    private fun getDevice(agentId: String): Device {
        return Device(
            UtilsPhone.getPhoneSerialId(this.context)!!,
            UtilsPhone.getPhoneModel(),
            UtilsPhone.getPhoneIp(),
            UtilsPhone.getPhoneModel(),
            UtilsPhone.getPhoneProduct(),
            UtilsPhone.getPhoneDevice(),
            UtilsPhone.getPhoneManufacturer(),
            UtilsPhone.getPhoneBrand(),
            UtilsPhone.getPhoneAndroidVersion(),
            BuildConfig.VERSION_NAME,
            Timestamp(System.currentTimeMillis()).time,
            this.db.collection("agents").document(agentId)
        )
    }

    override fun updateDevice(
        key: String,
        agentId: String
    ): Completable {
        return Completable.create { emitter ->
            db.collection(DEVICE_DB)
                .document(key)
                .set(getDevice(agentId))
                .addOnSuccessListener {
                    logWrapper.d(TAG, "Device added in firestore with ID: $key")
                    emitter.onComplete()
                }
                .addOnFailureListener { error ->
                    logWrapper.e(TAG, "Error adding device in firestore", error)
                    emitter.onError(error)
                }
        }
    }

    override fun subscribeToFirebaseTopic(serialId: String): Completable {
        return Completable.create {
            FirebaseMessaging.getInstance().subscribeToTopic(serialId)
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        logWrapper.d(TAG, "Subscription to $serialId firebase topic is sucessful")
                        it.onComplete()
                    } else {
                        logWrapper.e(TAG, "Subscription to $serialId firebase topic has failed")
                        it.onError(task.exception!!)
                    }
                }
        }
    }

    override fun loginToFirebase(activity: Activity, firebaseToken: String): Single<FirebaseUser> {
        return Single.create {
            auth.signInWithCustomToken(firebaseToken)
                .addOnCompleteListener(activity) { task ->
                    if (task.isSuccessful) {
                        logWrapper.d(TAG, "signInAnonymously:success")
                        it.onSuccess(auth.currentUser!!)
                    } else {
                        logWrapper.e(TAG, "signInAnonymously:failure", task.exception)
                        it.onError(Exception(task.exception))
                    }
                }
        }
    }

    override fun getCurrentUser(): FirebaseUser? {
        return auth.currentUser
    }

//    private fun isGooglePlayServicesAvailable(context: Context): Boolean {
//        val googleApiAvailability: GoogleApiAvailability = GoogleApiAvailability.getInstance()
//        val status: Int = googleApiAvailability.isGooglePlayServicesAvailable(context)
//
//        if (status != ConnectionResult.SUCCESS) {
//            return false
//        }
//        return true
//    }
}
