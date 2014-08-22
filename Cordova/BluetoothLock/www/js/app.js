// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic'])

.controller('MainCtrl', ['$scope', function ($scope) {

    $scope.display_status = '';

    // List of BLE devices found during scan.
    $scope.devices = {};

    // UI methods
    $scope.ui = {};

    $scope.getRssiWidth = function (device) {
        var rssiWidth = Math.max(0, 100 + (device.rssi));

        return rssiWidth;
    };

    $scope.startScan = function (callbackFun) {
        $scope.stopScan();

        evothings.ble.startScan(
            function (device) {
                callbackFun(device, null);
            },
            function (errorCode) {
                callbackFun(null, errorCode);
            }
        );
    };

    $scope.stopScan = function () {
        evothings.ble.stopScan();
    };

    $scope.onStartScanButton = function () {
        $scope.startScan($scope.deviceFound);
        $scope.display_status = 'Scanning...';
    };

    $scope.onStopScanButton = function () {
        $scope.stopScan();
        $scope.devices = {};
        $scope.display_status = 'Scan Paused';

    };

    $scope.deviceFound = function (device, errorCode) {
        if (device) {
            $scope.devices[device.address] = device;


        } else if (errorCode) {
            $scope.display_status = 'Scan Error: ' + errorCode;
        }
    };


}])

.run(function($ionicPlatform) {
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
