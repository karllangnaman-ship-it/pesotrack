package com.pesotrack.app.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import com.pesotrack.app.R;

public class QuickActionsWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_actions);

        // Bind 6 Quick Action buttons
        views.setOnClickPendingIntent(
                R.id.btn_action_expense,
                WidgetDataStore.createActivityPendingIntent(context, "open_action", "expense", null, 101));

        views.setOnClickPendingIntent(
                R.id.btn_action_income,
                WidgetDataStore.createActivityPendingIntent(context, "open_action", "income", null, 102));

        views.setOnClickPendingIntent(
                R.id.btn_action_transfer,
                WidgetDataStore.createActivityPendingIntent(context, "open_action", "transfer", null, 103));

        views.setOnClickPendingIntent(
                R.id.btn_action_loan,
                WidgetDataStore.createActivityPendingIntent(context, "open_action", "loan", null, 104));

        views.setOnClickPendingIntent(
                R.id.btn_action_card,
                WidgetDataStore.createActivityPendingIntent(context, "open_action", "card", null, 105));

        views.setOnClickPendingIntent(
                R.id.btn_action_grocery,
                WidgetDataStore.createActivityPendingIntent(context, "open_action", "grocery", null, 106));

        // Header controls
        views.setOnClickPendingIntent(
                R.id.btn_refresh_actions,
                WidgetDataStore.createRefreshPendingIntent(context, QuickActionsWidgetProvider.class, 107));

        views.setOnClickPendingIntent(
                R.id.btn_open_app_actions,
                WidgetDataStore.createActivityPendingIntent(context, "open_app", "home", null, 108));

        appWidgetManager.updateAppWidget(widgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (WidgetDataStore.ACTION_WIDGET_REFRESH.equals(action)
                || Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            ComponentName comp = new ComponentName(context, QuickActionsWidgetProvider.class);
            int[] ids = mgr.getAppWidgetIds(comp);
            if (ids != null && ids.length > 0) {
                onUpdate(context, mgr, ids);
            }
        }
    }
}
