package com.leroymerlin.pandalab.home

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.leroymerlin.pandalab.BuildConfig
import com.leroymerlin.pandalab.PandaLabApplication
import com.leroymerlin.pandalab.R
import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import com.leroymerlin.pandalab.globals.utils.UtilsPhone
import io.reactivex.disposables.Disposable
import kotlinx.android.synthetic.main.activity_home.*
import javax.inject.Inject
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings.canDrawOverlays
import android.provider.Settings
import com.google.android.material.snackbar.Snackbar
import com.leroymerlin.pandalab.globals.model.DeviceStatus


class HomeActivity : AppCompatActivity() {

    private var statusSub: Disposable? = null
    private val tag = "HomeActivity"
    private val REQUEST_OVERLAY_PERMISSION = 1000

    private var disposable: Disposable? = null

    @Inject
    lateinit var pandaLabManager: PandaLabManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)
        PandaLabApplication.getApp(this).component.inject(this)
        initView()
    }

    override fun onResume() {
        super.onResume()
        if (PackageManager.PERMISSION_GRANTED != ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_PHONE_STATE
            )
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.READ_PHONE_STATE),
                101
            )
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !canDrawOverlays(this)) {
            val mySnackbar = Snackbar.make(
                findViewById(R.id.home_coordinator),
                R.string.overlay_perms,
                Snackbar.LENGTH_INDEFINITE
            )
            mySnackbar.setAction(android.R.string.ok) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION)
            }
            mySnackbar.show()
        }
        findViewById<View>(R.id.free_device_button).setOnClickListener {
            pandaLabManager.cancelDeviceBooking()
                .subscribe({
                    Log.e(tag, "device booking canceled")
                }, {
                    Log.e(tag, "Can't cancel device booking", it)

                })
        }

        statusSub = pandaLabManager.listenDeviceStatus()
            .subscribe({ status ->
                findViewById<View>(R.id.free_device_button).visibility =
                    if (status == DeviceStatus.booked) {
                        View.VISIBLE;
                    } else {
                        View.GONE;
                    }
            }, { error ->
                Log.e(tag, "Can't listen status", error)
            })
    }

    override fun onPause() {
        super.onPause()
        statusSub?.dispose()
    }

    @SuppressLint("MissingPermission")
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>, grantResults: IntArray
    ) {
        when (requestCode) {
            101 -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                } else {
                    // permission denied
                }
                return
            }
        }
    }

    private fun enroll(
        firebaseToken: String,
        agentId: String
    ) {
        dispose()
        disposable = pandaLabManager.enroll(firebaseToken, agentId)
            .doOnError {
                Log.e(tag, it.message)
            }
            .onErrorComplete()
            .doOnSubscribe {
                sync_progress.visibility = View.VISIBLE
            }.doOnComplete {
                sync_progress.visibility = View.GONE
            }.doOnError {
                Toast.makeText(this, getString(R.string.errorNetwork), Toast.LENGTH_LONG).show()
            }.doOnTerminate {
                disposable = null
            }.subscribe({
                Log.w(tag, "Device successfully added to firestore")
            }, { error ->
                Log.e(tag, "Error during adding device to firestore: ${error.message}")
            })
    }

    private fun initView() {
        lastConnexion.text = "0"
        ip.text = UtilsPhone.getPhoneIp(true)
        serialId.text = UtilsPhone.getPhoneSerialId(this)
        androidVersion.text = UtilsPhone.getPhoneAndroidVersion()
        currentServiceVersion.text = BuildConfig.VERSION_NAME
        model.text = UtilsPhone.getPhoneModel()
        product.text = UtilsPhone.getPhoneProduct()
        device.text = UtilsPhone.getPhoneDevice()
        manufacturer.text = UtilsPhone.getPhoneManufacturer()
        brand.text = UtilsPhone.getPhoneBrand()


        enroll.text = if (!pandaLabManager.isLogged()) {
            getString(R.string.no_enroll)
        } else {
            getString(R.string.enroll_with_identifier, this.pandaLabManager.getDeviceId())
        }

        update_button.setOnClickListener {
            pandaLabManager.updateDevice().doOnSubscribe {
                sync_progress?.visibility = View.VISIBLE
            }.doOnTerminate {
                sync_progress?.visibility = View.GONE
            }.subscribe({
                Log.i(tag, "device updated")
            }, {
                Log.e(tag, "can't update device", it)
            })
        }
    }

    private fun dispose() {
        disposable?.dispose()
    }

    override fun onDestroy() {
        dispose()
        super.onDestroy()
    }

}
