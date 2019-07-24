package com.leroymerlin.pandalab

import android.content.Context
import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import com.leroymerlin.pandalab.globals.pandalab.impl.PandaLabManagerImpl
import com.leroymerlin.pandroid.dagger.PandroidModule
import com.leroymerlin.pandroid.log.LogWrapper
import dagger.Module
import dagger.Provides
import javax.inject.Singleton

@Module(includes = [PandroidModule::class])
class PandaLabModule {

    @Singleton
    @Provides
    fun provideLabPandaManager(context: Context, logWrapper: LogWrapper): PandaLabManager = PandaLabManagerImpl(context, logWrapper)
}