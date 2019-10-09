package com.leroymerlin.pandalab

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.WindowManager.LayoutParams
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.TextView
import androidx.annotation.Nullable
import androidx.core.app.NotificationCompat
import com.leroymerlin.pandalab.globals.model.DeviceStatus
import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import io.reactivex.android.schedulers.AndroidSchedulers
import io.reactivex.disposables.Disposable
import java.util.concurrent.TimeUnit
import javax.inject.Inject


class OverlayService : Service() {

    val TAG = "OverlayService"

    private lateinit var windowManager: WindowManager
    @Inject
    lateinit var pandaLabManager: PandaLabManager

    private var subScription: Disposable? = null
    private var floatyView: View? = null
    private var floatyText: TextView? = null


    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        PandaLabApplication.getApp(this).component.inject(this)
        addOverlayView()
        val notificationIntent = Intent(this, AgentReceiver::class.java)
        notificationIntent.action = "com.leroymerlin.pandalab.INTENT.BOOK"
        val pendingIntent = PendingIntent.getBroadcast(
            this,
            0, notificationIntent, 0
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Pandalab is using this phone")
            .setContentText("Click to book the device")
            .setSmallIcon(R.drawable.ic_close_black)
            .setContentIntent(pendingIntent)
            .build()


        startForeground(1, notification)

        subScription = pandaLabManager.listenDeviceStatus()
            .observeOn(AndroidSchedulers.mainThread())
            .subscribe(
                { status ->
                    if (!status.lockDevice) {
                        closeService()
                    }else{
                        floatyText?.text =
                            if(status == DeviceStatus.available){
                                getString(R.string.overlay_label_available)
                            }else{
                                getString(R.string.overlay_label_working)
                            }

                    }
                },
                { error ->
                    Log.e(TAG, "error listening status", error)
                    closeService()
                }
            )

    }


    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_NOT_STICKY
    }

    private fun closeService() {
        stopForeground(true)
        stopSelf()
    }



    private fun addOverlayView() {

        val layoutParamsType: Int =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                LayoutParams.TYPE_PHONE
            }

        val params = LayoutParams(
            LayoutParams.MATCH_PARENT,
            LayoutParams.MATCH_PARENT,
            layoutParamsType,
            0,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER or Gravity.START
            x = 0
            y = 0
        }

        val inflater = getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater?

        inflater?.let {
            floatyView = inflater.inflate(R.layout.overlay, null)
            floatyView?.setOnClickListener {}
            this.floatyText = floatyView?.findViewById<TextView>(R.id.overlay_label)
            floatyView?.findViewById<View>(R.id.overlay_btn_close)
                ?.setOnClickListener {
                    pandaLabManager.bookDevice()
                        .subscribe({
                            Log.d(TAG, "device booked")
                        }, { error ->
                            Log.e(TAG, "can't book device", error)
                        })
                }
            windowManager.addView(floatyView, params)
        }
    }

    @Nullable
    override fun onBind(intent: Intent): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        subScription?.dispose()
        floatyView = floatyView?.let {
            windowManager.removeView(floatyView)
            floatyText = null
            null
        }
    }


    companion object {
        val CHANNEL_ID = "OverlayServiceChannel"


        fun createNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val serviceChannel = NotificationChannel(
                    CHANNEL_ID,
                    "Foreground Service Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
                )

                val manager = context.getSystemService(NotificationManager::class.java)
                manager.createNotificationChannel(serviceChannel)
            }
        }
    }

}