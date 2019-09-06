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
class GenerateUniqueIdReceiver : BroadcastReceiver() {

    //adb shell am broadcast -a com.leroymerlin.pandalab.INTENT.GET_ID -n com.leroymerlin.pandalab/.GenerateUniqueIdReceiver --es transactionId "yourid"

    override fun onReceive(context: Context, intent: Intent) {

        val uniqueId: String = DeviceIdentifier(context).getValue()
        val transactionId = intent.getStringExtra("transactionId")
        val result = hashMapOf(
            "transaction_id" to transactionId,
            "device_id" to uniqueId
        )
        Log.i(transactionId, Gson().toJson(result))

    }

}
//class GenerateUniqueId : AppCompatActivity() {
//
//    companion object {
//        private const val PREF_UNIQUE_ID = "PANDALAB_UUID"
//    }
//
//    private var id: String? by DeviceIdentifier(this)
//
//    override fun onCreate(savedInstanceState: Bundle?) {
//        super.onCreate(savedInstanceState)
//        val transactionId = intent.getStringExtra("transactionId")!!
//        // adb shell am start -n "com.leroymerlin.pandalab/.GenerateUniqueId" --es "transactionId" "mehdi"
//        // adb logcat -d -b main -v raw -s mehdi:D
//        Thread {
//            val uniqueId = this.id ?: UUID.randomUUID().toString().apply {
//                this@GenerateUniqueId.id = this
//            }
//            val result = hashMapOf(
//                "transaction_id" to transactionId,
//                "device_id" to uniqueId
//            )
//            Log.i(transactionId, Gson().toJson(result))
//            finish()
//        }.start()
//    }
//
//
//}
