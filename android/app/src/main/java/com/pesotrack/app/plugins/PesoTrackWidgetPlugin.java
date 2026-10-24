package com.pesotrack.app.plugins;

import android.content.Context;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.pesotrack.app.widgets.WidgetDataStore;
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

    public static void onAppIntentReceived(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("action");
        String target = intent.getStringExtra("target");
        String payloadStr = intent.getStringExtra("payload");

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
