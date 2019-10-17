package com.leroymerlin.pandalab

import android.content.Context
import android.util.Log
import androidx.multidex.MultiDexApplication
import com.leroymerlin.pandalab.globals.model.DeviceStatus

class PandaLabApplication : MultiDexApplication() {

    companion object {

        val TAG = "PandaLabApplication"
        fun getApp(context: Context): PandaLabApplication {
            return context.applicationContext as PandaLabApplication
        }
    }

    val component: PandaLabComponent by lazy { createBaseComponent() }


    override fun onCreate() {
        super.onCreate()
        OverlayService.createNotificationChannel(this)

        val disposable = component.pandaLabManager().listenDeviceStatus()
            .flatMapMaybe { s: DeviceStatus -> component.pandaLabManager().updateOverlay(s) }
            .retry()
            .subscribe(
                { Log.i(TAG, "get new status : $it")},
                { Log.e(TAG, "can not listen status", it) }
            )

    }

    private fun createBaseComponent(): PandaLabComponent {
        return DaggerPandaLabComponent.builder()
            .pandaLabModule(PandaLabModule(this))
            .build()
    }

}