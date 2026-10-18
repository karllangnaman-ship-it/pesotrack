package com.pesotrack.app.widgets;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

public class WidgetPinnedReceiver extends BroadcastReceiver {
    public static final String ACTION_WIDGET_PINNED = "com.pesotrack.app.ACTION_WIDGET_PINNED";

    @Override
    public void onReceive(Context context, Intent intent) {
        String widgetType = intent != null ? intent.getStringExtra("widgetType") : null;

        // Force refresh all widgets so the newly placed widget immediately displays live data
        WidgetDataStore.updateAllWidgets(context);

        String title = "PesoTrack Widget";
        if ("quick_actions".equalsIgnoreCase(widgetType)) {
            title = "Quick Actions Widget";
        } else if ("quick_expense".equalsIgnoreCase(widgetType)) {
            title = "Quick Expense Widget";
        } else if ("financial_overview".equalsIgnoreCase(widgetType)) {
            title = "Financial Overview Widget";
        }

        try {
            Toast.makeText(context, title + " added to Home Screen!", Toast.LENGTH_SHORT).show();
        } catch (Exception ignored) {}
    }
}
