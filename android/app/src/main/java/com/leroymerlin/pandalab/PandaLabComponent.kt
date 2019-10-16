package com.leroymerlin.pandalab

import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import dagger.Component
import javax.inject.Singleton

@Component(modules = [PandaLabModule::class])
@Singleton
interface PandaLabComponent {

    fun pandaLabManager(): PandaLabManager

    fun inject(homeActivity: HomeActivity)

    fun inject(infosActivity: InfosActivity)

    fun inject(overlayService: OverlayService)
}