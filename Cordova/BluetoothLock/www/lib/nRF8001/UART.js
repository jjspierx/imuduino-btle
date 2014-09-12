/**
 * The nRF8001 'UART' object, see www/js/app.js and www/index.html to see 
 * how it's used.
 * 
 * Run the `adb logcat` command from your terminal to view output, as 
 * we are still having issues w/ the ionic UI not updating when a variable 
 * changes (perhaps we need to manually force angular to $digest?)
 * 
 * @author Femtoduino.com
 */

angular.module('nRF8001', ['ionic'])

  // Here's our representation of a Device.
  .factory('nRF8001.Device', ['$q', function($q) {
    var Device = function (ble, device) {
      this._device = device;
      this._connectInfo = null;
      this._deviceHandle = null;
      
      this.ble = ble;
      
      this.isConnected = false;
      this.isUARTReady = false;
      
      this.uuidService = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'; // UART service
      this.uuidRX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Read
      this.uuidTX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write
      
      this._uartService = null;
      this._readHandle = null;
      this._readDescriptor = null;
      
      this._writeHandle = null;
      
      this.readCallback = null;
      
      this.readQueue = [];
      this.writeQueue = [];
      
      var self = this;
      
      self.connect = function () {

        // Let's try and connect!
        self.ble.connect(
          device.address,
          function(connectInfo) {
            
            console.log("\n\n\t * * * CONNECT() state is " + connectInfo.state + " * * *\n\n");
            if (connectInfo.state == 2) { // Connected
              self.isConnected = true;
              self.isUARTReady = false;
              
              self._connectInfo = connectInfo;
              self._deviceHandle = connectInfo.deviceHandle;
              
              self.ble.services(
                self._deviceHandle,
                function (serviceArray) {
                  for (var s in serviceArray) {
                    var service = serviceArray[s];
                    
                    if (service.uuid === self.uuidService) {
                      // found the custom 'BLE SPP' UART service!
                      self._uartService = service;
                      
                      // ...Get the read and write characteristics handles.
                      self.ble.characteristics(
                        self._deviceHandle,
                        service.handle,
                        function (characteristics) {
                          service.characteristics = characteristics;
                          for (c in service.characteristics) {
                            var characteristic = service.characteristics[c];
                            
                            if (characteristic.uuid === self.uuidRX) {
                              // Found the RX characteristic
                              self._readHandle = characteristic.handle;
                              
                              // Enable notifications for the RX characteristic.
                              self.ble.descriptors(
                                self._deviceHandle,
                                self._readHandle,
                                function (descriptors) {
                                  console.log("\n\nGot Descriptors >>>> "+ JSON.stringify(descriptors) + "\n\n<<<<");
                                  if (descriptors.length > 0) {
                                    // We should only have one (1) descriptor.
                                    
                                    self._readDescriptor = descriptors[0];
                                    self.enableNotification( self._readHandle );
                                  }
                                },
                                function (errorCode) {
                                  console.log('Call to .descriptors() failed: ' + errorCode);
                                }
                              );
                              
                            }

                            if (characteristic.uuid === self.uuidTX) {
                              // Found the TX characteristic
                              self._writeHandle = characteristic.handle;
                            }
                          }
                          self.isUARTReady = true;
                        },
                        function (errorCode) {
                          console.log('Call to .characteristics() failed: ' + errorCode);
                        }
                      );
                      
                      
                      break;
                    }
                  }
                }
              );

            }
          },
          function(errorCode) {
            
            console.log('ble.connect() error: ' + errorCode);
          }
        );
      };
      
      self.disconnect = function () {
        self.isConnected = false;
        self.isUARTReady = false;
        
        self.ble.close(self._device.deviceHandle);
        
        self._connectInfo = null;
        self._readDescriptors = [];
        self._readHandle = null;
        self._writeHandle = null;
        self._uartService = null;
        
      };
      
      self.read = function () {
        var result = null;
        if (self.readQueue.length > 0) {
          result = self.readQueue.shift();
        }
        
        return result;
      };
      
      self.enableNotification = function (characteristicHandle) {
        console.log("\n\nreadDescriptor:\n" + JSON.stringify( self._readDescriptor ));
        // Turn on notifications
        self.ble.writeDescriptor(
          self._deviceHandle,
          self._readDescriptor.handle,
          new Uint8Array([1,0])
        );
        // Start reading notifications
        self.ble.enableNotification(
          self._deviceHandle,
          characteristicHandle,
          function (rawData) {
            // Ok
            /**
             * We've been notified of incomming data! Read it!
             */
            var data = self.ble.fromUtf8(rawData);
            
            self.readQueue.push(data);
            
            if (self.readCallback) {
              self.readCallback(data);
            }
            console.log('#### enableNotification()->(callback) called:' + JSON.stringify(data) );
            
          },
          function (errorCode) {
            console.log('Call to .enableNotification() failed: ' + errorCode);
          }
        );
      };
      
      self.disableNotification = function (characteristicHandle) {
        self.ble.disableNotification(
          self._deviceHandle,
          characteristicHandle,
          function (data) {
            /**
             * @todo Should we do something here? Perhaps a callback?
             */
          },
          function (errorCode) {
            console.log('Call to .disableNotification() failed: ' + errorCode);
          }
        );
      };
      /**
       * Write data to BLE device. 20 bytes at a time, max.
       * @param {ArrayBufferView} data
       */
      self.write = function (data, fnCallback) {
        
        self.ble.writeCharacteristic(
          self._deviceHandle,
          self._writeHandle,
          data,
          function () {
            console.log("\n\n * * * WRITE SUCCESS * * *\n\n");
            if (fnCallback) {
              fnCallback();
            }
          },
          function (errorCode) {
            console.log('BLE writeCharacteristic to UART TX failed! error: ' + errorCode);
          }
        );
//        var uint8arrayData = new Uint8Array(data);
//        console.log('writing to: ' + self._deviceHandle + ':' + self._writeHandle);
//        self.ble.writeCharacteristic(
//          self._deviceHandle,
//          self._writeHandle,
//          uint8arrayData,
//          function() {
//            console.log('WRITE SUCCESS');
//            // If a callback was provided, call it!
//            if (fnCallback) {
//              fnCallback();
//            }
//          },
//          function(errorCode) {
//            console.log('BLE writeCharacteristic to UART TX failed! error: ' + errorCode);
//          }
//        );
//      
      };
    };
    
    
    
    return Device;
  }])
  .service('UART', ['nRF8001.Device', function(Device) {


      /**
       * @todo scan([intTimeoutMs])
       * @todo connect(device)
       * 
       * @todo device {}
       * @todo 
       */


      this.ble;
      this.scannedDevices = [];
      this.isScanning = false;
      
      this.readCallback = null;

      var self = this;

      self.initialize = function($scope) {

        self.scope = $scope;
        
        self.bindEvents();
        
        if (self.onReadyCallback) {
          self.onReadyCallback();
        }
        
      };

      self.bindEvents = function() {
        self.ble = window.evothings.ble;
        
        if (window.hyper) {
          window.hyper.onReload(function() {
            self.ble.stopScan();
            self.closeAll();
          });
        }

        
      };

      self.close = function (device) {
        self.ble.close(device.deviceHandle);
      };
      
      self.closeAll = function() {
        if (self.scannedDevices.length > 0) {
          for (var i = 0; i < self.scannedDevices.length; i++) {
//            self.close(self.scannedDevices[i]);
            var d = self.scannedDevices[i];
            d.disconnect();
            
            delete self.scannedDevices[i];
          }
        }
      };

      /**
       * 
       * @param int intTimeoutMax How many seconds until stopScan() is called? Set to zero for no timeout.
       * @returns {undefined}
       */
      self.startScan = function(intTimeoutMax) {
        self.isScanning = true;
        var intTimer = 0;
        var fnTimer;
        var tmrTimeout;
        
        
        // If a timeout (seconds) amount was provided, start tracking the ticks.
        if (intTimeoutMax > 0) {
          fnTimer = function () {
            ++intTimer;
            if (tmrTimeout) {
              window.clearTimeout(fnTimer);
            }
            if (intTimer < intTimeoutMax) {
              // Subsequent timer tick, if allowed.
              tmrTimeout = window.setTimeout(fnTimer, 1000);
            } else {
              // No more timeouts! Stop scanning.
              
              self.ble.stopScan();
              intTimer = 0;
            }
          };
          
          // Initial timer tick
          tmrTimeout = window.setTimeout(fnTimer, 1000);
          
        }

        self.ble.startScan(
          function(device) {
            var newDevice = new Device(self.ble, device);
            
            if (self.readCallback) {
              newDevice.readCallback = self.readCallback;
            }
            self.scannedDevices.push( newDevice );
            
            if (self.onDeviceFoundCallback) {
              self.onDeviceFoundCallback( newDevice );
            }
          },
          function(errorCode) {
            console.log('startScan() returned error');
            console.log('Error! ' + errorCode);
          }
        );

      };
      
      self.stopScan = function () {
        self.isScanning = false;
        self.ble.stopScan();
        
        self.ble.reset();
      };
    }]);