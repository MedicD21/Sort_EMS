package com.medicd21.sortems;

import android.os.Bundle;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.widget.FrameLayout;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import androidx.appcompat.app.AppCompatActivity;

import com.zebra.rfid.api3.BATCH_MODE;
import com.zebra.rfid.api3.ENUM_TRANSPORT;
import com.zebra.rfid.api3.ENUM_TRIGGER_MODE;
import com.zebra.rfid.api3.InvalidUsageException;
import com.zebra.rfid.api3.OperationFailureException;
import com.zebra.rfid.api3.RFIDReader;
import com.zebra.rfid.api3.RfidEventsListener;
import com.zebra.rfid.api3.RfidReadEvents;
import com.zebra.rfid.api3.RfidStatusEvents;
import com.zebra.rfid.api3.ReaderDevice;
import com.zebra.rfid.api3.Readers;
import com.zebra.rfid.api3.TAG_FIELD;
import com.zebra.rfid.api3.TagData;
import com.zebra.rfid.api3.Antennas;
import com.zebra.rfid.api3.SESSION;
import com.zebra.rfid.api3.INVENTORY_STATE;
import com.zebra.rfid.api3.TriggerInfo;
import com.zebra.rfid.api3.START_TRIGGER_TYPE;
import com.zebra.rfid.api3.STOP_TRIGGER_TYPE;
import com.zebra.rfid.api3.HANDHELD_TRIGGER_EVENT_TYPE;
import com.zebra.rfid.api3.HANDHELD_TRIGGER_TYPE;
import com.zebra.rfid.api3.ReaderCapabilities;
import com.zebra.rfid.api3.TagStorageSettings;
import com.zebra.rfid.api3.RFModeTable;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "SortEMS-WebView";
    private static final int REQ_BT = 101;
    private WebView webView;
    private RfidController rfidController;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        FrameLayout container = findViewById(R.id.container);
        webView = new WebView(this);
        container.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Avoid opening links in external browser
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectScanButtonHooks();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, consoleMessage.message() + " -- line " + consoleMessage.lineNumber());
                return true;
            }
        });
        WebView.setWebContentsDebuggingEnabled(true);

        rfidController = new RfidController(getApplicationContext());
        webView.addJavascriptInterface(new RfidBridge(), "AndroidRfid");

        // Load packaged app
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    private boolean ensureBluetoothPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.BLUETOOTH_CONNECT}, REQ_BT);
                Log.w(TAG, "Requesting BLUETOOTH_CONNECT permission");
                return false;
            }
        }
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_BT) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "BLUETOOTH_CONNECT granted");
            } else {
                Log.w(TAG, "BLUETOOTH_CONNECT denied");
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (rfidController != null) {
            rfidController.shutdown();
        }
    }

    /**
     * Injects a small script that binds Start/Stop buttons by text content to native RFID start/stop.
     */
    private void injectScanButtonHooks() {
        String js = "(function(){"
                + "if(window.__rfidHooked) return; window.__rfidHooked=true;"
                + "const hasText=(n,txt)=>{const t=(n.innerText||n.textContent||'').toLowerCase();return t.includes(txt);};"
                + "document.addEventListener('click',function(e){"
                + "  let n=e.target; for(let i=0;i<3 && n;i++){"
                + "    if(hasText(n,'start scanning')){ if(window.AndroidRfid){AndroidRfid.startRfidScan();} return;}"
                + "    if(hasText(n,'stop scanning')){ if(window.AndroidRfid){AndroidRfid.stopRfidScan();} return;}"
                + "    n=n.parentElement;"
                + "  }"
                + "},true);"
                + "window.startRfidScan=()=>{ if(window.AndroidRfid){AndroidRfid.startRfidScan();}};"
                + "window.stopRfidScan=()=>{ if(window.AndroidRfid){AndroidRfid.stopRfidScan();}};"
                + "const state={capture:true,tags:[]};"
                + "const overlay=document.createElement('div');"
                + "overlay.style.position='fixed';overlay.style.bottom='0';overlay.style.left='0';overlay.style.right='0';overlay.style.maxHeight='40vh';overlay.style.background='rgba(0,0,0,0.85)';overlay.style.color='#fff';overlay.style.zIndex='99999';overlay.style.fontSize='12px';overlay.style.fontFamily='monospace';overlay.style.padding='8px';overlay.style.overflowY='auto';"
                + "overlay.innerHTML='<div style=\"display:flex;align-items:center;gap:8px;flex-wrap:wrap;\"><strong>RFID Status:</strong><span id=\"rfid-status\" style=\"color:#f99;\">Disconnected</span></div><div style=\"margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;\"><strong>RFID Captures:</strong><span id=\"rfid-count\">0</span><button id=\"rfid-toggle\" style=\"padding:2px 6px;\">Pause</button><button id=\"rfid-clear\" style=\"padding:2px 6px;\">Clear</button></div><div id=\"rfid-list\" style=\"margin-top:4px;white-space:pre-wrap;\"></div>';"
                + "document.body.appendChild(overlay);"
                + "const countEl=overlay.querySelector('#rfid-count');"
                + "const listEl=overlay.querySelector('#rfid-list');"
                + "const statusEl=overlay.querySelector('#rfid-status');"
                + "const toggleBtn=overlay.querySelector('#rfid-toggle');"
                + "overlay.querySelector('#rfid-toggle').onclick=()=>{state.capture=!state.capture;toggleBtn.textContent=state.capture?'Pause':'Resume';};"
                + "overlay.querySelector('#rfid-clear').onclick=()=>{state.tags=[];updateUI();};"
                + "function updateUI(){countEl.textContent=state.tags.length;listEl.textContent=state.tags.join('\\n');}"
                + "window.addEventListener('rfidTag',ev=>{const id=(ev.detail&&ev.detail.id)||''; if(!state.capture||!id) return; state.tags.push(id); updateUI();});"
                + "window.addEventListener('rfidStatus',ev=>{const d=ev.detail||{}; statusEl.textContent=d.message||''; statusEl.style.color=d.ok?'#8f8':'#f99';});"
                + "})();";
        webView.evaluateJavascript(js, null);
    }

    private void pushTagToWeb(String tagId) {
        if (webView == null) return;
        String escaped = tagId.replace("\"", "\\\"");
        String js = "window.dispatchEvent(new CustomEvent('rfidTag',{detail:{id:\"" + escaped + "\"}}));";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private void pushStatusToWeb(String message, boolean ok) {
        if (webView == null) return;
        String safe = message == null ? "" : message.replace("\"", "\\\"");
        String js = "window.dispatchEvent(new CustomEvent('rfidStatus',{detail:{message:\"" + safe + "\",ok:" + ok + "}}));";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private class RfidBridge {
        @JavascriptInterface
        public void startRfidScan() {
            Log.d(TAG, "JS requested startRfidScan");
            runOnUiThread(() -> {
                if (!ensureBluetoothPermission()) return;
                rfidController.startScanning(MainActivity.this::pushTagToWeb, MainActivity.this::pushStatusToWeb);
            });
        }

        @JavascriptInterface
        public void stopRfidScan() {
            Log.d(TAG, "JS requested stopRfidScan");
            runOnUiThread(() -> {
                rfidController.stopScanning();
                pushStatusToWeb("Stopped scanning", true);
            });
        }
    }

    /**
     * Minimal RFID wrapper for Zebra API3.
     */
    private static class RfidController implements RfidEventsListener {
        private final android.content.Context appContext;
        private Readers readers;
        private RFIDReader reader;
        private ExecutorService executor = Executors.newSingleThreadExecutor();
        private ScheduledExecutorService poller;
        private volatile boolean polling = false;
        private volatile int tagCountSession = 0;
        private volatile boolean inventoryActive = false;
        private java.util.function.Consumer<String> tagListener;
        private java.util.function.BiConsumer<String, Boolean> statusListener;
        private ReaderDevice lastReader;
        private static final String USB_PERMISSION_ACTION = "com.medicd21.sortems.USB_PERMISSION";
        private static final int DIAG_READ_LOOPS = 1;
        private static final int USB_VENDOR_ZEBRA = 0x05E0;

        // Duplicate detection: track recently seen tags with timestamps
        private final java.util.Map<String, Long> recentTags = new java.util.concurrent.ConcurrentHashMap<>();
        private static final long DUPLICATE_WINDOW_MS = 2000; // 2 seconds
        private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (USB_PERMISSION_ACTION.equals(intent.getAction())) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
                    Log.d(TAG, "USB permission result for " + (device != null ? device.getDeviceName() : "unknown") + ": " + granted);
                }
            }
        };
        private boolean receiverRegistered = false;

        RfidController(android.content.Context context) {
            this.appContext = context;
            IntentFilter filter = new IntentFilter(USB_PERMISSION_ACTION);
            appContext.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            receiverRegistered = true;
        }

        void startScanning(java.util.function.Consumer<String> onTag,
                           java.util.function.BiConsumer<String, Boolean> statusCb) {
            tagListener = onTag;
            statusListener = statusCb;
            tagCountSession = 0;
            executor.execute(() -> {
                try {
                    List<ReaderDevice> devices = getDevices();
                    if (devices == null || devices.isEmpty()) {
                        Log.w(TAG, "No RFID readers found");
                        if (statusCb != null) statusCb.accept("No RFID reader found", false);
                        return;
                    }
                    ReaderDevice primary = pickDevice(devices);
                    if (statusCb != null) statusCb.accept("Connecting to " + primary.getName(), false);
                    ensureConnectedTo(primary);
                    ReaderDevice alternate = pickAlternate(devices, primary);
                    if (reader != null) {
                        try {
                            if (reader.Actions.Inventory != null) {
                                try {
                                    reader.Actions.Inventory.stop();
                                    Log.d(TAG, "Stopped any previous inventory operation");
                                } catch (InvalidUsageException e) {
                                    Log.w(TAG, "No inventory to stop: " + e.getMessage());
                                } catch (OperationFailureException e) {
                                    Log.w(TAG, "Failed to stop inventory: " + e.getResults());
                                }
                            }
                            try {
                                reader.Actions.purgeTags();
                                Log.d(TAG, "Purged tag buffer");
                            } catch (InvalidUsageException e) {
                                Log.w(TAG, "Cannot purge tags: " + e.getMessage());
                            } catch (OperationFailureException e) {
                                Log.w(TAG, "Failed to purge tags: " + e.getResults());
                            }

                            // Enable continuous inventory mode
                            inventoryActive = true;
                            reader.Actions.Inventory.perform();
                            Log.d(TAG, "RFID continuous inventory started");
                            if (statusCb != null) statusCb.accept("Connected to " + primary.getName() + " (" + primary.getTransport() + ") - Scanning...", true);

                            // Start polling to drain the tag buffer continuously
                            startPolling();
                        } catch (OperationFailureException ofe) {
                            Log.e(TAG, "RFID inventory start failed: " + ofe.getResults(), ofe);
                            if (statusCb != null) statusCb.accept("RFID start failed: " + ofe.getResults(), false);
                        } catch (Throwable t) {
                            Log.e(TAG, "RFID inventory start failed", t);
                            if (statusCb != null) statusCb.accept("RFID start failed", false);
                        }
                    } else {
                        Log.e(TAG, "No reader available to start inventory");
                        if (statusCb != null) statusCb.accept("No reader available to start inventory", false);
                    }
                } catch (Throwable e) {
                    Log.e(TAG, "RFID start failed", e);
                    if (statusCb != null) statusCb.accept("RFID start failed", false);
                }
            });
        }

        void stopScanning() {
            executor.execute(() -> {
                try {
                    if (reader != null && reader.isConnected()) {
                        reader.Actions.Inventory.stop();
                        Log.d(TAG, "RFID inventory stopped");
                    }
                    stopPolling();
                    inventoryActive = false;
                    if (statusListener != null) statusListener.accept("Stopped scanning", true);
                } catch (Throwable e) {
                    Log.e(TAG, "RFID stop failed", e);
                    if (statusListener != null) statusListener.accept("Stop failed", false);
                }
            });
        }

        void shutdown() {
            stopScanning();
            executor.execute(() -> {
                try {
                    if (reader != null && reader.isConnected()) {
                        reader.disconnect();
                    }
                } catch (Exception e) {
                    Log.e(TAG, "RFID disconnect failed", e);
                }
                if (readers != null) {
                    readers.Dispose();
                }
            });
            if (receiverRegistered) {
                try {
                    appContext.unregisterReceiver(usbReceiver);
                } catch (Exception e) {
                    Log.w(TAG, "Receiver already unregistered", e);
                }
                receiverRegistered = false;
            }
        }

        private void ensureConnected() {
                try {
                    if (reader != null && reader.isConnected()) return;
                    if (readers == null) {
                        readers = new Readers(appContext, ENUM_TRANSPORT.ALL);
                    }
                List<ReaderDevice> devices = readers.GetAvailableRFIDReaderList();
                if (devices == null || devices.isEmpty()) {
                    Log.w(TAG, "No RFID readers found");
                    return;
                }
                Log.d(TAG, "Available readers: " + devices.size());
                for (ReaderDevice d : devices) {
                    if (d != null) {
                        Log.d(TAG, "Reader candidate: " + d.getName() + " transport=" + d.getTransport());
                    }
                }
                ReaderDevice device = pickDevice(devices);
                Log.d(TAG, "Connecting to reader: " + device.getName() + " via " + device.getTransport());
                requestUsbPermissionIfNeeded();
                reader = device.getRFIDReader();
                if (!reader.isConnected()) {
                    reader.connect();
                    reader.Events.addEventsListener(this);
                    reader.Events.setHandheldEvent(true);
                    reader.Events.setTagReadEvent(true);
                    reader.Events.setAttachTagDataWithReadEvent(true);
                    reader.Events.setInventoryStartEvent(true);
                    reader.Events.setInventoryStopEvent(true);
                    reader.Config.setBatchMode(BATCH_MODE.DISABLE);
                    reader.Config.setUniqueTagReport(true);
                    reader.Actions.PreFilters.deleteAll();
                    reader.Actions.TagAccess.OperationSequence.deleteAll();
                    reader.Config.setTriggerMode(ENUM_TRIGGER_MODE.RFID_MODE, true);
                    // Push antenna power to max and basic singulation
                    try {
                        Antennas.AntennaRfConfig rfConfig = reader.Config.Antennas.getAntennaRfConfig(1);
                        rfConfig.setTransmitPowerIndex(30); // best-effort boost
                        reader.Config.Antennas.setAntennaRfConfig(1, rfConfig);
                        Antennas.SingulationControl sing = reader.Config.Antennas.getSingulationControl(1);
                        sing.setSession(SESSION.SESSION_S0);
                        reader.Config.Antennas.setSingulationControl(1, sing);
                    } catch (Exception ex) {
                        Log.w(TAG, "RF config tweak failed", ex);
                    }
                }
            } catch (Throwable e) {
                Log.e(TAG, "RFID connect failed", e);
            }
        }

        private List<ReaderDevice> getDevices() throws InvalidUsageException {
            if (readers == null) {
                readers = new Readers(appContext, ENUM_TRANSPORT.ALL);
            }
            List<ReaderDevice> list = readers.GetAvailableRFIDReaderList();
            return list;
        }

        private ReaderDevice pickDevice(List<ReaderDevice> devices) {
            // Force USB/dock first, otherwise first in list
            ReaderDevice usb = null;
            for (ReaderDevice d : devices) {
                if (d == null) continue;
                String transport = String.valueOf(d.getTransport());
                boolean isUsb = transport.equalsIgnoreCase("SERVICE_USB") || transport.toUpperCase().contains("USB");
                if (isUsb) {
                    usb = d;
                    break;
                }
            }
            if (usb != null) return usb;
            return devices.get(0);
        }

        private ReaderDevice pickAlternate(List<ReaderDevice> devices, ReaderDevice primary) {
            if (devices == null || devices.isEmpty()) return null;
            String primaryName = primary != null ? primary.getName() : "";
            ReaderDevice bt = null;
            ReaderDevice usb = null;
            for (ReaderDevice d : devices) {
                if (d == null) continue;
                boolean isUsb = String.valueOf(d.getTransport()).toUpperCase().contains("USB");
                boolean isBt = String.valueOf(d.getTransport()).toUpperCase().contains("BLUETOOTH");
                if (isUsb && usb == null) usb = d;
                if (isBt && bt == null) bt = d;
            }
            // If primary is USB, alternate to BT; if primary is BT, alternate to USB.
            if (primary != null && String.valueOf(primary.getTransport()).toUpperCase().contains("USB")) return bt;
            if (primary != null && String.valueOf(primary.getTransport()).toUpperCase().contains("BLUETOOTH")) return usb;
            return bt != null ? bt : usb;
        }

        private void ensureConnectedTo(ReaderDevice target) {
            if (target == null) return;
            if (reader != null && reader.isConnected()) {
                try {
                    String current = reader.getHostName();
                    if (current != null && current.equals(target.getName())) {
                        Log.d(TAG, "Already connected to reader " + current);
                        return;
                    }
                } catch (InvalidUsageException e) {
                    Log.w(TAG, "Cannot get hostname: " + e.getMessage());
                } catch (OperationFailureException e) {
                    Log.w(TAG, "Failed to get hostname: " + e.getResults());
                }
            }
            // Disconnect current reader if connected
            try {
                if (reader != null && reader.isConnected()) {
                    Log.d(TAG, "Disconnecting from current reader");
                    reader.disconnect();
                }
            } catch (InvalidUsageException e) {
                Log.w(TAG, "Cannot disconnect: " + e.getMessage());
            } catch (OperationFailureException e) {
                Log.w(TAG, "Failed to disconnect: " + e.getResults());
            }

            // Retry connection with exponential backoff
            int maxRetries = 3;
            int retryDelay = 500; // Start with 500ms
            InvalidUsageException lastInvalidUsageEx = null;
            OperationFailureException lastOperationFailEx = null;

            for (int attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    Log.d(TAG, "Connection attempt " + attempt + "/" + maxRetries + " to " + target.getName());
                    reader = target.getRFIDReader();
                    reader.connect();
                    lastReader = target;
                    Log.d(TAG, "Successfully connected to " + target.getName());
                    break; // Success, exit retry loop
                } catch (InvalidUsageException e) {
                    lastInvalidUsageEx = e;
                    Log.w(TAG, "Connection attempt " + attempt + " failed: " + e.getMessage());
                    if (attempt < maxRetries) {
                        try {
                            Thread.sleep(retryDelay);
                            retryDelay *= 2; // Exponential backoff
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            throw e;
                        }
                    }
                } catch (OperationFailureException e) {
                    lastOperationFailEx = e;
                    Log.w(TAG, "Connection attempt " + attempt + " failed: " + e.getResults());
                    if (attempt < maxRetries) {
                        try {
                            Thread.sleep(retryDelay);
                            retryDelay *= 2; // Exponential backoff
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                            throw e;
                        }
                    }
                }
            }

            // If all retries failed, throw RuntimeException with the cause
            if (reader == null || !reader.isConnected()) {
                String errorMsg = "Failed to connect to RFID reader after " + maxRetries + " attempts";
                Log.e(TAG, errorMsg);

                if (lastInvalidUsageEx != null) {
                    throw new RuntimeException(errorMsg + ": " + lastInvalidUsageEx.getMessage(), lastInvalidUsageEx);
                }
                if (lastOperationFailEx != null) {
                    throw new RuntimeException(errorMsg + ": " + lastOperationFailEx.getResults(), lastOperationFailEx);
                }
                // If we get here, something unexpected happened
                throw new RuntimeException(errorMsg + ": Unknown error");
            }
            // Configure reader settings
            try {
                reader.Events.addEventsListener(this);
                reader.Events.setHandheldEvent(true);
                reader.Events.setTagReadEvent(true);
                reader.Events.setAttachTagDataWithReadEvent(true);
                reader.Events.setInventoryStartEvent(true);
                reader.Events.setInventoryStopEvent(true);
                reader.Config.setBatchMode(BATCH_MODE.DISABLE);
                reader.Config.setUniqueTagReport(true);
                reader.Actions.PreFilters.deleteAll();
                reader.Actions.TagAccess.OperationSequence.deleteAll();
                reader.Config.setTriggerMode(ENUM_TRIGGER_MODE.RFID_MODE, true);
                Log.d(TAG, "Reader basic configuration completed");
            } catch (InvalidUsageException e) {
                Log.e(TAG, "Failed to configure reader basic settings: " + e.getMessage(), e);
                throw new RuntimeException("Failed to configure RFID reader: " + e.getMessage(), e);
            } catch (OperationFailureException e) {
                Log.e(TAG, "Failed to configure reader basic settings: " + e.getResults(), e);
                throw new RuntimeException("Failed to configure RFID reader: " + e.getResults(), e);
            }

            // RF config
            try {
                short[] ants = reader.Config.Antennas.getAvailableAntennas();
                if (ants != null && ants.length > 0) {
                    Log.d(TAG, "Available antennas: " + java.util.Arrays.toString(ants));
                    if (statusListener != null) statusListener.accept("Antennas: " + java.util.Arrays.toString(ants), true);
                    for (short antId : ants) {
                        Antennas.AntennaRfConfig rfConfig = reader.Config.Antennas.getAntennaRfConfig(antId);
                        try {
                            ReaderCapabilities cap = reader.ReaderCapabilities;
                            int[] levels = cap != null ? cap.getTransmitPowerLevelValues() : null;
                            if (levels != null && levels.length > 0) {
                                int maxIdx = levels.length - 1;
                                rfConfig.setTransmitPowerIndex((short) maxIdx);
                                Log.d(TAG, "Set power index " + maxIdx + " (" + levels[maxIdx] + ")");
                            } else {
                                rfConfig.setTransmitPowerIndex(30); // fallback
                            }
                        } catch (InvalidUsageException e) {
                            Log.w(TAG, "Cannot get power levels: " + e.getMessage());
                            rfConfig.setTransmitPowerIndex(30);
                        } catch (OperationFailureException e) {
                            Log.w(TAG, "Failed to get power levels: " + e.getResults());
                            rfConfig.setTransmitPowerIndex(30);
                        }
                        reader.Config.Antennas.setAntennaRfConfig(antId, rfConfig);
                        Antennas.SingulationControl sing = reader.Config.Antennas.getSingulationControl(antId);
                        sing.setSession(SESSION.SESSION_S0);
                        reader.Config.Antennas.setSingulationControl(antId, sing);
                    }
                }
                // Immediate start/stop triggers (we drive start/stop in app)
                TriggerInfo triggerInfo = new TriggerInfo();
                triggerInfo.StartTrigger.setTriggerType(START_TRIGGER_TYPE.START_TRIGGER_TYPE_IMMEDIATE);
                triggerInfo.StopTrigger.setTriggerType(STOP_TRIGGER_TYPE.STOP_TRIGGER_TYPE_IMMEDIATE);
                reader.Config.setStartTrigger(triggerInfo.StartTrigger);
                reader.Config.setStopTrigger(triggerInfo.StopTrigger);
                TagStorageSettings ts = reader.Config.getTagStorageSettings();
                ts.setMaxTagCount(1000);
                reader.Config.setTagStorageSettings(ts);
                try {
                    Antennas.SingulationControl sing = reader.Config.Antennas.getSingulationControl(1);
                    sing.Action.setInventoryState(INVENTORY_STATE.INVENTORY_STATE_A);
                    sing.Action.setSLFlag(com.zebra.rfid.api3.SL_FLAG.SL_ALL);
                    reader.Config.Antennas.setSingulationControl(1, sing);
                } catch (InvalidUsageException e) {
                    Log.w(TAG, "Cannot configure singulation: " + e.getMessage());
                } catch (OperationFailureException e) {
                    Log.w(TAG, "Failed to configure singulation: " + e.getResults());
                }
            } catch (Exception ex) {
                Log.w(TAG, "RF config tweak failed", ex);
            }
        }

        private void requestUsbPermissionIfNeeded() {
            UsbManager usbManager = (UsbManager) appContext.getSystemService(Context.USB_SERVICE);
            if (usbManager == null) return;
            for (UsbDevice device : usbManager.getDeviceList().values()) {
                // Zebra vendor id is 0x05E0
                if (device.getVendorId() == 0x05E0 && !usbManager.hasPermission(device)) {
                    PendingIntent pi = PendingIntent.getBroadcast(appContext, 0, new Intent(USB_PERMISSION_ACTION), PendingIntent.FLAG_IMMUTABLE);
                    usbManager.requestPermission(device, pi);
                    Log.d(TAG, "Requesting USB permission for " + device.getDeviceName());
                }
            }
        }

        @Override
        public void eventReadNotify(RfidReadEvents event) {
            if (reader == null || tagListener == null) return;
            try {
                TagData[] tags = reader.Actions.getReadTags(100);
                if (tags == null || tags.length == 0) {
                    com.zebra.rfid.api3.TagDataArray arr = reader.Actions.getReadTagsEx(100);
                    if (arr != null && arr.getLength() > 0) {
                        TagData[] arrTags = arr.getTags();
                        if (arrTags != null) tags = arrTags;
                    }
                }
                if (tags != null) {
                    for (TagData tag : tags) {
                        if (tag != null && tag.getTagID() != null) {
                            String tagId = tag.getTagID();
                            if (shouldReportTag(tagId)) {
                                tagListener.accept(tagId);
                                Log.d(TAG, "RFID tag: " + tagId);
                            } else {
                                Log.v(TAG, "Duplicate tag filtered in event: " + tagId);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "RFID read notify failed", e);
            }
        }

        @Override
        public void eventStatusNotify(RfidStatusEvents statusEvent) {
            Log.d(TAG, "RFID status: " + (statusEvent != null ? statusEvent.toString() : "null"));
            if (statusListener != null && statusEvent != null && statusEvent.StatusEventData != null) {
                statusListener.accept("Status: " + statusEvent.StatusEventData.getStatusEventType(), true);
            }
            if (statusEvent != null && statusEvent.StatusEventData != null &&
                    statusEvent.StatusEventData.getStatusEventType() == com.zebra.rfid.api3.STATUS_EVENT_TYPE.HANDHELD_TRIGGER_EVENT) {
                // Ignore trigger-driven perform/stop for one-shot diag
            }
        }

        private void startPolling() {
            stopPolling();
            polling = true;
            poller = Executors.newSingleThreadScheduledExecutor();
            poller.scheduleAtFixedRate(this::drainTags, 0, 300, TimeUnit.MILLISECONDS);
        }

        private void stopPolling() {
            polling = false;
            if (poller != null) {
                poller.shutdownNow();
                poller = null;
            }
        }

        /**
         * Check if tag was recently seen (duplicate detection)
         * Returns true if tag should be reported, false if it's a duplicate
         */
        private boolean shouldReportTag(String tagId) {
            long now = System.currentTimeMillis();
            Long lastSeen = recentTags.get(tagId);

            if (lastSeen != null && (now - lastSeen) < DUPLICATE_WINDOW_MS) {
                // Tag seen recently, it's a duplicate
                return false;
            }

            // Update timestamp and report tag
            recentTags.put(tagId, now);

            // Clean up old entries (simple cleanup on each check)
            recentTags.entrySet().removeIf(entry -> (now - entry.getValue()) > DUPLICATE_WINDOW_MS * 2);

            return true;
        }

        private int drainOnce() {
            int count = 0;
            try {
                TagData[] tags = reader.Actions.getReadTags(256);
                if (tags == null || tags.length == 0) {
                    com.zebra.rfid.api3.TagDataArray arr = reader.Actions.getReadTagsEx(256);
                    if (arr != null && arr.getLength() > 0) {
                        tags = arr.getTags();
                    } else {
                        Log.d(TAG, "ReadTagsEx returned length=" + (arr != null ? arr.getLength() : 0));
                    }
                }
                if (tags != null) {
                    for (TagData tag : tags) {
                        if (tag != null && tag.getTagID() != null) {
                            String tagId = tag.getTagID();
                            if (shouldReportTag(tagId)) {
                                count++;
                                tagListener.accept(tagId);
                                Log.d(TAG, "RFID tag: " + tagId);
                            } else {
                                Log.v(TAG, "Duplicate tag filtered: " + tagId);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "RFID diagnostic drain failed", e);
            }
            return count;
        }

        private void runDiagnosticReads() {
            executor.execute(() -> {
                try {
                    if (statusListener != null && reader != null) {
                        statusListener.accept("Diag: reader=" + reader.getHostName() + " transport=" + (lastReader != null ? lastReader.getTransport() : "unknown"), true);
                        try {
                            com.zebra.rfid.api3.TagStorageSettings ts = reader.Config.getTagStorageSettings();
                            statusListener.accept("Diag: tagStore max=" + ts.getMaxTagCount(), true);
                        } catch (InvalidUsageException e) {
                            Log.w(TAG, "Cannot get tag storage settings: " + e.getMessage());
                        } catch (OperationFailureException e) {
                            Log.w(TAG, "Failed to get tag storage settings: " + e.getResults());
                        }
                    }
                    for (int i = 0; i < DIAG_READ_LOOPS; i++) {
                        int c;
                        try {
                            reader.Actions.Inventory.perform();
                            c = drainOnce();
                        } catch (OperationFailureException ofe) {
                            c = 0;
                            Log.e(TAG, "Diag perform failed: " + ofe.getResults(), ofe);
                            if (statusListener != null) statusListener.accept("Diag perform failed: " + ofe.getResults(), false);
                        }
                        if (statusListener != null) statusListener.accept("Diag read loop " + (i + 1) + "/" + DIAG_READ_LOOPS + ": " + c + " tags", c > 0);
                        if (c > 0) break;
                        try {
                            Thread.sleep(400);
                        } catch (InterruptedException e) {
                            Log.d(TAG, "Diagnostic sleep interrupted");
                            Thread.currentThread().interrupt();
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Diagnostic reads failed", e);
                    if (statusListener != null) statusListener.accept("Diagnostic reads failed: " + e.getMessage(), false);
                }
            });
        }

        private void drainTags() {
            if (!polling || reader == null || tagListener == null) return;
            try {
                TagData[] tags = reader.Actions.getReadTags(100);
                if (tags == null || tags.length == 0) {
                    com.zebra.rfid.api3.TagDataArray arr = reader.Actions.getReadTagsEx(100);
                    if (arr != null && arr.getLength() > 0) {
                        TagData[] arrTags = arr.getTags();
                        if (arrTags != null) tags = arrTags;
                    }
                }
                if (tags != null) {
                    for (TagData tag : tags) {
                        if (tag != null && tag.getTagID() != null) {
                            String tagId = tag.getTagID();
                            if (shouldReportTag(tagId)) {
                                tagListener.accept(tagId);
                                Log.d(TAG, "RFID tag: " + tagId);
                            } else {
                                Log.v(TAG, "Duplicate tag filtered in poll: " + tagId);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "RFID poll failed", e);
            }
        }
    }
}
