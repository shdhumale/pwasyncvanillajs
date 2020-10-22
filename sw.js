const url = 'https://jsonplaceholder.typicode.com/posts';
//Define the cache name. By this name of the cache data is fetch when no internet is there.
const cacheName = 'siddhucache.1.0';
//This is the array that define the files that need to be cache.
const staticAssets = [
    './',
    './index.html',
    './index.js',
    'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css'
];

//Install :- This will be executed if site is accessed fresh or the version of the SW change. This is called immediately 
// Once the browser detect the new version of SW for registration. 
self.addEventListener('install', async e => {
    console.log('install:');
    const cache = await caches.open(cacheName);
    await cache.addAll(staticAssets);
    //below line of code will tell start working as soon as request is made. 
    return self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    console.log('activate:');
    /*     self.clients.claim(); */
    caches.match(event.request)
        .then(function (cachedFiles) {
            if (cachedFiles) {
                return cachedFiles;
            } else {
                return fetch(event.request);
            }
        })
        .catch(function (err) {
            console.log('err in fetch ', err);
        })
});

//Fetch:- Here we do following things
//Step A:- Frist check if the internet is online. If online then we will make a call to server using internet and cache the new data.
//Step B:- If no internet then show the result from the cache to the end users.
self.addEventListener('fetch', async e => {
    const req = e.request;
    const url = new URL(req.url);

    if (url.origin === location.origin) {
        //below line indicate if the requested url is same and no internet then fetch the date from the cache
        e.respondWith(displayFirstCache(req));
    } else {
        //below line indicate else make a call to the internet and fetch the new data.
        e.respondWith(callNetworkFirstAndThenDoCache(req));
    }
});

//This fuction will be used to take the data from the cache defined in cacheName
async function displayFirstCache(req) {
    //Opening the cachee
    const cache = await caches.open(cacheName);
    //Matching the request
    const cached = await cache.match(req);
    //if same then return the cached else call the internet using fetch method.
    return cached || fetch(req);
}

//This fuction will be used to take the data from the internet and fill the new values in the cache defined in cacheName
async function callNetworkFirstAndThenDoCache(req) {
    const cache = await caches.open(cacheName);
    try {
        //calling internet and taking new data.
        const fresh = await fetch(req);
        //deleting the old cahce and pusing the new data.
        await cache.put(req, fresh.clone());
        return fresh;
    } catch (e) {
        //if no internet then use the old data.
        const cached = await cache.match(req);
        return cached;
    }
}
//Calling the sync method when the use come on line
self.addEventListener('sync', function (event) {
    console.log('firing: sync');
    if (event.tag == 'back-sync') {
        event.waitUntil(syncIt());
    }
});

function syncIt() {
    console.log('Inside syncIt:');
    return getIndexedDB()
        .then(sendToServer)
        .catch(function (err) {
            return err;
        })
}

//Getting the handle of indexdb
function getIndexedDB() {
    console.log('Inside getIndexedDB:');
    return new Promise(function (resolve, reject) {
        var db = indexedDB.open('browserindexDB');
        db.onsuccess = function (event) {
            this.result.transaction("newIndexdbObjStore").objectStore("newIndexdbObjStore").getAll().onsuccess = function (event) {
                resolve(event.target.result);
            }
        }
        db.onerror = function (err) {
            reject(err);
        }
    });
}

//Makeing call to W/S.
function sendToServer(response) {
    console.log('Inside sendToServer:');
    return fetch(url, {
        method: 'POST',
        body: JSON.stringify(response),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(function (rez2) {
        console.log('Sended data', rez2);
        var myDB = indexedDB.open('browserindexDB');
        myDB.onsuccess = function (event) {
            var objStore = this.result.transaction('newIndexdbObjStore', 'readwrite').objectStore('newIndexdbObjStore');
            objStore.clear();
        }

        myDB.onerror = function (err) {
            reject(err);
        }
        return rez2.text();
    }).catch(function (err) {
        console.log('Err data', err);
        return err;
    })
}