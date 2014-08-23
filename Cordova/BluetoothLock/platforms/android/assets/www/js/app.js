// Nordic nRF8001 + Arduino Project
// Based on the original iPhone/Phonegap + nRF8001 + Arduino project
// by Don Coleman and Alasdair Allan: 
// http://makezine.com/projects/controlling-a-lock-with-an-arudino-and-bluetooth-le/
//
// This Cordova based Android project is worked on by the Femtoduino team.
// Changes:
// - We are using Cordova, so we can deploy to Android
// - We are using the evothings 'cordova-ble' plugin
// - We are using Ionic (AngularJS)

// This example Cordova project for Android shows us how to communicate with 
// an Adafruit nRF8001 break out board (Nordic), and Arduino, and a 
// new Android device that supports Bluetooth Low Energy. We are 
// using the custom GATT profile defined by Nordic for BLE "SPP".
// 
// Plugins used are available from their respective authors. 
// 
// This project source code is released under the MIT License (MIT)
// 
/*
The MIT License (MIT)

Copyright (c) <2014> <Femtoduino.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/


// Define our application! When you create an ionic project, it seems to 
// default to 'starter' as the module name. No problem, still works. :-)
angular.module('starter', ['ionic']) // Requires the 'ionic' angular module.

        // Let's define a controller. Since we only need one for this example,
        // it's just called "Main". (Not very creative, but why not)
        .controller(
                'MainCtrl',
                // Add in stuff we may need. Adding in $ionicPlatform since 
                // I want to be sure it's available before doing stuff.
                // (Maybe not necessary, but why not. Remove it and test if 
                // you see fit)
                ['$scope', '$ionicPlatform', '$timeout',
                  function($scope, $ionicPlatform, $timeout) {

                    // List of BLE devices found during scan.
                    $scope.devices = {};
                    $scope.isScanning = false; // Flag to manage ble scanning.
                    $scope.msInterval = 1000; // Scan every 1000ms (1 second)
                    $scope.msTimeout = 10; // Scan for 5 seconds, max..
                    $scope.msTick = 0; // Keep track of how many intervals have passed
                    
                    $scope.tmrStartScan = null;
                    
                    $scope.debug = '';

                    // This method is used to dynamically size the 'rssi' bar.
                    $scope.getRssiWidth = function(device) {
                      var rssiWidth = Math.max(0, 100 + (device.rssi));

                      return rssiWidth;
                    };

                    // Internal startScan() method, handles cordova plugin usage.
                    $scope.startScan = function(callbackFun) {

                      // ...Stop the cordova plugin, just in case.
                      $scope.stopScan();
                      $scope.debug += 'startScan()';

                      // ...Ok, tell the cordova plugin to start scanning!
                      // Then, delegate to the supplied callback.
                      window.evothings.ble.startScan(
                              function(device) {
                                callbackFun(device, null);
                              },
                              function(errorCode) {
                                callbackFun(null, errorCode);
                              }
                      );
                    };
                    
                    // Internal stopScan() method, handles cordova plugin usage.
                    $scope.stopScan = function() {
                      $scope.debug += 'stopScan()' + $scope.isScanning;
                      // Tell the cordova plugin to stop scanning.
                      window.evothings.ble.stopScan();
                    };


                    // UI Event handling: Start Scan!
                    $scope.onStartScanButton = function() {
                      $scope.display_status = 'Scanning...';

                      // Already scanning? ignore, and return.
                      
                      // Set our flag, so we know we are scanning.
                      $scope.isScanning = true;
                      // Not scanning yet. Let's scan every so often.
                      
                      $scope.startScan($scope.deviceFound); // First off
                      $scope.tmrStartScan = $timeout(function() { // Subsequent checks
//                        if ($scope.msTick > $scope.msTimeout) {
//                          $scope.isScanning = false;
//                          $scope.msTick = 0;
//                        }
                        if (!$scope.isScanning) {
                          $scope.debug += '[not scanning, cancel timeout]';
                          // Check to see if we should still be scanning...
                          // Nope! Return!
                          $timeout.cancel($scope.tmrStartScan);
                          return;
                        }
                        $scope.msTick++;
                        $scope.debug += 'startScan() ' + $scope.isScanning + ' [' + $scope.msTick + ']';
                        // Scan using our internall method!
                        
                        $scope.startScan($scope.deviceFound);
                        
                        // Do it again.
                        $timeout.cancel($scope.tmrStartScan);
                        
                        if ($scope.isScanning && $scope.msTick <= $scope.msTimeout) {
                          $scope.onStartScanButton();
                        } else {
                          $scope.stopScan();
                          $scope.isScanning = false;
                          $scope.msTick = 0;
                          
                          return;
                        }

                      }, $scope.msInterval); // ... Timing interval



                    };
                    // UI Event handling: Stop scan!
                    $scope.onStopScanButton = function() {
                      $scope.isScanning = false;
                      $timeout.cancel($scope.tmrStartScan);
                      $scope.stopScan(); // Stop!!!!
                      $scope.devices = {}; // Clear out the collection of devices.
                      
                      $scope.display_status = 'Scan Paused';
                      $scope.debug = '';

                    };

                    // Callback for the cordova ble startScan() method.
                    $scope.deviceFound = function(device, errorCode) {
                      
                      $scope.debug = "deviceFound()";
                      if (device) {
                        // We have a device to list! Add it to the collection!
                        $scope.devices[device.address] = device;

                      } else if (errorCode) {
                        // Hmm... Something went wrong.
                        $scope.display_status = 'Scan Error: ' + errorCode;
                      }
                    };


                  }])

        // ...Stuff to get the ionic platform running.
        .run(function($ionicPlatform) {
          $ionicPlatform.ready(function() {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
              cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            // ...this is all auto generated when the ionic project is created.
            if (window.StatusBar) {
              StatusBar.styleDefault();
            }

          });
        });
