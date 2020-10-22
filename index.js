const url = 'https://jsonplaceholder.typicode.com/posts';
//Calling the method that are executed onload of the html that inbuild call index.js
window.addEventListener('load', () => {
  //register service worker
  registerSW();
  //Initializing IndexDB
  initializeDB();
  //syncButton();
  //send the data to url if online
  checkIndexedDB();
});

//register the sw.js with the browser. In this step we will check if the browser allows us to use the PWA functionality. If not we will show error to the end user.
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      //await navigator.serviceWorker.register('./sw.js');
      console.log('Inside registerSW:');
      await navigator.serviceWorker.register('./sw.js')
        .then(function () {
          return navigator.serviceWorker.ready
        })
        .then(function (registration) {
          document.getElementById('submitForm').addEventListener('click', (event) => {
            event.preventDefault();
            //If user online the save data.
            saveData().then(function () {
              if (registration.sync) {
                //registring the sync process with name
                registration.sync.register('back-sync')
                  .catch(function (err) {
                    return err;
                  })
              } else {
                // sync isn't there so fallback
                console.log('Inside registerSW checkInternet:');
                checkInternet();
              }
            });
          })
        })

    } catch (e) {
      console.log('SW registration failed');
    }
  } else {
    //If the browser did not support the PWA then also our application should work when the user in online.
    document.getElementById('submitForm').addEventListener('click', (event) => {
      //below will keep the data on the screen filled even  if the something goes wrong in later case.
      event.preventDefault();
      //Calling Save Data to call the W/S.
      saveData().then(function () {
        checkInternet();
      });
    })
  }
}

/* async function syncButton() {
  try {
    await navigator.serviceWorker.ready.then(function (swRegistration) {
      return swRegistration.sync.register('myFirstSync');
    });
  } catch (e) {
    console.log('SW registration failed');
  }
}
 */
function initializeDB() {
  console.log('Inside initializeDB:');
  var newindexDB = window.indexedDB.open('browserindexDB');

  newindexDB.onupgradeneeded = function (event) {
    var db = event.target.result;

    var newIndexdbObjStore = db.createObjectStore("newIndexdbObjStore", { autoIncrement: true });
    newIndexdbObjStore.createIndex("firstName", "firstName", { unique: false });

  }
}

//Createing indexdb that will store the value while make the call to W/S.
function checkIndexedDB() {
  console.log('Inside checkIndexedDB:');
  if (navigator.onLine) {
    console.log('Inside navigator.onLine:');
    var newindexDB = window.indexedDB.open('browserindexDB');
    newindexDB.onsuccess = function (event) {
      this.result.transaction("newIndexdbObjStore").objectStore("newIndexdbObjStore").getAll().onsuccess = function (event) {
        window.fetch(url, {
          method: 'POST',
          body: JSON.stringify(event.target.result),
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }).then(function (rez) {
          return rez.text();
        }).then(function (response) {
          newindexDB.result.transaction("newIndexdbObjStore", "readwrite")
            .objectStore("newIndexdbObjStore")
            .clear();
        }).catch(function (err) {
          console.log('err ', err);
        })
      };
    };
  }
}

//Use to save th data in side Indexdb
function saveData() {
  console.log('Inside saveData:');
  return new Promise(function (resolve, reject) {
    var tmpObj = {
      firstName: document.getElementById('firstname').value
    };

    var myDB = window.indexedDB.open('browserindexDB');

    myDB.onsuccess = function (event) {
      var objStore = this.result.transaction('newIndexdbObjStore', 'readwrite').objectStore('newIndexdbObjStore');
      objStore.add(tmpObj);
      resolve();
    }

    myDB.onerror = function (err) {
      reject(err);
    }
  })
}
//Fetching the data from indexdb
function fetchData() {
  console.log('Inside fetchData:');
  return new Promise(function (resolve, reject) {
    var myDB = window.indexedDB.open('browserindexDB');

    myDB.onsuccess = function (event) {
      this.result.transaction("newIndexdbObjStore").objectStore("newIndexdbObjStore").getAll().onsuccess = function (event) {
        resolve(event.target.result);
      };
    };

    myDB.onerror = function (err) {
      reject(err);
    }
  })
}

//Sending the data to W/S call.
function sendData() {
  console.log('Inside sendData:');
  fetchData().then(function (response) {
    var postObj = {
      method: 'POST',
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // send request
    return window.fetch(url, postObj)
  })
    .then(clearData)
    .catch(function (err) {
      console.log(err);
    });
}

//Clear the data from the indexdb once we get the network or making a call when network in online.
function clearData() {
  console.log('Inside clearData:');
  return new Promise(function (resolve, reject) {
    var db = window.indexedDB.open('browserindexDB');
    db.onsuccess = function (event) {
      db.transaction("browserindexDB", "readwrite")
        .objectStore("newIndexdbObjStore")
        .clear();

      resolve();
    }

    db.onerror = function (err) {
      reject(err);
    }
  })
}

function checkInternet() {
  console.log('Inside checkInternet:');
  event.preventDefault();
  if (navigator.onLine) {
    sendData();
  } else {
    alert("You are offline! When your internet returns, we'll finish up your request.");
  }
}
//Sending the request to W/S if the user is online.
window.addEventListener('online', function () {
  console.log('Inside online:');
  if (!navigator.serviceWorker && !window.SyncManager) {
    fetchData().then(function (response) {
      if (response.length > 0) {
        return sendData();
      }
    });
  }
});

window.addEventListener('offline', function () {
  console.log('Inside offline:');
  alert('You have lost internet access!');
});