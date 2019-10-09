package com.leroymerlin.pandalab

import android.app.Application
import android.content.Context

class PandaLabApplication : Application() {

    companion object {

        fun getApp(context: Context): PandaLabApplication {
            return context.applicationContext as PandaLabApplication
        }
    }

    val component: PandaLabComponent by lazy { createBaseComponent() }


    override fun onCreate() {
        super.onCreate()
        OverlayService.createNotificationChannel(this)
    }

    private fun createBaseComponent(): PandaLabComponent {
        return DaggerPandaLabComponent.builder()
            .pandaLabModule(PandaLabModule(this))
            .build()
    }

}