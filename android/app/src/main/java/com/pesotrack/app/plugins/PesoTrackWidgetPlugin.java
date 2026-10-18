package com.pesotrack.app.plugins;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.pesotrack.app.widgets.FinancialOverviewWidgetProvider;
import com.pesotrack.app.widgets.QuickActionsWidgetProvider;
import com.pesotrack.app.widgets.QuickExpenseWidgetProvider;
import com.pesotrack.app.widgets.WidgetDataStore;
import com.pesotrack.app.widgets.WidgetPinnedReceiver;
import org.json.JSONObject;

@CapacitorPlugin(name = "PesoTrackWidget")
public class PesoTrackWidgetPlugin extends Plugin {
    private static PesoTrackWidgetPlugin sInstance;

    @Override
    public void load() {
        super.load();
        sInstance = this;
    }

    public static PesoTrackWidgetPlugin getInstance() {
        return sInstance;
    }

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        try {
            Context ctx = getContext();
            boolean isLoggedIn = call.getBoolean("isLoggedIn", false);
            String userName = call.getString("userName", "");
            String currencySymbol = call.getString("currencySymbol", "₱");
            String incomeAmount = call.getString("incomeAmount", "₱0.00");
            String expenseAmount = call.getString("expenseAmount", "₱0.00");
            String netCashFlow = call.getString("netCashFlow", "₱0.00");
            String incomePercent = call.getString("incomePercent", "0%");
            String expensePercent = call.getString("expensePercent", "0%");
            String sparklinePoints = call.getString("sparklinePoints", null);
            String quickExpenseAmount = call.getString("quickExpenseAmount", "₱250.00");
            String quickExpenseCategory = call.getString("quickExpenseCategory", "Food");

            WidgetDataStore.saveOverviewData(
                    ctx,
                    isLoggedIn,
                    userName,
                    currencySymbol,
                    incomeAmount,
                    expenseAmount,
                    netCashFlow,
                    incomePercent,
                    expensePercent,
                    sparklinePoints,
                    quickExpenseAmount,
                    quickExpenseCategory);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to update widget data: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void getPendingWidgetAction(PluginCall call) {
        try {
            Context ctx = getContext();
            JSONObject action = WidgetDataStore.consumePendingAction(ctx);
            JSObject ret = new JSObject();
            if (action != null) {
                ret.put("hasAction", true);
                ret.put("action", action.optString("action"));
                ret.put("target", action.optString("target"));
                if (action.has("payload")) {
                    try {
                        ret.put("payload", new JSObject(action.getJSONObject("payload").toString()));
                    } catch (Exception ignored) {}
                }
            } else {
                ret.put("hasAction", false);
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get pending widget action: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void clearPendingWidgetAction(PluginCall call) {
        try {
            WidgetDataStore.consumePendingAction(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to clear pending widget action: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void clearWidgetData(PluginCall call) {
        try {
            WidgetDataStore.clearOverviewData(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to clear widget data: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void isPinningSupported(PluginCall call) {
        try {
            Context context = getContext();
            boolean supported = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AppWidgetManager mgr = AppWidgetManager.getInstance(context);
                supported = mgr != null && mgr.isRequestPinAppWidgetSupported();
            }
            JSObject ret = new JSObject();
            ret.put("supported", supported);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("supported", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestPinWidget(PluginCall call) {
        try {
            Context context = getContext();
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("supported", false);
                ret.put("reason", "unsupported_android_version");
                ret.put("message", "Direct home-screen placement requires Android 8.0 or newer. You can add this widget manually by long-pressing your home screen.");
                call.resolve(ret);
                return;
            }

            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            if (mgr == null || !mgr.isRequestPinAppWidgetSupported()) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("supported", false);
                ret.put("reason", "launcher_not_supported");
                ret.put("message", "Your Android launcher does not support direct widget pinning. Please add it from your launcher widget drawer.");
                call.resolve(ret);
                return;
            }

            String widgetType = call.getString("widgetType", "quick_actions");
            Class<?> providerClass;
            if ("quick_expense".equalsIgnoreCase(widgetType)) {
                providerClass = QuickExpenseWidgetProvider.class;
            } else if ("financial_overview".equalsIgnoreCase(widgetType)) {
                providerClass = FinancialOverviewWidgetProvider.class;
            } else {
                providerClass = QuickActionsWidgetProvider.class;
            }

            ComponentName provider = new ComponentName(context, providerClass);

            // Callback intent when launcher successfully finishes pinning
            Intent callbackIntent = new Intent(context, WidgetPinnedReceiver.class);
            callbackIntent.putExtra("widgetType", widgetType);
            callbackIntent.setAction(WidgetPinnedReceiver.ACTION_WIDGET_PINNED);
            PendingIntent successPendingIntent = PendingIntent.getBroadcast(
                    context,
                    450,
                    callbackIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);

            // Trigger Android native widget-placement flow
            boolean initiated = mgr.requestPinAppWidget(provider, null, successPendingIntent);

            JSObject ret = new JSObject();
            ret.put("success", initiated);
            ret.put("supported", true);
            ret.put("widgetType", widgetType);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to request widget placement: " + e.getMessage(), e);
        }
    }

    public static void onAppIntentReceived(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("action");
        String target = intent.getStringExtra("target");
        String payloadStr = intent.getStringExtra("payload");

        // Fallback: Parse from URI data if extras were stripped (e.g. pesotrack://widget/open_action/expense)
        if (action == null && intent.getData() != null) {
            android.net.Uri data = intent.getData();
            if ("pesotrack".equals(data.getScheme()) && "widget".equals(data.getHost())) {
                java.util.List<String> segments = data.getPathSegments();
                if (segments != null && !segments.isEmpty()) {
                    action = segments.get(0);
                    if (segments.size() > 1) {
                        target = segments.get(1);
                        if ("default".equals(target) || "none".equals(target)) {
                            target = "";
                        }
                    }
                }
            }
        }

        if (action != null) {
            // Save to pending in case app is just starting up and web listener is not attached yet
            WidgetDataStore.setPendingAction(context, action, target, payloadStr);

            // Also notify live listener if already connected
            if (sInstance != null) {
                try {
                    JSObject data = new JSObject();
                    data.put("action", action);
                    data.put("target", target != null ? target : "");
                    if (payloadStr != null && !payloadStr.isEmpty()) {
                        data.put("payload", new JSObject(payloadStr));
                    }
                    sInstance.notifyListeners("widgetActionReceived", data, true);
                } catch (Exception ignored) {}
            }
        }
    }
}
