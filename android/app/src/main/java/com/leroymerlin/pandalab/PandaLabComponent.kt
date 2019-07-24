package com.leroymerlin.pandalab

import com.leroymerlin.pandalab.home.HomeActivity
import com.leroymerlin.pandroid.dagger.PandroidComponent
import com.leroymerlin.pandroid.dagger.PandroidModule
import dagger.Component
import javax.inject.Singleton

@Component(modules = [ PandroidModule::class, PandaLabModule::class])
@Singleton
interface PandaLabComponent : PandroidComponent {
    fun inject(homeActivity: HomeActivity)
    fun inject(pandaLabApplication: PandaLabApplication)
}