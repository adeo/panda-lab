package com.leroymerlin.pandalab.home

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.support.v4.app.ActivityCompat
import android.support.v4.content.ContextCompat
import android.util.Log
import android.widget.Toast
import com.leroymerlin.pandalab.BuildConfig
import com.leroymerlin.pandalab.DeviceIdentifier
import com.leroymerlin.pandalab.R
import com.leroymerlin.pandalab.globals.model.Device
import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import com.leroymerlin.pandalab.globals.utils.UtilsPhone
import com.leroymerlin.pandroid.app.PandroidActivity
import com.leroymerlin.pandroid.event.opener.ActivityOpener
import io.reactivex.disposables.Disposable
import kotlinx.android.synthetic.main.activity_home.*
import java.sql.Timestamp
import javax.inject.Inject


class HomeActivity : PandroidActivity<ActivityOpener>() {

    private val tag = "HomeActivity"

    private var disposable: Disposable? = null

    private var deviceId: String? by DeviceIdentifier(this)

    @Inject
    lateinit var pandaLabManager: PandaLabManager

    companion object {
        const val DEVICE_TOKEN = "token"
        const val AGENT_ID = "agentId"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        initView()

        intent.getStringExtra(DEVICE_TOKEN)
            ?.let {
                val agentId = intent.getStringExtra(AGENT_ID)
                subscribeToPushNotificationAndLoginToFirebase(it, agentId)
            }
            ?: also {
                Toast.makeText(this, getString(R.string.errorToken), Toast.LENGTH_LONG).show()
            }

        if (PackageManager.PERMISSION_GRANTED != ContextCompat.checkSelfPermission(
                this,
                android.Manifest.permission.READ_PHONE_STATE
            )
        ) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.READ_PHONE_STATE), 101)
        }
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

    override fun onStart() {
        super.onStart()

        val currentUser = pandaLabManager.getCurrentUser()
        if (currentUser != null) {
            logWrapper.w(tag, currentUser.uid)
        }
    }

    private fun subscribeToPushNotificationAndLoginToFirebase(firebaseToken: String, agentId: String) {
        dispose()
        disposable = pandaLabManager.subscribeToFirebaseTopic(UtilsPhone.getPhoneSerialId(this)!!)
            .doOnError {
                logWrapper.e(tag, it.message)
            }
            .onErrorComplete()
            .andThen(pandaLabManager.loginToFirebase(this, firebaseToken))
            .flatMapCompletable {
                pandaLabManager.updateDevice(it.uid, agentId)
            }
            .doOnSubscribe {
                sync_progress.spin()
            }.doOnComplete {
                sync_progress.stopSpinning()
            }.doOnError {
                sync_progress.stopSpinning()
                Toast.makeText(this, getString(R.string.errorNetwork), Toast.LENGTH_LONG).show()
            }.doOnTerminate {
                disposable = null
            }.subscribe({
                logWrapper.w(tag, "Device successfully added to firestore")
            }, { error ->
                logWrapper.e(tag, "Error during adding device to firestore: ${error.message}")
            })
    }

    private fun initView() {
        lastConnexion.text = "0"
        ip.text = UtilsPhone.getPhoneIp()
        serialId.text = UtilsPhone.getPhoneSerialId(this)
        androidVersion.text = UtilsPhone.getPhoneAndroidVersion()
        currentServiceVersion.text = BuildConfig.VERSION_NAME
        model.text = UtilsPhone.getPhoneModel()
        product.text = UtilsPhone.getPhoneProduct()
        device.text = UtilsPhone.getPhoneDevice()
        manufacturer.text = UtilsPhone.getPhoneManufacturer()
        brand.text = UtilsPhone.getPhoneBrand()

        enroll.text = if (this.deviceId == null) {
            getString(R.string.no_enroll)
        } else {
            getString(R.string.enroll_with_identifier, this.deviceId)
        }

        update_button.setOnClickListener {
            // TODO
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
