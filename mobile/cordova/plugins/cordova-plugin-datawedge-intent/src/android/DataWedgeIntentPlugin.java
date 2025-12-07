package com.medicd21.datawedge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONException;

public class DataWedgeIntentPlugin extends CordovaPlugin {
    private BroadcastReceiver receiver;

    @Override
    protected void pluginInitialize() {
        super.pluginInitialize();
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
                    try {
                        if (extras.size() > 0) {
                            tag = extras.toString();
                        }
                    } catch (Exception e) {
                        tag = null;
                    }
                }

                if (tag != null) {
                    final String escaped = tag.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");
                    final String js = "window.dispatchEvent(new CustomEvent('datawedge', {detail:{tag:'" + escaped + "'}}));";
                    if (webView != null) {
                        cordova.getActivity().runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    webView.getEngine().evaluateJavascript(js, null);
                                } catch (NoSuchMethodError e) {
                                    webView.loadUrl("javascript:" + js);
                                }
                            }
                        });
                    }
                }
            }
        };

        cordova.getActivity().registerReceiver(receiver, filter);
    }

    @Override
    public void onDestroy() {
        try {
            if (receiver != null) {
                cordova.getActivity().unregisterReceiver(receiver);
                receiver = null;
            }
        } catch (Exception e) {
            // ignore
        }
        super.onDestroy();
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if ("register".equals(action)) {
            callbackContext.success();
            return true;
        }
        callbackContext.error("Unsupported action");
        return false;
    }
}
package com.medicd21.datawedge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONException;

public class DataWedgeIntentPlugin extends CordovaPlugin {
    private BroadcastReceiver receiver;

    @Override
    protected void pluginInitialize() {
        super.pluginInitialize();
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
                    try {
                        if (extras.size() > 0) {
                            tag = extras.toString();
                        }
                    } catch (Exception e) {
                        tag = null;
                    }
                }

                if (tag != null) {
                    final String escaped = tag.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");
                    final String js = "window.dispatchEvent(new CustomEvent('datawedge', {detail:{tag:'" + escaped + "'}}));";
                    if (webView != null) {
                        cordova.getActivity().runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    webView.getEngine().evaluateJavascript(js, null);
                                } catch (NoSuchMethodError e) {
                                    webView.loadUrl("javascript:" + js);
                                }
                            }
                        });
                    }
                }
            }
        };

        cordova.getActivity().registerReceiver(receiver, filter);
    }

    @Override
    public void onDestroy() {
        try {
            if (receiver != null) {
                cordova.getActivity().unregisterReceiver(receiver);
                receiver = null;
            }
        } catch (Exception e) {
            // ignore
        }
        super.onDestroy();
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if ("register".equals(action)) {
            callbackContext.success();
            return true;
        }
        callbackContext.error("Unsupported action");
        return false;
    }
}
package com.medicd21.datawedge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONException;

public class DataWedgeIntentPlugin extends CordovaPlugin {
    private BroadcastReceiver receiver;

    @Override
    protected void pluginInitialize() {
        super.pluginInitialize();
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
                    try {
                        if (extras.size() > 0) {
                            tag = extras.toString();
                        }
                    } catch (Exception e) {
                        tag = null;
                    }
                }

                if (tag != null) {
                    final String escaped = tag.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");
                    final String js = "window.dispatchEvent(new CustomEvent('datawedge', {detail:{tag:'" + escaped + "'}}));";
                    if (webView != null) {
                        cordova.getActivity().runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    webView.getEngine().evaluateJavascript(js, null);
                                } catch (NoSuchMethodError e) {
                                    webView.loadUrl("javascript:" + js);
                                }
                            }
                        });
                    }
                }
            }
        };

        cordova.getActivity().registerReceiver(receiver, filter);
    }

    @Override
    public void onDestroy() {
        try {
            if (receiver != null) {
                cordova.getActivity().unregisterReceiver(receiver);
                receiver = null;
            }
        } catch (Exception e) {
            // ignore
        }
        super.onDestroy();
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if ("register".equals(action)) {
            callbackContext.success();
            return true;
        }
        callbackContext.error("Unsupported action");
        return false;
    }
}
package com.medicd21.datawedge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONException;

public class DataWedgeIntentPlugin extends CordovaPlugin {
    private BroadcastReceiver receiver;

    @Override
    protected void pluginInitialize() {
        super.pluginInitialize();
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
                    try {
                        if (extras.size() > 0) {
                            tag = extras.toString();
                        }
                    } catch (Exception e) {
                        tag = null;
                    }
                }

                if (tag != null) {
                    final String escaped = tag.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");
                    final String js = "window.dispatchEvent(new CustomEvent('datawedge', {detail:{tag:'" + escaped + "'}}));";
                    if (webView != null) {
                        cordova.getActivity().runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    webView.getEngine().evaluateJavascript(js, null);
                                } catch (NoSuchMethodError e) {
                                    webView.loadUrl("javascript:" + js);
                                }
                            }
                        });
                    }
                }
            }
        };

        cordova.getActivity().registerReceiver(receiver, filter);
    }

    @Override
    public void onDestroy() {
        try {
            if (receiver != null) {
                cordova.getActivity().unregisterReceiver(receiver);
                receiver = null;
            }
        } catch (Exception e) {
            // ignore
        }
        super.onDestroy();
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if ("register".equals(action)) {
            callbackContext.success();
            return true;
        }
        callbackContext.error("Unsupported action");
        return false;
    }
}
package com.medicd21.datawedge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.json.JSONArray;
import org.json.JSONException;

/**
 * Cordova plugin that registers a BroadcastReceiver for DataWedge intents
 * and forwards tag payloads into the WebView by executing JavaScript that
 * dispatches a CustomEvent('datawedge', { detail: { tag: '...' } })
 */
public class DataWedgeIntentPlugin extends CordovaPlugin {
    private BroadcastReceiver receiver;

    @Override
    protected void pluginInitialize() {
        super.pluginInitialize();
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
                    try {
                        if (extras.size() > 0) {
                            tag = extras.toString();
                        }
                    } catch (Exception e) {
                        tag = null;
                    }
                }

                if (tag != null) {
                    final String escaped = tag.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n");
                    final String js = "window.dispatchEvent(new CustomEvent('datawedge', {detail:{tag:'" + escaped + "'}}));";
                    if (webView != null) {
                        cordova.getActivity().runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    webView.getEngine().evaluateJavascript(js, null);
                                } catch (NoSuchMethodError e) {
                                    webView.loadUrl("javascript:" + js);
                                }
                            }
                        });
                    }
                }
            }
        };

        cordova.getActivity().registerReceiver(receiver, filter);
    }

    @Override
    public void onDestroy() {
        try {
            if (receiver != null) {
                cordova.getActivity().unregisterReceiver(receiver);
                receiver = null;
            }
        } catch (Exception e) {
            // ignore
        }
        super.onDestroy();
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if ("register".equals(action)) {
            callbackContext.success();
            return true;
        }
        callbackContext.error("Unsupported action");
        return false;
    }
}
