package com.leroymerlin.pandalab

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.provider.Settings.canDrawOverlays
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import io.reactivex.disposables.Disposable
import kotlinx.android.synthetic.main.activity_home.*
import javax.inject.Inject


class HomeActivity : Activity() {

    private var isEnrollSub: Disposable? = null;
    private val TAG = "HomeActivity"
    private val REQUEST_OVERLAY_PERMISSION = 1000
    private val REQUEST_STATUS_PERMISSION = 1001
    var finishProcess = false

    @Inject
    lateinit var pandaLabManager: PandaLabManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)
        PandaLabApplication.getApp(this).component.inject(this)

        home_btn_perm.setOnClickListener {
            checkPermissions(true)
        }

        home_btn_perm.visibility = if (checkPermissions(false)) View.GONE else View.VISIBLE
    }


    fun checkPermissions(request: Boolean): Boolean {
        if (PackageManager.PERMISSION_GRANTED != ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_PHONE_STATE
            )
        ) {
            if (request) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.READ_PHONE_STATE),
                    REQUEST_STATUS_PERMISSION
                )
            }
            return false
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !canDrawOverlays(this)) {
            if (request) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION)
            }
            return false
        }
        return true
    }

    override fun onResume() {
        super.onResume()
        isEnrollSub = this.pandaLabManager.isEnrolled()
            .subscribe({ isEnrolled ->
                if (isEnrolled) {
                    finishProcess()
                }
            }, {
                Log.e(TAG, "can't listen enroll status", it)
                Toast.makeText(this, "Can't listen enroll status, check adb log", Toast.LENGTH_LONG)
                    .show()
                //finish()
            })

    }

    private fun finishProcess() {
        finishProcess = true
        if (checkPermissions(true)) {
            finish()
            startActivity(Intent(this, InfosActivity::class.java))
        }
    }

    override fun onPause() {
        super.onPause()
        isEnrollSub?.dispose()
    }

    @SuppressLint("MissingPermission")
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>, grantResults: IntArray
    ) {

        if (finishProcess) {
            finishProcess()
        } else {
            checkPermissions(true)
        }
//        when (requestCode) {
//            101 -> {
//                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
//
//                } else {
//                    // permission denied
//                }
//                return
//            }
//        }
    }


    override fun onDestroy() {
        super.onDestroy()
    }

}
