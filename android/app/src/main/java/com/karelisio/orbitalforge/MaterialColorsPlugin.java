package com.karelisio.orbitalforge;

import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Exposes the Material You dynamic accent color (Android 12+) to the web layer. */
@CapacitorPlugin(name = "MaterialColors")
public class MaterialColorsPlugin extends Plugin {

    @PluginMethod
    public void getAccent(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            int color = ContextCompat.getColor(getContext(), android.R.color.system_accent1_500);
            ret.put("color", String.format("#%06X", 0xFFFFFF & color));
        }
        call.resolve(ret);
    }
}
