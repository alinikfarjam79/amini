package com.example.app;

import android.graphics.Color;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import io.capawesome.capacitorjs.plugins.mlkit.barcodescanning.BarcodeScannerPlugin;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(BarcodeScannerPlugin.class);
    super.onCreate(savedInstanceState);

  }
}