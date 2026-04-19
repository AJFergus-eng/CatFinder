#include <Wire.h>

// RP2040 Grove Pins
#define PIN_SDA 20
#define PIN_SCL 21

struct CatData {
  float temp;
  float speed;
  float lat;
  float lon;
} incoming;

void setup() {
  Serial.begin(115200);      // USB Debugging
  Serial1.begin(115200);     // Internal link to ESP32-S3

  // Join I2C as Slave on the Grove Pins
  Wire.setSDA(PIN_SDA);
  Wire.setSCL(PIN_SCL);
  Wire.begin(8); 
  Wire.onReceive(receiveEvent);
}

void receiveEvent(int howMany) {
  if (howMany == sizeof(CatData)) {
    Wire.readBytes((uint8_t*)&incoming, sizeof(CatData));
    
    // Forward to ESP32-S3 over the internal Serial link
    // We send it as a comma-separated string for easy parsing
    Serial1.print(incoming.temp); Serial1.print(",");
    Serial1.print(incoming.speed); Serial1.print(",");
    Serial1.print(incoming.lat, 6); Serial1.print(",");
    Serial1.println(incoming.lon, 6);
  }
}

void loop() {
  delay(100);
}