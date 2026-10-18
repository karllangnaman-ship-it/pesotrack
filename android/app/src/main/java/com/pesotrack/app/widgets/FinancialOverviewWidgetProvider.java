package com.pesotrack.app.widgets;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.view.View;
import android.widget.RemoteViews;
import com.pesotrack.app.R;

public class FinancialOverviewWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_financial_overview);
        SharedPreferences prefs = WidgetDataStore.getPrefs(context);

        boolean isLoggedIn = prefs.getBoolean(WidgetDataStore.KEY_IS_LOGGED_IN, false);
        String income = prefs.getString(WidgetDataStore.KEY_INCOME_AMOUNT, null);
        String expense = prefs.getString(WidgetDataStore.KEY_EXPENSE_AMOUNT, null);
        String cashflow = prefs.getString(WidgetDataStore.KEY_NET_CASHFLOW, null);
        String incomePct = prefs.getString(WidgetDataStore.KEY_INCOME_PERCENT, "0%");
        String expensePct = prefs.getString(WidgetDataStore.KEY_EXPENSE_PERCENT, "0%");
        String sparklineJson = prefs.getString(WidgetDataStore.KEY_SPARKLINE_POINTS, null);

        // Header controls
        views.setOnClickPendingIntent(
                R.id.btn_refresh_overview,
                WidgetDataStore.createRefreshPendingIntent(context, FinancialOverviewWidgetProvider.class, 201));

        views.setOnClickPendingIntent(
                R.id.btn_open_app_overview,
                WidgetDataStore.createActivityPendingIntent(context, "open_app", "home", null, 202));

        if (!isLoggedIn && (income == null && expense == null)) {
            // Signed out / placeholder state
            views.setViewVisibility(R.id.ll_overview_content, View.GONE);
            views.setViewVisibility(R.id.ll_overview_logged_out, View.VISIBLE);
            views.setOnClickPendingIntent(
                    R.id.ll_overview_logged_out,
                    WidgetDataStore.createActivityPendingIntent(context, "open_app", "login", null, 203));
        } else {
            // Active financial data state
            views.setViewVisibility(R.id.ll_overview_content, View.VISIBLE);
            views.setViewVisibility(R.id.ll_overview_logged_out, View.GONE);

            views.setTextViewText(R.id.tv_overview_income, income != null ? income : "₱0.00");
            views.setTextViewText(R.id.tv_overview_expense, expense != null ? expense : "₱0.00");
            views.setTextViewText(R.id.tv_overview_cashflow, cashflow != null ? cashflow : "₱0.00");
            views.setTextViewText(R.id.tv_overview_income_percent, incomePct);
            views.setTextViewText(R.id.tv_overview_expense_percent, expensePct);

            // Generate sparkline bitmap
            try {
                Bitmap sparkline = WidgetDataStore.generateSparklineBitmap(context, sparklineJson, 260, 90);
                if (sparkline != null) {
                    views.setImageViewBitmap(R.id.iv_overview_sparkline, sparkline);
                }
            } catch (Exception ignored) {}

            // Card click actions
            views.setOnClickPendingIntent(
                    R.id.card_overview_income,
                    WidgetDataStore.createActivityPendingIntent(context, "open_action", "income", null, 204));

            views.setOnClickPendingIntent(
                    R.id.card_overview_expenses,
                    WidgetDataStore.createActivityPendingIntent(context, "open_action", "expense", null, 205));

            views.setOnClickPendingIntent(
                    R.id.card_overview_cashflow,
                    WidgetDataStore.createActivityPendingIntent(context, "open_tab", "reports", null, 206));
        }

        appWidgetManager.updateAppWidget(widgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (WidgetDataStore.ACTION_WIDGET_REFRESH.equals(action)
                || Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            ComponentName comp = new ComponentName(context, FinancialOverviewWidgetProvider.class);
            int[] ids = mgr.getAppWidgetIds(comp);
            if (ids != null && ids.length > 0) {
                onUpdate(context, mgr, ids);
            }
        }
    }
}
