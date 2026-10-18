package com.pesotrack.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.pesotrack.app.plugins.PesoTrackWidgetPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PesoTrackWidgetPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep status bar and navigation bar visible with dark background matching PesoTrack theme (#0E0F14)
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, true);

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.setStatusBarColor(Color.parseColor("#0E0F14"));
        window.setNavigationBarColor(Color.parseColor("#0E0F14"));

        WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            // false = light/white icons for dark status bar background
            insetsController.setAppearanceLightStatusBars(false);
            insetsController.setAppearanceLightNavigationBars(false);
        }

        // Apply Window Insets listener to root view to guarantee content starts below status bar
        // and above navigation bar on all Android versions including Android 15 edge-to-edge
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        // Capture any incoming widget action from intent
        PesoTrackWidgetPlugin.onAppIntentReceived(this, getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        PesoTrackWidgetPlugin.onAppIntentReceived(this, intent);
    }
}

