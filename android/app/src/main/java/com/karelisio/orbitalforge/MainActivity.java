package com.karelisio.orbitalforge;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImmersivePlugin.class);
        registerPlugin(MaterialColorsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
