package com.medicd21.datawedge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="DataWedge")
public class DataWedgePlugin extends Plugin {
    private BroadcastReceiver receiver;

    @Override
    public void load() {
        super.load();
        registerReceiver();
    }

    private void registerReceiver() {
        if (receiver != null) return;
        IntentFilter filter = new IntentFilter();
        filter.addAction("com.symbol.datawedge.api.NOTIFICATION");
        filter.addAction("com.symbol.datawedge.api.RESULT_ACTION");
        filter.addAction("com.symbol.datawedge.api.ACTION");
        filter.addAction("com.symbol.datawedge.data_string");
        filter.addAction("com.motorolasolutions.emdk.datawedge.action.RFID_TAG");

        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null) return;
                Bundle extras = intent.getExtras();
                if (extras == null) return;
                String tag = null;
                if (extras.containsKey("com.symbol.datawedge.data_string")) {
                    tag = extras.getString("com.symbol.datawedge.data_string");
                } else if (extras.containsKey("com.symbol.datawedge.data")) {
                    tag = extras.getString("com.symbol.datawedge.data");
                } else if (extras.containsKey("com.symbol.datawedge.tag_read_event")) {
                    tag = extras.getString("com.symbol.datawedge.tag_read_event");
                } else if (extras.containsKey("com.symbol.datawedge.raw_data")) {
                    tag = extras.getString("com.symbol.datawedge.raw_data");
                }
                if (tag == null) {
                    try { if (extras.size() > 0) tag = extras.toString(); } catch (Exception e) {}
                }
                if (tag != null) {
                    JSObject ret = new JSObject();
                    ret.put("tag", tag);
                    notifyListeners("scan", ret);
                }
            }
        };
        getContext().registerReceiver(receiver, filter);
    }

    @Override
    public void onDestroy() {
        try {
            if (receiver != null) {
                getContext().unregisterReceiver(receiver);
                receiver = null;
            }
        } catch (Exception e) {
            // ignore
        }
        super.onDestroy();
    }
}
