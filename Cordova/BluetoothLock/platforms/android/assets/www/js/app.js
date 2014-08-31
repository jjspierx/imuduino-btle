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

        // ...Stuff to get the ionic platform running.
        .run(function($ionicPlatform) {
          $ionicPlatform.ready(function() {
            console.log('run() $ionicPlatform.ready()');
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
        })
        .service('Spp', ['$ionicPlatform', '$q', function ($ionic, $q) {
            
            this.debug = []
          
          
            this.ble;
            this.scannedDevices = [];
            this.isScanning = false;
            this.activeDeviceHandle;
            this.activeDeviceServices;
            this.activeCharacteristicWrite;
            this.activeCharacteristicRead;
            
            this.uuidUART_Service = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
            this.uuidUART_RX      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
            this.uuidUART_TX      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

            this.scope;
            
            var self = this;
            
            
            self.initialize = function ($ionic, $scope) {
              self.debug.push('initialize()');
              
              self.scope = $scope;
              window.setTimeout(function () {
                self.bindEvents();
              }, 1000);
              
            };
            
            self.bindEvents = function () {
              self.ble = window.evothings.ble;
              self.debug.push('bindEvents()');
              self.debug.push(typeof $ionic);
              
              if (window.hyper) {
                window.hyper.onReload(function () {
                  self.ble.stopScan();
                  self.closeAll();
                });
              }
              
              // We were initialized by a controller, should be 
              // safe to just call onDeviceReady()
              
              self.onDeviceReady();
            };
            
            self.closeAll = function () {
              self.debug.push('closeAll()');
              
              if (self.scannedDevices.length > 0) {
                for (var i = 0; i < self.scannedDevices.length; i++) {
                  self.ble.close( self.scannedDevices[i].deviceHandle );
                }
              }
            };
            
            self.onDeviceReady = function () {
              self.debug.push('onDeviceReady()');
              console.log('onDeviceReady!');
              
              
              self.isScanning = true;
              
              self.list();
            };
            
            self.list = function () {
              this.debug.push('list()');
              console.log('list()');
              // Show progress indicator
              
              // Scan with interval for 3 seconds
//              window.setTimeout(function () {
                self.ble.startScan(
                  function(device) {
                    console.log('startScan() returned device!');
                    self.ble.stopScan();
                    console.log('stopScan() called.')
                    self.scannedDevices.push( device );
                    
                    console.log('Connecting to BLE device at ' + device.address + '...');
                    self.connect( device.address );
                  },
                  function(errorCode) {
                    console.log('startScan() returned error');
                    console.log('Error! ' + errorCode);
                  }
                );
//            }, 100);
              
            };
            
            self.connect = function (device_address) {
              self.debug.push('connect()');
              console.log('connect():' + device_address);
              
              self.ble.connect(
                device_address,
                function (connectInfo) {
                  if (connectInfo.state == 2) { // Connected
                    
                    self.activeDeviceHandle = connectInfo.deviceHandle;
                    console.log('Connected! Getting BLE services for device ' + connectInfo.deviceHandle);
                    self.activeDeviceServices = self.getServices(connectInfo.deviceHandle);
                  }
                },
                
                function (errorCode) {
                  self.debug.push('ble.connect() error');
                  console.log('ble.connect() error: ' + errorCode);
                }
              );
            };
            
            self.getServices = function (deviceHandle) {
              self.debug.push('getServices()');
              console.log('Reading services...');
              window.setTimeout(function () {
                
                self.ble.services(deviceHandle, function (services) {
                  // Find handles for characteristics and descriptor needed.

                  console.log('device services count: ' + services.length);
                  for (var si in services) {
                     var service = services[si];


                     console.log('getting characteristics for service ' + service.uuid + ' (' + service.handle + ')');
                     
                     self.ble.characteristics(
                       deviceHandle,
                       service.handle,
                       
                       function (characteristics) {
                         
                         for (var ch in characteristics) {
                           var characteristic = characteristics[ch];
                          // Read descriptors for characteristic
                          console.log('Got characteristic for service ' + service.uuid + ': ' + JSON.stringify(characteristic));
                          self.ble.descriptors(
                            deviceHandle,
                            characteristic.handle,

                            function (descriptors) {
                              
                              if (descriptors && descriptors.length > 0) {
                                console.log('BLE got descriptors for ' + service.uuid + '>' + characteristic.uuid  + '!' + JSON.stringify(descriptors));
                              }

                            },

                            function (errorCode) {
                              console.log('BLE get descriptors failed! error: ' + errorCode);
                            }
                          );

                          if (characteristic.uuid == self.uuidUART_RX && !self.activeCharacteristicRead) {
                            // try reading!
                            
                            console.log('GOT THE UART RX characteristic handle.');
                            self.activeCharacteristicRead = characteristic.handle;
                            
                          }

                          if (characteristic.uuid == self.uuidUART_TX && !self.activeCharacteristicWrite) {
                            
                            console.log('GOT THE UART TX characteristic handle.');
                            self.activeCharacteristicWrite = characteristic.handle;
                            
                            // try writting!
                            console.log('WRITING to ' + deviceHandle + ', ' + self.activeCharacteristicWrite);
                            self.ble.writeCharacteristic(
                              deviceHandle,
                              self.activeCharacteristicWrite,
                              new Uint8Array([1]),
                              function () {
                                console.log('* * * * * *WRITE SUCCESS!');
                              },
                                
                              function (errorCode) {
                                console.log('BLE writeCharacteristic to UART TX failed! error: ' + errorCode);
                              }
                            );
                          
                            /* @todo Close? */
                            
                          }
                        }
                       },
                       
                       function (errorCode) {
                         console.log('BLE get characteristics failed! error: ' + errorCode);
                       }
                     );
                   
                     
                     /*
                     for (var ci in service.characteristics) {
                       var characteristic = service.characteristics[ci];
                       console.log("Characteristic UUID: " + characteristic.uuid);
                       // We already know the characteristic ids. Get their handles
                       if (characteristic.uuid == self.uuidUART_TX && !self.activeCharacteristicWrite) {
                         self.activeCharacteristicWrite = characteristic.handle;
                       }

                       if (characteristic.uuid == self.uuidUART_RX && !self.activeCharacteristicRead) {
                         self.activeCharacteristicRead = characteristic.handle;
                       }

                       for (var di in characteristic.descriptors) {
                         var descriptor = characteristic.descriptors[di];

                         console.log('Found descriptor: ' + descriptor.uuid);
                       }

                     }
                     */
                  }

                  if (self.activeCharacteristicRead && self.activeCharacteristicWrite) {
                    console.log('***********Reading...');
                    self.startReading( deviceHandle );
                  }
                });
                
              }, 500);
            };
            
            self.startReading = function(deviceHandle) {
              self.debug.push('startReading()');
            };
            
            self.disconnect = function () {
              
              self.ble.stopScan();
              self.closeAll();
              
//              self.debug = [];
//              self.scannedDevices = [];
//              self.activeCharacteristicRead = null;
//              self.activeCharacteristicWrite = null;
//              self.activeDeviceHandle = null;
//              self.activeDeviceServices = null;
            };
            
            self.onConnect = function () {
              
            };
            
            self.onDisconnect = function () {
              
            };
            
            self.onData = function () {
              
            };
            
            self.unlock = function () {
              
            };
            
            self.onDeviceList = function () {
              
            };
            
            self.showProgressIndicator = function () {
              
            };
            
            self.hideProgressIndicator = function () {
              
            };
            
            self.showUnlockScreen = function () {
              
            };
            
//            this.showDeviceListPage = function () {
//              
//            };
            
            this.setStatus = function () {
              
            };
        }])
      
        // Let's define a controller. Since we only need one for this example,
        // it's just called "Main". (Not very creative, but why not)
        .controller(
          'MainCtrl',
          // Add in stuff we may need. Adding in $ionicPlatform since 
          // I want to be sure it's available before doing stuff.
          // (Maybe not necessary, but why not. Remove it and test if 
          // you see fit)
          ['$scope', '$ionicPlatform', 'Spp',
            function($scope, ionic, Spp) {
              console.log('MainCtrl()');
              
              
              
              $scope.debug = 'Main!';
              $scope.Spp = Spp;
              
              ionic.ready(function () {
                $scope.debug = 'ready!';
                
                $scope.Spp.initialize(ionic, $scope);
              });
              
            }]);
