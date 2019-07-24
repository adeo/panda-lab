package com.leroymerlin.pandalab

import com.leroymerlin.pandroid.PandroidApplication
import com.leroymerlin.pandroid.dagger.BaseComponent
import com.leroymerlin.pandroid.dagger.PandroidModule

class PandaLabApplication: PandroidApplication() {

    override fun createBaseComponent(): BaseComponent {
        return DaggerPandaLabComponent.builder()
            .pandroidModule(PandroidModule(this))
            .pandaLabModule(PandaLabModule())
            .build()
    }

    override fun onCreate() {
        super.onCreate()
    }
}