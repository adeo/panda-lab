package com.leroymerlin.pandalab.globals.pandalab

import android.app.Activity
import com.google.firebase.auth.FirebaseUser
import com.leroymerlin.pandalab.globals.model.Device
import io.reactivex.Completable
import io.reactivex.Single

interface PandaLabManager {
    fun updateDevice(key: String, agentId: String): Completable
    fun subscribeToFirebaseTopic(serialId: String): Completable
    fun loginToFirebase(activity: Activity, firebaseToken: String): Single<FirebaseUser>
    fun getCurrentUser(): FirebaseUser?
}