package com.pesotrack.app.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import com.pesotrack.app.R;

public class QuickExpenseWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_expense);
        SharedPreferences prefs = WidgetDataStore.getPrefs(context);

        String amountDisplay = prefs.getString(WidgetDataStore.KEY_QUICK_EXPENSE_AMOUNT, "₱250.00");
        String category = prefs.getString(WidgetDataStore.KEY_QUICK_EXPENSE_CATEGORY, "Food");

        // Format amount if raw number was stored without currency sign
        if (!amountDisplay.startsWith("₱") && !amountDisplay.startsWith("PHP")) {
            amountDisplay = "₱" + amountDisplay;
        }

        views.setTextViewText(R.id.tv_quick_expense_amount, amountDisplay);
        views.setTextViewText(R.id.tv_quick_expense_category, category);
        views.setTextViewText(R.id.tv_quick_expense_date, "Today");

        // Clean amount number string for payload
        String rawAmount = amountDisplay.replace("₱", "").replace(",", "").trim();
        String payloadJson = "{\"amount\":\"" + rawAmount + "\",\"category\":\"" + category + "\"}";

        // Save Expense CTA action -> opens app with prefilled confirmation form
        views.setOnClickPendingIntent(
                R.id.btn_save_quick_expense,
                WidgetDataStore.createActivityPendingIntent(
                        context, "quick_expense", "confirm", payloadJson, 301));

        // Tapping body or amount
        views.setOnClickPendingIntent(
                R.id.tv_quick_expense_amount,
                WidgetDataStore.createActivityPendingIntent(
                        context, "quick_expense", "edit_amount", payloadJson, 302));

        views.setOnClickPendingIntent(
                R.id.ll_quick_expense_category,
                WidgetDataStore.createActivityPendingIntent(
                        context, "quick_expense", "edit_category", payloadJson, 303));

        // Header controls
        views.setOnClickPendingIntent(
                R.id.btn_refresh_expense,
                WidgetDataStore.createRefreshPendingIntent(context, QuickExpenseWidgetProvider.class, 304));

        views.setOnClickPendingIntent(
                R.id.btn_open_app_expense,
                WidgetDataStore.createActivityPendingIntent(context, "open_app", "home", null, 305));

        appWidgetManager.updateAppWidget(widgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (WidgetDataStore.ACTION_WIDGET_REFRESH.equals(action)
                || Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            ComponentName comp = new ComponentName(context, QuickExpenseWidgetProvider.class);
            int[] ids = mgr.getAppWidgetIds(comp);
            if (ids != null && ids.length > 0) {
                onUpdate(context, mgr, ids);
            }
        }
    }
}
