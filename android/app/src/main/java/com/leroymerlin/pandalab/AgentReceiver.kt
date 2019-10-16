package com.leroymerlin.pandalab

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.gson.Gson
import com.leroymerlin.pandalab.globals.utils.DeviceIdentifier


/**
 * For run this activity with adb :
 * adb shell am start -n "com.leroymerlin.pandalab/.GenerateUniqueId" --es "transactionId" "<TRANSACTION ID>"
 */
class AgentReceiver : BroadcastReceiver() {

    //adb shell am broadcast -a com.leroymerlin.pandalab.INTENT.GET_ID -n com.leroymerlin.pandalab/.AgentReceiver --es transactionId "yourid"

    companion object {
        val TAG = "AgentReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {

        when (intent.action) {
            "com.leroymerlin.pandalab.INTENT.ENROLL" -> {

                val agent = intent.getStringExtra("agent_id")
                val token = intent.getStringExtra("token_id")
                val serialId = intent.getStringExtra("serial_id")

                PandaLabApplication.getApp(context).component.pandaLabManager()
                    .enroll(serialId, token, agent).subscribe({
                    Log.d(TAG, "device enrolled")
                }, {
                    Log.e(TAG, "can't enroll device", it)
                })

            }
            "com.leroymerlin.pandalab.INTENT.BOOK" -> {
                PandaLabApplication.getApp(context).component.pandaLabManager().bookDevice()
                    .subscribe({
                        Log.d(TAG, "device booked")
                    }, {
                        Log.e(TAG, "can't book device", it)
                    })
            }
            "com.leroymerlin.pandalab.INTENT.CANCEL_BOOK" -> {
                PandaLabApplication.getApp(context).component.pandaLabManager()
                    .cancelDeviceBooking()
                    .subscribe({
                        Log.d(TAG, "booking canceled")
                    }, {
                        Log.e(TAG, "can't cancel device booking", it)
                    })
            }

        }


    }

}