#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// Hard coded wifi values

const char* ssid = "AndroidAP";
const char* password = "jltc3764";
const char* serverUrl = "137.184.154.78/api/tracker";
void setup() {
  Serial.begin(115200);   // Debug
  Serial2.begin(115200);  // Internal link from RP2040 (using default RX/TX pins)

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  if (Serial2.available()) {
    String data = Serial2.readStringUntil('\n');
    
    // Parse the CSV string: temp,speed,lat,lon
    int c1 = data.indexOf(',');
    int c2 = data.indexOf(',', c1 + 1);
    int c3 = data.indexOf(',', c2 + 1);

    String t = data.substring(0, c1);
    String v = data.substring(c1 + 1, c2);
    String la = data.substring(c2 + 1, c3);
    String lo = data.substring(c3 + 1);

    // Upload to DigitalOcean
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");

    String json = "{\"temperature\":" + t + ",\"velocity\":" + v + 
                  ",\"latitude\":" + la + ",\"longitude\":" + lo + 
                  ",\"arduino_mac\":\"I2C_COLLAR_01\",\"is_connected\":true}";

    http.POST(json);
    http.end();
  }
}