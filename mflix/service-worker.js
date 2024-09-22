// make a function to easily add prefixes to each list item
function addPrefixToList(list, prefix) {
  for (let i = 0; i < list.length; i++) {
    list[i] = prefix + list[i];
  }
}

const PRECACHE = 'precache';

// cache the main files needed for the webpage
const mainFiles = [
  'index.html',
  './', // Alias for index.html
  'styles.css',
  'script.js',
  'manifest.json',
  'icons/full.png',
  'icons/masked.png',
  'icons/logo.png'
];

// cache the icons for the menu bar and other stuff
const generalIcons = [
  'account_circle.svg',
  'add.svg',
  'arrow_back.svg',
  'arrow_down.svg',
  'arrow_forward.svg',
  'arrow_up.svg',
  'close.svg',
  'delete.svg',
  'edit.svg',
  'episodes.svg',
  'history.svg',
  'home.svg',
  'list.svg',
  'loading_wheel.gif',
  'movie.svg',
  'no_cover.png',
  'no_image.svg',
  'play_arrow.svg',
  'playlist_add.svg',
  'playlist_remove.svg',
  'resume.svg',
  'save.svg',
  'search.svg',
  'tv.svg'
];
addPrefixToList(generalIcons, "icons/general/");


// combine all of the cached pages into one list
const PRECACHE_URLS = [...mainFiles, ...generalIcons];

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
    .then(cache => cache.addAll(PRECACHE_URLS))
    .then(self.skipWaiting())
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});


// On fetch, use cache but update the entry with the latest contents from the server.
self.addEventListener('fetch', function(evt) {
  // If the request doesn't come from the same origin as the referrer, don't store it
  if (!evt.request.url.includes(evt.request.referrer)) {
    return; // You can also remove the return statement if you want every request to be cached
  }
  // You can use respondWith() to answer ASAP…
  evt.respondWith(fromCache(evt.request));
  // ...and waitUntil() to prevent the worker to be killed until the cache is updated.
  evt.waitUntil(
    update(evt.request)
  );
});

// Open the cache where the assets were stored and search for the requested resource. Notice that in case of no matching, the promise still resolves but it does with undefined as value.
function fromCache(request) {
  return caches.open(PRECACHE).then(function(cache) {
    return cache.match(request);
  });
}

// Update consists in opening the cache, performing a network request and storing the new response data.
function update(request) {
  return caches.open(PRECACHE).then(function(cache) {
    return fetch(request).then(function(response) {
      return cache.put(request, response.clone()).then(function() {
        return response;
      });
    });
  });
}