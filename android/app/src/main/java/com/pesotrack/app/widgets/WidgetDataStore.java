package com.pesotrack.app.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Shader;
import com.pesotrack.app.MainActivity;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

public class WidgetDataStore {
    public static final String PREF_NAME = "pesotrack_widget_prefs";

    public static final String KEY_IS_LOGGED_IN = "is_logged_in";
    public static final String KEY_USER_NAME = "user_name";
    public static final String KEY_CURRENCY_SYMBOL = "currency_symbol";
    public static final String KEY_INCOME_AMOUNT = "income_amount";
    public static final String KEY_EXPENSE_AMOUNT = "expense_amount";
    public static final String KEY_NET_CASHFLOW = "net_cashflow";
    public static final String KEY_INCOME_PERCENT = "income_percent";
    public static final String KEY_EXPENSE_PERCENT = "expense_percent";
    public static final String KEY_SPARKLINE_POINTS = "sparkline_points";
    public static final String KEY_QUICK_EXPENSE_AMOUNT = "quick_expense_amount";
    public static final String KEY_QUICK_EXPENSE_CATEGORY = "quick_expense_category";
    public static final String KEY_LAST_UPDATED = "last_updated";

    public static final String KEY_PENDING_ACTION = "pending_action";
    public static final String KEY_PENDING_TARGET = "pending_target";
    public static final String KEY_PENDING_PAYLOAD = "pending_payload";

    public static final String ACTION_WIDGET_REFRESH = "com.pesotrack.app.ACTION_WIDGET_REFRESH";
    public static final String ACTION_WIDGET_CLICK = "com.pesotrack.app.ACTION_WIDGET_CLICK";

    public static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public static void saveOverviewData(
            Context context,
            boolean isLoggedIn,
            String userName,
            String currencySymbol,
            String incomeAmount,
            String expenseAmount,
            String netCashFlow,
            String incomePercent,
            String expensePercent,
            String sparklinePointsJson,
            String quickExpenseAmount,
            String quickExpenseCategory) {
        SharedPreferences.Editor editor = getPrefs(context).edit();
        editor.putBoolean(KEY_IS_LOGGED_IN, isLoggedIn);
        if (userName != null) editor.putString(KEY_USER_NAME, userName);
        if (currencySymbol != null) editor.putString(KEY_CURRENCY_SYMBOL, currencySymbol);
        if (incomeAmount != null) editor.putString(KEY_INCOME_AMOUNT, incomeAmount);
        if (expenseAmount != null) editor.putString(KEY_EXPENSE_AMOUNT, expenseAmount);
        if (netCashFlow != null) editor.putString(KEY_NET_CASHFLOW, netCashFlow);
        if (incomePercent != null) editor.putString(KEY_INCOME_PERCENT, incomePercent);
        if (expensePercent != null) editor.putString(KEY_EXPENSE_PERCENT, expensePercent);
        if (sparklinePointsJson != null) editor.putString(KEY_SPARKLINE_POINTS, sparklinePointsJson);
        if (quickExpenseAmount != null) editor.putString(KEY_QUICK_EXPENSE_AMOUNT, quickExpenseAmount);
        if (quickExpenseCategory != null) editor.putString(KEY_QUICK_EXPENSE_CATEGORY, quickExpenseCategory);
        editor.putLong(KEY_LAST_UPDATED, System.currentTimeMillis());
        editor.apply();

        updateAllWidgets(context);
    }

    public static void clearOverviewData(Context context) {
        SharedPreferences.Editor editor = getPrefs(context).edit();
        editor.putBoolean(KEY_IS_LOGGED_IN, false);
        editor.remove(KEY_INCOME_AMOUNT);
        editor.remove(KEY_EXPENSE_AMOUNT);
        editor.remove(KEY_NET_CASHFLOW);
        editor.remove(KEY_SPARKLINE_POINTS);
        editor.apply();

        updateAllWidgets(context);
    }

    public static void setPendingAction(Context context, String action, String target, String payload) {
        SharedPreferences.Editor editor = getPrefs(context).edit();
        editor.putString(KEY_PENDING_ACTION, action);
        editor.putString(KEY_PENDING_TARGET, target);
        editor.putString(KEY_PENDING_PAYLOAD, payload);
        editor.apply();
    }

    public static JSONObject consumePendingAction(Context context) {
        SharedPreferences prefs = getPrefs(context);
        String action = prefs.getString(KEY_PENDING_ACTION, null);
        if (action == null) return null;

        String target = prefs.getString(KEY_PENDING_TARGET, "");
        String payload = prefs.getString(KEY_PENDING_PAYLOAD, "");

        prefs.edit()
                .remove(KEY_PENDING_ACTION)
                .remove(KEY_PENDING_TARGET)
                .remove(KEY_PENDING_PAYLOAD)
                .apply();

        try {
            JSONObject obj = new JSONObject();
            obj.put("action", action);
            obj.put("target", target);
            if (payload != null && !payload.isEmpty()) {
                obj.put("payload", new JSONObject(payload));
            }
            return obj;
        } catch (Exception e) {
            return null;
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);

        // Update Quick Actions
        ComponentName qaComp = new ComponentName(context, QuickActionsWidgetProvider.class);
        int[] qaIds = mgr.getAppWidgetIds(qaComp);
        if (qaIds != null && qaIds.length > 0) {
            Intent updateQa = new Intent(context, QuickActionsWidgetProvider.class);
            updateQa.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            updateQa.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, qaIds);
            context.sendBroadcast(updateQa);
        }

