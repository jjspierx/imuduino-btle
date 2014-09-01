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
// We require the 'ionic' module, and the 'nRF8001' module.
angular.module('starter', ['ionic', 'nRF8001'])

  // ...Stuff to get the ionic platform running.
  /**
   * NOTICE: The ionic platform *must* be ready before we
   * can use any of the cordova plugins! (ionicPlatform.ready() callback) 
   */
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

  // Let's define a controller. Since we only need one for this example,
  // it's just called "Main". (Not very creative, but why not)
  .controller(
    'MainCtrl',
    // Add in stuff we may need. Adding in $ionicPlatform since 
    // I want to be sure it's available before doing stuff.
    // (Maybe not necessary, but why not. Remove it and test if 
    // you see fit)
      ['$scope', '$ionicPlatform', 'UART',
        function($scope, ionic, UART) {
          console.log('MainCtrl()');


          $scope.debug = 'Main!';
          $scope.UART = UART;
          $scope.sendData = function (device) {
            console.log('Writing!!!');
            device.write([49]);
          };

          ionic.ready(function() {
            $scope.debug = 'ready!';

            // Start the UART service.
            $scope.UART.initialize($scope);
            $scope.UART.onDeviceFoundCallback = function() {
              $scope.UART.stopScan();
            };
          });

        }]);
