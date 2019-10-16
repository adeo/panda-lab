package com.leroymerlin.pandalab.globals.pandalab

import com.leroymerlin.pandalab.globals.model.Device
import com.leroymerlin.pandalab.globals.model.DeviceStatus
import io.reactivex.Completable
import io.reactivex.Maybe
import io.reactivex.Observable


interface PandaLabManager {
    fun updateDevice(): Completable
    fun enroll(serialId: String, token: String, agentId: String): Completable
    fun isEnrolled(): Observable<Boolean>
    fun getDeviceId(): String?
    fun updateOverlay(status: DeviceStatus): Maybe<DeviceStatus>
    fun listenDeviceStatus(): Observable<DeviceStatus>
    fun bookDevice(): Completable
    fun cancelDeviceBooking(): Completable
    fun listenDevice(): Observable<Device>
}