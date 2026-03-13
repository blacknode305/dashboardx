package com.mycompany.myapp;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.util.Log;

import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Scanner;

public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Запуск сервиса
        Intent serviceIntent = new Intent(this, EthPriceService.class);
        startService(serviceIntent);
    }

    // ---- Внутренний сервис ----
    public static class EthPriceService extends Service {

        private Handler handler;
        private Runnable runnable;
        private NotificationManager nm;
        private final String CHANNEL_ID = "eth_channel";

        @Override
        public void onCreate() {
            super.onCreate();

            nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

            // Создаём NotificationChannel для Android 8+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
					CHANNEL_ID,
					"ETH Price Tracker",
					NotificationManager.IMPORTANCE_LOW
                );
                nm.createNotificationChannel(channel);
            }

            // Первоначальное уведомление
            Notification notification = buildNotification("Loading...");
            nm.notify(1, notification);

            handler = new Handler();
            runnable = new Runnable() {
                @Override
                public void run() {
                    new Thread(new Runnable() {
							@Override
							public void run() {
								Double price = fetchEthPrice();
								if (price != null) {
									Notification updated = buildNotification("ETH: $" + price);
									nm.notify(1, updated);
								}
							}
						}).start();

                    handler.postDelayed(this, 1000); // обновление каждую секунду
                }
            };
            handler.post(runnable);
        }

        private Notification buildNotification(String text) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                return new Notification.Builder(this, CHANNEL_ID)
					.setContentTitle("ETH Tracker")
					.setContentText(text)
					.setSmallIcon(android.R.drawable.ic_dialog_info)
					.setOngoing(true)
					.build();
            } else {
                Notification n = new Notification(android.R.drawable.ic_dialog_info, text, System.currentTimeMillis());
                n.flags |= Notification.FLAG_ONGOING_EVENT;
                return n;
            }
        }

        @Override
        public void onDestroy() {
            handler.removeCallbacks(runnable);
            super.onDestroy();
        }

        @Override
        public IBinder onBind(Intent intent) {
            return null;
        }

        private Double fetchEthPrice() {
            try {
                URL url = new URL("http://127.0.0.1:3030/eth-price");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                InputStream in = conn.getInputStream();
                Scanner sc = new Scanner(in).useDelimiter("\\A");
                String response = sc.hasNext() ? sc.next() : "";
                sc.close();

                Log.d("ETH_FETCH", "Response: " + response);

                JSONObject json = new JSONObject(response);
                return json.getDouble("price");
            } catch (Exception e) {
                Log.e("ETH_FETCH", "Error fetching price", e);
                return null;
            }
        }
    }
}
