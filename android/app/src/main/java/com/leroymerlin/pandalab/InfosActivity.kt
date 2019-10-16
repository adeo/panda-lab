package com.leroymerlin.pandalab


import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.leroymerlin.pandalab.BuildConfig
import com.leroymerlin.pandalab.PandaLabApplication
import com.leroymerlin.pandalab.R
import com.leroymerlin.pandalab.globals.model.DeviceStatus
import com.leroymerlin.pandalab.globals.pandalab.PandaLabManager
import com.leroymerlin.pandalab.globals.utils.UtilsPhone
import io.reactivex.disposables.Disposable
import kotlinx.android.synthetic.main.activity_infos.*
import java.text.DateFormat
import java.util.*
import javax.inject.Inject


class InfosActivity : AppCompatActivity() {

    private val tag = "InfosActivity"
    private var statusSub: Disposable? = null
    private var deviceSub: Disposable? = null

    @Inject
    lateinit var pandaLabManager: PandaLabManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_infos)
        PandaLabApplication.getApp(this).component.inject(this)
        initView()
    }

    override fun onResume() {
        super.onResume()

        statusSub = pandaLabManager.listenDeviceStatus()
            .subscribe({ status ->
                val isBooked = status == DeviceStatus.booked
                free_device_button.visibility =
                    if (isBooked) {
                        View.VISIBLE
                    } else {
                        View.GONE
                    }
                book_device_button.visibility =
                    if (isBooked) {
                        View.GONE
                    } else {
                        View.VISIBLE
                    }
            }, { error ->
                Log.e(tag, "Can't listen status", error)
            })

        deviceSub = pandaLabManager.listenDevice().subscribe(

            { device ->
                lastConnexion.text = DateFormat.getInstance().format(Date(device.lastConnexion))
            }, { error ->
                Log.e(tag, "Can't listen device", error)

            }
        )
        getString(R.string.enroll_with_identifier, this.pandaLabManager.getDeviceId())
    }

    override fun onPause() {
        super.onPause()
        statusSub?.dispose()
        deviceSub?.dispose()
    }


    private fun initView() {
        lastConnexion.text = "0"
        ip.text = UtilsPhone.getPhoneIp(true)
        serialId.text = pandaLabManager.getDeviceId()
        androidVersion.text = UtilsPhone.getPhoneAndroidVersion()
        currentServiceVersion.text = BuildConfig.VERSION_NAME
        model.text = UtilsPhone.getPhoneModel()
        product.text = UtilsPhone.getPhoneProduct()
        device.text = UtilsPhone.getPhoneDevice()
        manufacturer.text = UtilsPhone.getPhoneManufacturer()
        brand.text = UtilsPhone.getPhoneBrand()




        book_device_button.setOnClickListener {
            pandaLabManager.bookDevice()
                .subscribe({
                    Log.i(tag, "device booked")
                }, {
                    Log.e(tag, "Can't book device", it)

                })
        }
        free_device_button.setOnClickListener {
            pandaLabManager.cancelDeviceBooking()
                .subscribe({
                    Log.i(tag, "device booking canceled")
                }, {
                    Log.e(tag, "Can't cancel device booking", it)

                })
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

}
