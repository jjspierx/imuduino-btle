/**
 * Android/Cordova Bluetooth Low Energy "UART" example
 * @author Femtoduino.com ( Twitter: @femtoduino )
 * @license MIT License
 * 
 * Builds upon various other sources, including the original 
 * iPhone/Phonegap + nRF8001 + Arduino project by Don Coleman and Alasdair Allan: 
 * 
 * http://makezine.com/projects/controlling-a-lock-with-an-arudino-and-bluetooth-le/
 * 
 * We have added the nRF8001/UART.js service to simplify reading and writting to 
 * the Nordic nRF8001 chipset, which comes with the "BLE UART" custom profile 
 * already loaded.
 * 
 * There didn't seem to be any readily available Android source code to talk with 
 * the nRF8001 chipset previous to these examples... so, if you find this useful,
 * consider sharing your experience and findings too!
 * 
 * NOTE: The cordova plugins seem to execute outside of the thread running the 
 * AngularJS/Ionic code... so binding and variable updates between the two 
 * threads doesn't work... hence the manual calls to $scope.$digest() 
 * 
 * This example app does the following:
 * 
 *  -> Scan for advertising BLE slave device
 *  -> Connect to a device
 *  -> Send and Receive data, 20-chars at a time max.
 * 
 *  - Alex Albino, Femtoduino.com
 */
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


angular.module('starter', ['ionic', 'nRF8001'])

// Run the ionic platform (otherwise, nothing actually binds, and no
// directives actually get run)
.run(function($ionicPlatform) {
  
  // Ionic 'on ready' callback. Called once the cordova plugins are available.
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

// It is now safe to add in our run of the mill Angular Controllers, directives, 
// factories, services, etc...
.controller(
  'MainCtrl', // remember to set the ng-controller="MainCtrl" attribute in your HTML!
 
  ['$scope', '$ionicPlatform', 'UART',
   function ($scope, ionic, UART) {
    console.log("Running the controller");
    $scope.UART; // Our BLE UART object.
     
    $scope.timerTimeout = 3; // Scan for X seconds
    $scope.history = []; // A history log of data sent/received
    $scope.userInput = ''; // A variable to bind our input form element.
    $scope.currentDevice;
    
    // A simple method to send data! (We bind this to a button)
    $scope.sendData = function (device, data) {

      // ...Keep track of incomming and outgoing messages!
      $scope.history.push( 'Write (Tx): ' + data );

      /**
       * Our Arduino sketch doesn't expect any special formatting, it's just 
       * going to output whatever we send.
       * 
       * However, we must transmit our data as integers that represent the 
       * ASCII values of each character in our data string.
       */
      var len = data.length;
      var asciiArray = [];
      for(var i = 0; i < len; i++) {
        asciiArray.push( data.charCodeAt(i) );
      }

      // The Arduino sketch we are using runs on an 8-bit microcontroller, so we
      // have to take some special conditions into consideration. 
      // 
      // We must send our data as an array of 8-bit integers representing each 
      // character's ASCII value. The integer values are converted back to 
      // characters in our Arduino sketch.
      var sendData = new Uint8Array(asciiArray);


      // Write our integer array back to our Arduino powered device!
      device.write(sendData);

    };
    
    // Stop scanning.
    $scope.stopScan = function () {
      console.log("\n\n* * * stopScan() * * *");

      $scope.UART.stopScan();
      $scope.UART.closeAll();
      
      //$scope.UART.scannedDevices = {};
    };

    // Start scanning.
    $scope.startScan = function () {
      console.log("\n\n\n\n* * * startScan() * * *\n\n\n\n");
      
      if ($scope.UART.isScanning === true) {
        $scope.stopScan(); // Stop any ongoing scans
      }
      
      $scope.UART.startScan($scope.timerTimeout); // Start BLE scanning of advertised BLE slaves.
    };



    // Clear out our history
    $scope.clearAll = function () {

      $scope.history = [];

    };


    $scope.connect = function (device) {
      if ($scope.UART.isScanning) {
        $scope.stopScan(true);
      }
      currentDevice = device;
      console.log()
      currentDevice.connect();
      
      $scope.$apply();
    };
    // This method is called when the ionic framework has loaded.
    // This is the safest way to bind the UART callbacks, so that we
    // can rest assured the needed Cordova plugins are available before 
    // attempting to call methods (such as the internal Bluetooth LE stuff)
    ionic.ready(function() {

      // Start the UART service.
      $scope.UART = UART;
      $scope.UART.initialize($scope);

      // Get notified when data comes in! (20 chars max at a time)
      // We must bind this method only once our Cordova plugins are available, 
      // otherwise, we will get 'undefined' and 'null' errors all over the
      // place.
      $scope.UART.readCallback = function (data) {
        /**
         * @todo We can do something with the data
         * For now, we can add it to our history list
         */
        $scope.history.push( 'Read (Rx): ' + data );

        $scope.$digest(); // Manually get the AngularJS bindings to update
      };

      // Get notified when a device is detected!
      $scope.UART.onDeviceFoundCallback = function(device) {
        /**
         * @todo Do something with the UART.scannedDevices array if you want.
         * We are simply using the ng-repeat directive in our HTML to 
         * list each device. This callback is fired after the device has been 
         * added to the UART.
         */
        console.log("\n\n\n\n*** DEVICE FOUND ***\n\n\n\n");
        console.log(device);
        
        $scope.stopScan(false); // We are going to use the first device detected.
        //$scope.$digest(); // Manually get the AngularJS bindings to update
      };
      // Get notified when scanning stops.
      $scope.UART.stopScanCallback = function () {
        /**
         * @todo stopScan() has been called. Add any logic here if you need to 
         * do something else when scannig stops.
         */
      };
       
     });
 }]
);
