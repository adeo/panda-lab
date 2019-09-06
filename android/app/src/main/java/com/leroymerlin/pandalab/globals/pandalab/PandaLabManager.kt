package com.leroymerlin.pandalab.globals.pandalab

import io.reactivex.Completable


interface PandaLabManager {
    fun updateDevice(): Completable
    fun enroll(token: String, agentId: String): Completable
    fun isLogged(): Boolean
    fun getDeviceId(): String
}