/**  ..... FreeIMU library ....
 * Example program for using the FreeIMU connected to an Arduino Leonardo.
 * The program reads sensor data from the FreeIMU, computes the yaw, pitch
 * and roll using the FreeIMU library sensor fusion and use them to move the
 * mouse cursor. The mouse is emulated by the Arduino Leonardo using the Mouse
 * library.
 * 
 * @author Fabio Varesano - fvaresano@yahoo.it
*/

//   ..... Adafruit nRF8001 libary ....
/*********************************************************************
This is an example for our nRF8001 Bluetooth Low Energy Breakout

  Pick one up today in the adafruit shop!
  ------> http://www.adafruit.com/products/1697

Adafruit invests time and resources providing this open source code, 
please support Adafruit and open-source hardware by purchasing 
products from Adafruit!

Written by Kevin Townsend/KTOWN  for Adafruit Industries.
MIT license, check LICENSE for more information
All text above, and the splash screen below must be included in any redistribution
*********************************************************************/

#include <HMC58X3.h>
#include <MS561101BA.h>
#include <I2Cdev.h>
#include <MPU60X0.h>
#include <EEPROM.h>

//#define DEBUG
#include "DebugUtils.h"
#include "IMUduino.h"
#include <Wire.h>
#include <SPI.h>

// Adafruit nRF8001 Library
#include "Adafruit_BLE_UART.h"

// Connect CLK/MISO/MOSI to hardware SPI
// e.g. On UNO & compatible: CLK = 13, MISO = 12, MOSI = 11
//      On Leo & compatible: CLK = 15, MISO = 14, MOSI = 16
#define ADAFRUITBLE_REQ 10
#define ADAFRUITBLE_RDY 7     // This should be an interrupt pin, on Uno thats #2 or #3
#define ADAFRUITBLE_RST 9

Adafruit_BLE_UART BTLEserial = Adafruit_BLE_UART(ADAFRUITBLE_REQ, ADAFRUITBLE_RDY, ADAFRUITBLE_RST);

aci_evt_opcode_t laststatus = ACI_EVT_DISCONNECTED;
aci_evt_opcode_t status = laststatus;

int raw_values[11];
//float ypr[3];

// Set the FreeIMU object
IMUduino my3IMU = IMUduino();


void setup() {
////  Mouse.begin();
  
  Serial.begin(115200);
  while(!Serial);
  Wire.begin();
  
  Serial.println(F("Adafruit Bluefruit Low Energy nRF8001 + FreeIMU Print echo demo"));
  
  delay(500);
  my3IMU.init(true);
  BTLEserial.begin();
}


void loop() {
  
  btleLoop();
  if (status == ACI_EVT_CONNECTED) {
    /*
    my3IMU.getYawPitchRoll(ypr);
    char chrY[5];
    char chrP[5];
    char chrR[5];
    
    dtostrf(ypr[0], 1, 1, &chrY[0]);
    dtostrf(ypr[1], 1, 1, &chrP[0]);
    dtostrf(ypr[2], 1, 1, &chrR[0]);
    
    btleWrite(
      String(chrY) + '|' +
      String(chrP) + '|' +
      String(chrR)
    );
    */
    
  	my3IMU.getRawValues(raw_values);
  	
  	btleWrite(
  /*
          // MPU6050
          // ...accel
          String(raw_values[0]) + '|' + 
          String(raw_values[1]) + '|' + 
          String(raw_values[2]) 
          
          + '|' + 
          
          // ...gyroscope
          String(raw_values[3], HEX) + '|' + 
          String(raw_values[4], HEX) + '|' + 
          String(raw_values[5], HEX) 
  
          + '|' + 
  */        
          // HMC588L
          // ...Triple axis compass
          String(raw_values[6], HEX) + '|' + 
          String(raw_values[7], HEX) + '|' + 
          String(raw_values[8], HEX) 
          
          + '|' + 
          
          // MS5611
          // ... Temperature
          String(raw_values[9], HEX) + '|' + 
          // ... Pressure
          String(raw_values[10], HEX)
          
       );
     
  }
}

/**************************************************************************/
/*!
    Constantly checks for new events on the nRF8001
*/
/**************************************************************************/

void btleLoop() {
  // Tell the nRF8001 to do whatever it should be working on.
  BTLEserial.pollACI();

  // Ask what is our current status
  status = BTLEserial.getState();
  // If the status changed....
  if (status != laststatus) {
    // print it out!
    if (status == ACI_EVT_DEVICE_STARTED) {
        Serial.println(F("* Advertising started"));
    }
    if (status == ACI_EVT_CONNECTED) {
        Serial.println(F("* Connected!"));
    }
    if (status == ACI_EVT_DISCONNECTED) {
        Serial.println(F("* Disconnected or advertising timed out"));
    }
    // OK set the last status change to this one
    laststatus = status;
  }

  if (status == ACI_EVT_CONNECTED) {
    // Lets see if there's any data for us!
    if (BTLEserial.available()) {
      Serial.print("* "); Serial.print(BTLEserial.available()); Serial.println(F(" bytes available from BTLE"));
    }
    // OK while we still have something to read, get a character and print it out
    while (BTLEserial.available()) {
      char c = BTLEserial.read();
      Serial.print(c);
    }

    // Next up, see if we have any data to get from the Serial console

    if (Serial.available()) {
      // Read a line from Serial
      Serial.setTimeout(100); // 100 millisecond timeout
      String s = Serial.readString();
      
      btleWrite(s);
    }
  }
}

void btleWrite(String s) {
  // We need to convert the line to bytes, no more than 20 at this time
  uint8_t sendbuffer[20];
  s.getBytes(sendbuffer, 20);
  char sendbuffersize = min(20, s.length());

  Serial.print(F("\n* Sending -> \"")); Serial.print((char *)sendbuffer); Serial.println("\"");

  // write the data
  BTLEserial.write(sendbuffer, sendbuffersize);
}

byte * float2str(float arg) {
  // get access to the float as a byte-array:
  byte * data = (byte *) &arg;
  return data;
}
