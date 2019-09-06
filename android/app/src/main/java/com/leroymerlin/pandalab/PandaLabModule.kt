package com.leroymerlin.pandalab

import android.app.Application
import android.content.Context
import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import com.leroymerlin.pandalab.globals.pandalab.impl.PandaLabManagerImpl
import dagger.Module
import dagger.Provides
import javax.inject.Singleton

@Module
class PandaLabModule(val context: Application) {

    @Singleton
    @Provides
    fun provideContext(): Context = this.context

    @Singleton
    @Provides
    fun provideLabPandaManager(context: Context): PandaLabManager =
        PandaLabManagerImpl(context)
}