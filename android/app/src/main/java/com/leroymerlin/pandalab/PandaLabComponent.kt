package com.leroymerlin.pandalab

import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import com.leroymerlin.pandalab.home.HomeActivity
import dagger.Component
import javax.inject.Singleton

@Component(modules = [PandaLabModule::class])
@Singleton
interface PandaLabComponent {

    fun pandaLabManager(): PandaLabManager

    fun inject(homeActivity: HomeActivity)
}