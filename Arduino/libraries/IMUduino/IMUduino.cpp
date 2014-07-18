/*
IMUDuino.cpp - Originally based on FreeIMU.cpp - A libre and easy to use orientation sensing library for Arduino
Copyright (C) 2011-2012 Fabio Varesano <fabio at varesano dot net>

Development of this code has been supported by the Department of Computer Science,
Universita' degli Studi di Torino, Italy within the Piemonte Project
http://www.piemonte.di.unito.it/


This program is free software: you can redistribute it and/or modify
it under the terms of the version 3 GNU General Public License as
published by the Free Software Foundation.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/
/*
This is the stripped down version of the FreeIMU library, IMUduino
*/

#include <inttypes.h>
#include <stdint.h>
//#define DEBUG
#include "IMUduino.h"

//#include "vector_math.h"

IMUduino::IMUduino() {

    magn = HMC58X3();
  
    accgyro = MPU60X0(); // I2C
    
    baro = MS561101BA();
  
  // initialize quaternion
  q0 = 1.0f;
  q1 = 0.0f;
  q2 = 0.0f;
  q3 = 0.0f;
  exInt = 0.0;
  eyInt = 0.0;
  ezInt = 0.0;
  twoKp = twoKpDef;
  twoKi = twoKiDef;
  integralFBx = 0.0f,  integralFBy = 0.0f, integralFBz = 0.0f;
  lastUpdate = 0;
  now = 0;
  
  #ifndef CALIBRATION_H
  // initialize scale factors to neutral values
  acc_scale_x = 1;
  acc_scale_y = 1;
  acc_scale_z = 1;
  magn_scale_x = 1;
  magn_scale_y = 1;
  magn_scale_z = 1;
  #else
  // get values from global variables of same name defined in calibration.h
  acc_off_x = ::acc_off_x;
  acc_off_y = ::acc_off_y;
  acc_off_z = ::acc_off_z;
  acc_scale_x = ::acc_scale_x;
  acc_scale_y = ::acc_scale_y;
  acc_scale_z = ::acc_scale_z;
  magn_off_x = ::magn_off_x;
  magn_off_y = ::magn_off_y;
  magn_off_z = ::magn_off_z;
  magn_scale_x = ::magn_scale_x;
  magn_scale_y = ::magn_scale_y;
  magn_scale_z = ::magn_scale_z;
  #endif
}

void IMUduino::init() {
  
  init(FIMU_ACCGYRO_ADDR, false);
  
}

void IMUduino::init(bool fastmode) {
  
  init(FIMU_ACCGYRO_ADDR, fastmode);
}


/**
 * Initialize the FreeIMU I2C bus, sensors and performs gyro offsets calibration
*/

void IMUduino::init(int accgyro_addr, bool fastmode) {

  delay(5);
  
  // disable internal pullups of the ATMEGA which Wire enable by default
  #if defined(__AVR_ATmega168__) || defined(__AVR_ATmega8__) || defined(__AVR_ATmega328P__)
    // deactivate internal pull-ups for twi
    // as per note from atmega8 manual pg167
    cbi(PORTC, 4);
    cbi(PORTC, 5);
  #else
    // deactivate internal pull-ups for twi
    // as per note from atmega128 manual pg204
    cbi(PORTD, 0);
    cbi(PORTD, 1);
  #endif
  
  if(fastmode) { // switch to 400KHz I2C - eheheh
    TWBR = ((F_CPU / 400000L) - 16) / 2; // see twi_init in Wire/utility/twi.c
  }
  
  
  accgyro = MPU60X0(false, accgyro_addr);
  accgyro.initialize();
  accgyro.setI2CMasterModeEnabled(0);
  accgyro.setI2CBypassEnabled(1);
  accgyro.setFullScaleGyroRange(MPU60X0_GYRO_FS_2000);
  delay(5);

  
  // init HMC5843
  magn.init(false); // Don't set mode yet, we'll do that later on.
  // Calibrate HMC using self test, not recommended to change the gain after calibration.
  magn.calibrate(1); // Use gain 1=default, valid 0-7, 7 not recommended.
  // Single mode conversion was used in calibration, now set continuous mode
  magn.setMode(0);
  delay(10);
  magn.setDOR(B110);

  
  baro.init(FIMU_BARO_ADDR);
    
  // zero gyro
  zeroGyro();
  
  #ifndef CALIBRATION_H
  // load calibration from eeprom
  calLoad();
  #endif
}

#ifndef CALIBRATION_H

static uint8_t location; // assuming ordered reads

void eeprom_read_var(uint8_t size, byte * var) {
  for(uint8_t i = 0; i<size; i++) {
    var[i] = EEPROM.read(location + i);
  }
  location += size;
}

void IMUduino::calLoad() {
  if(EEPROM.read(IMUDUINO_EEPROM_BASE) == IMUDUINO_EEPROM_SIGNATURE) { // check if signature is ok so we have good data
    location = IMUDUINO_EEPROM_BASE + 1; // reset location
    
    eeprom_read_var(sizeof(acc_off_x), (byte *) &acc_off_x);
    eeprom_read_var(sizeof(acc_off_y), (byte *) &acc_off_y);
    eeprom_read_var(sizeof(acc_off_z), (byte *) &acc_off_z);
    
    eeprom_read_var(sizeof(magn_off_x), (byte *) &magn_off_x);
    eeprom_read_var(sizeof(magn_off_y), (byte *) &magn_off_y);
    eeprom_read_var(sizeof(magn_off_z), (byte *) &magn_off_z);
    
    eeprom_read_var(sizeof(acc_scale_x), (byte *) &acc_scale_x);
    eeprom_read_var(sizeof(acc_scale_y), (byte *) &acc_scale_y);
    eeprom_read_var(sizeof(acc_scale_z), (byte *) &acc_scale_z);
    
    eeprom_read_var(sizeof(magn_scale_x), (byte *) &magn_scale_x);
    eeprom_read_var(sizeof(magn_scale_y), (byte *) &magn_scale_y);
    eeprom_read_var(sizeof(magn_scale_z), (byte *) &magn_scale_z);
  }
  else {
    acc_off_x = 0;
    acc_off_y = 0;
    acc_off_z = 0;
    acc_scale_x = 1;
    acc_scale_y = 1;
    acc_scale_z = 1;

    magn_off_x = 0;
    magn_off_y = 0;
    magn_off_z = 0;
    magn_scale_x = 1;
    magn_scale_y = 1;
    magn_scale_z = 1;
  }
}
#endif

/**
 * Populates raw_values with the raw_values from the sensors
*/
void IMUduino::getRawValues(int * raw_values) {
  
    magn.getValues(&raw_values[6], &raw_values[7], &raw_values[8]);

    int temp, press;
    
    //TODO: possible loss of precision
    temp = baro.rawTemperature(MS561101BA_OSR_4096);
    raw_values[9] = temp;
    
    press = baro.rawPressure(MS561101BA_OSR_4096);
    raw_values[10] = press;

}



/**
 * Computes gyro offsets
*/
void IMUduino::zeroGyro() {
  const int totSamples = 3;
  int raw[11];
  float tmpOffsets[] = {0,0,0};
  
  for (int i = 0; i < totSamples; i++){
    getRawValues(raw);
    tmpOffsets[0] += raw[3];
    tmpOffsets[1] += raw[4];
    tmpOffsets[2] += raw[5];
  }
  
  gyro_off_x = tmpOffsets[0] / totSamples;
  gyro_off_y = tmpOffsets[1] / totSamples;
  gyro_off_z = tmpOffsets[2] / totSamples;
}

