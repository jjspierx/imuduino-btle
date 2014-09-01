/**
 * 
 * @todo Implement notify()
 * @todo Implement read()
 * 
 */

angular.module('nRF8001', ['ionic'])

  // Here's our representation of a Device.
  .factory('nRF8001.Device', [function() {
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
      this._writeHandle = null;
      
      this.readQueue = [];
      this.writeQueue = [];
      
      var self = this;
      
      self.connect = function () {

        // Let's try and connect!
        self.ble.connect(
          device.address,
          function(connectInfo) {
            
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
                            console.log("\tchar UUID:" + characteristic.uuid);
                            if (characteristic.uuid === self.uuidRX) {
                              // Found the RX characteristic
                              self._readHandle = characteristic.handle;
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
            self.debug.push('ble.connect() error');
            console.log('ble.connect() error: ' + errorCode);
          }
        );
      };
      
      self.disconnect = function () {
        self.isConnected = false;
        self.isUARTReady = false;
        
        self.ble.close(self._device.deviceHandle);
        
        self._connectInfo = null;
        
      };
      
      self.onNotify = function () {
        /**
         * @todo Implement notify() event handling.
         */
      };
      
      self.read = function () {
        /**
         * @todo Implement notify() event handling, then implement read()
         */
      };
      /**
       * Write data to BLE device. 20 bytes at a time, max.
       * @param {ArrayBufferView} data
       */
      self.write = function (data, fnCallback) {
        
        var uint8arrayData = new Uint8Array(data);
        console.log('writing to: ', self._deviceHandle, self._writeHandle);
        self.ble.writeCharacteristic(
          self._deviceHandle,
          self._writeHandle,
          uint8arrayData,
          function() {
            console.log('WRITE SUCCESS');
            // If a callback was provided, call it!
            if (fnCallback) {
              fnCallback();
            }
          },
          function(errorCode) {
            console.log('BLE writeCharacteristic to UART TX failed! error: ' + errorCode);
          }
        );
      
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
            d.close();
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