        // Update Financial Overview
        ComponentName foComp = new ComponentName(context, FinancialOverviewWidgetProvider.class);
        int[] foIds = mgr.getAppWidgetIds(foComp);
        if (foIds != null && foIds.length > 0) {
            Intent updateFo = new Intent(context, FinancialOverviewWidgetProvider.class);
            updateFo.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            updateFo.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, foIds);
            context.sendBroadcast(updateFo);
        }

        // Update Quick Expense
        ComponentName qeComp = new ComponentName(context, QuickExpenseWidgetProvider.class);
        int[] qeIds = mgr.getAppWidgetIds(qeComp);
        if (qeIds != null && qeIds.length > 0) {
            Intent updateQe = new Intent(context, QuickExpenseWidgetProvider.class);
            updateQe.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            updateQe.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, qeIds);
            context.sendBroadcast(updateQe);
        }
    }

    public static PendingIntent createActivityPendingIntent(
            Context context, String action, String target, String extraJson, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(ACTION_WIDGET_CLICK);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("action", action);
        intent.putExtra("target", target);
        if (extraJson != null) {
            intent.putExtra("payload", extraJson);
        }

        return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public static PendingIntent createRefreshPendingIntent(
            Context context, Class<?> receiverClass, int requestCode) {
        Intent intent = new Intent(context, receiverClass);
        intent.setAction(ACTION_WIDGET_REFRESH);
        return PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /**
     * Dynamically generates a smooth, antialiased cash flow sparkline bitmap
     * with mint green curve and gradient fill matching the PesoTrack prototype.
     */
    public static Bitmap generateSparklineBitmap(Context context, String pointsJson, int widthPx, int heightPx) {
        if (widthPx <= 0) widthPx = 240;
        if (heightPx <= 0) heightPx = 90;

        List<Float> pts = new ArrayList<>();
        try {
            if (pointsJson != null && !pointsJson.isEmpty()) {
                JSONArray arr = new JSONArray(pointsJson);
                for (int i = 0; i < arr.length(); i++) {
                    pts.add((float) arr.getDouble(i));
                }
            }
        } catch (Exception ignored) {}

        if (pts.size() < 2) {
            // Default smooth aesthetic waveform if insufficient data
            pts.clear();
            pts.add(10f);
            pts.add(16f);
            pts.add(12f);
            pts.add(22f);
            pts.add(18f);
            pts.add(28f);
            pts.add(34f);
        }

        Bitmap bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        float minVal = pts.get(0);
        float maxVal = pts.get(0);
        for (float v : pts) {
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
        }

        float range = maxVal - minVal;
        if (range <= 0.001f) range = 1f;

        float paddingHorizontal = 10f;
        float paddingTop = 12f;
        float paddingBottom = 12f;
        float availableW = widthPx - (paddingHorizontal * 2f);
        float availableH = heightPx - (paddingTop + paddingBottom);
        float stepX = availableW / (pts.size() - 1);

        float[] xCoords = new float[pts.size()];
        float[] yCoords = new float[pts.size()];
        for (int i = 0; i < pts.size(); i++) {
            xCoords[i] = paddingHorizontal + (i * stepX);
            float normalized = (pts.get(i) - minVal) / range;
            yCoords[i] = (heightPx - paddingBottom) - (normalized * availableH);
        }

        // 1. Build smooth cubic spline path
        Path linePath = new Path();
        linePath.moveTo(xCoords[0], yCoords[0]);
        for (int i = 0; i < pts.size() - 1; i++) {
            float p0x = (i > 0) ? xCoords[i - 1] : xCoords[i];
            float p0y = (i > 0) ? yCoords[i - 1] : yCoords[i];
            float p1x = xCoords[i];
            float p1y = yCoords[i];
            float p2x = xCoords[i + 1];
            float p2y = yCoords[i + 1];
            float p3x = (i + 2 < pts.size()) ? xCoords[i + 2] : p2x;
            float p3y = (i + 2 < pts.size()) ? yCoords[i + 2] : p2y;

            float ctrl1x = p1x + (p2x - p0x) * 0.18f;
            float ctrl1y = p1y + (p2y - p0y) * 0.18f;
            float ctrl2x = p2x - (p3x - p1x) * 0.18f;
            float ctrl2y = p2y - (p3y - p1y) * 0.18f;

            linePath.cubicTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, p2x, p2y);
        }

        // 2. Build fill path
        Path fillPath = new Path(linePath);
        fillPath.lineTo(xCoords[pts.size() - 1], heightPx);
        fillPath.lineTo(xCoords[0], heightPx);
        fillPath.close();

        Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        fillPaint.setStyle(Paint.Style.FILL);
        fillPaint.setShader(new LinearGradient(
                0, 0, 0, heightPx,
                Color.parseColor("#444ADE80"),
                Color.parseColor("#004ADE80"),
                Shader.TileMode.CLAMP));
        canvas.drawPath(fillPath, fillPaint);

        // 3. Draw curve stroke
        Paint linePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        linePaint.setStyle(Paint.Style.STROKE);
        linePaint.setColor(Color.parseColor("#4ADE80"));
        linePaint.setStrokeWidth(5f);
        linePaint.setStrokeCap(Paint.Cap.ROUND);
        linePaint.setStrokeJoin(Paint.Join.ROUND);
        canvas.drawPath(linePath, linePaint);

        // 4. Draw endpoint glow dot
        Paint dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotPaint.setStyle(Paint.Style.FILL);
        dotPaint.setColor(Color.parseColor("#83C95B"));
        canvas.drawCircle(xCoords[pts.size() - 1], yCoords[pts.size() - 1], 6f, dotPaint);

        return bitmap;
    }
}
