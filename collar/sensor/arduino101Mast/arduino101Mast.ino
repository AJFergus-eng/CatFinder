#include <Wire.h>
#include <TinyGPSPlus.h>
#include <math.h>

// #include <CurieBLE.h> // Bluetooth Disabled as requested

// --- Hardware Pins ---
const int TEMP_PIN = A0;   // Grove Temperature Sensor v1.2 (Analog)
#define GPSSerial Serial1  // Adafruit Ultimate GPS (Pins 0/1)

// --- Thermistor Constants (Grove v1.2) ---
const int B = 4275;               
const float R0 = 100000.0;        
TinyGPSPlus gps;

// --- Data Structure ---
// This MUST match the struct on your ESP32 exactly
struct CatData {
  float temp;
  float speed;
  float lat;
  float lon;
} myData;

// --- Connection Tracking ---
bool isTethered = false;

/* --- BLE Characteristics (Commented Out) ---
BLEService catService("19B10000-E8F2-537E-4F6C-D104768A1214");
BLEFloatCharacteristic tempChar("19B10001-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify);
...
*/

void setup() {
  Serial.begin(115200);
  while (!Serial); // Wait for Serial Monitor to open
  
  Serial.println("--- ARDUINO 101: STARTING ---");
  
  GPSSerial.begin(9600);
  Wire.begin(); // Join I2C bus as Master
  
  delay(4500); // 4.5s startup delay for stabilization

  /* --- BLE Initialization (Commented Out) ---
  if (!BLE.begin()) {
    Serial.println("BLE Fail!");
    while (1);
  }
  BLE.setLocalName("CatTracker-101");
  ...
  BLE.advertise();
  */
  
  Serial.println("Setup Complete. Pushing to I2C Address 0x08...");
}

void loop() {
  // 1. Always feed GPS data
  while (GPSSerial.available() > 0) {
    gps.encode(GPSSerial.read());
  }

  // 2. Always calculate Temperature (A0)
  int rawVal = analogRead(TEMP_PIN);
  float R = 1023.0 / rawVal - 1.0;
  R = R0 * R;
  myData.temp = 1.0 / (log(R / R0) / B + 1 / 298.15) - 273.15;

  // 3. Update GPS values in the struct
  myData.speed = gps.speed.mps();
  myData.lat = gps.location.lat();
  myData.lon = gps.location.lng();

  // 4. I2C HEARTBEAT: Push data to the SenseCAP Indicator (ESP32)
  // We send the entire struct as a binary packet
  Wire.beginTransmission(8); 
  Wire.write((uint8_t*)&myData, sizeof(myData)); 
  byte status = Wire.endTransmission();

  // 5. Connection Check
  // status 0 = Success (Connected)
  // status 2/3/4 = Error (Disconnected)
  if (status == 0) {
    isTethered = true;
    Serial.print("[ONLINE] Temp: "); Serial.print(myData.temp);
    Serial.print("C | Sats: "); Serial.println(gps.satellites.value());
  } else {
    isTethered = false;
    Serial.print("[OFFLINE] Indicator not found. I2C Error: ");
    Serial.println(status);
  }

  // Wait 2 seconds before the next check/push
  delay(2000); 
}