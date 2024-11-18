// declare some global variables
var apiKey;
var appsScriptBaseUrl = 'https://script.google.com/macros/s/AKfycbyFDxOpK9tZyuQWtzqPV7zXe979LLQSk288L4p5kIizBDGcLKRPX9YMfbNveG2tvyZ9bw/exec';
var trailerPlayer;
var trailerPlayerTimeout;
var selectedServer = null;

// main function
function main() {
  // add loading posters to each page before the actual media loads
  appendLoadingPosters('homePage', 20);
  appendLoadingPosters('homePage');
  appendLoadingPosters('moviesPage', 20);
  appendLoadingPosters('moviesPage');
  appendLoadingPosters('tvShowsPage', 20);
  appendLoadingPosters('tvShowsPage');

  var movieHistory = document.getElementById('loadingMoviesHistory');
  appendLoadingPosters(movieHistory, 10);
  var tvHistory = document.getElementById('loadingTvShowsHistory');
  appendLoadingPosters(tvHistory, 10);
  var loadingLists = document.getElementById('loadingLists');
  appendLoadingPosters(loadingLists, 10);

  // authenticate the current user immediately
  authenticate();


  // add the scroll listeners in order to load more media
  addScrollListeners();
  // add the event listeners for the search page
  addSearchListeners();
  // add the event listeners for items in the header
  addHeaderListeners();
  // add listeners for the zoom function
  addZoomListeners();
  // add listeners fot the login page
  addLoginPageListeners();
  // add listeners for orientation changes or window size changes
  addWindowResizeListeners();



  // adjust the page to reflect the current settings
  executeSettings();

}



// commonly used functions
function shuffleList(array) {
  // create a copy of the original array to avoid modifying it
  const newArray = [...array];

  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // swap newArray[i] and newArray[j]
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  // return the shuffled array
  return newArray;
}

function getRandomNumber(min, max) {
  // gets a random number between two numbers (inclusive)

  if (!max) {
    // if max doesn't exist, that means that the input for min is max and min is actually zero
    var max = min;
    var min = 0;
  }
  var max = max + 1; // makes it inclusive
  return Math.random() * (max - min) + min;
}

function stringToHash(string) {
  // used to encrypt passwords, it converts a string to a hash value
  return string.split('').reduce((hash, char) => {
    return char.charCodeAt(0) + (hash << 6) + (hash << 16) - hash;
  }, 0);
}

function countColumns() {
  // counts how many columns of media posters are currently on the screen

  // find the current page
  var mainPages = document.querySelectorAll('.main');
  for (var i = 0; i < mainPages.length; i++) {
    var main = mainPages[i];
    if (!main.classList.contains('hidden')) {
      break;
    }
  }

  var posterElm = main.querySelector('.posterContainer');

  var containerWidth = main.clientWidth;
  var imgWidth = posterElm.offsetWidth;

  // get the style of the poster element
  var style = window.getComputedStyle(posterElm);
  var totalMargin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
  var totalImgWidth = imgWidth + totalMargin;

  // return the calculation of how many columns there are
  return Math.floor(containerWidth / totalImgWidth);
}

function setLocalStorage(keyPath, value) {
  // this function sets the input value to the specified keypath of the FEC local storage item

  var fecDict = JSON.parse(localStorage.getItem('FEC'));
  if (!fecDict) {
    var fecDict = {};
  }

  // if there are no arguments, reset the local storage
  if (!keyPath && !value) {
    localStorage.setItem('FEC', JSON.stringify({}));
    return;
  }

  const parts = keyPath.split('.');
  const lastPart = parts.pop();

  const target = parts.reduce((acc, part) => {
    if (!acc[part]) {
      acc[part] = {}; // Create the nested object if it doesn't exist
    }
    return acc[part];
  }, fecDict);

  target[lastPart] = value;

  localStorage.setItem('FEC', JSON.stringify(fecDict));

}

function getLocalStorage(keyPath) {
  // this function gets the value of the specified keypath of the FEC local storage item
  var fecDict = JSON.parse(localStorage.getItem('FEC'));
  return keyPath.split('.').reduce((acc, part) => acc && acc[part], fecDict);
}

function alertMessage(message) {
  // displays an alert message in the bottom right corener

  var old = document.getElementById('alertMessage');
  if (old) {
    old.remove();
  }

  var div = document.createElement('div');
  div.id = "alertMessage";
  div.innerText = message;

  var img = document.createElement('img');
  img.src = "icons/general/close.svg";

  var imgContainer = document.createElement('div');
  imgContainer.classList.add('button');
  imgContainer.onclick = function() {
    div.remove();
  }
  imgContainer.appendChild(img);

  div.appendChild(imgContainer);

  document.body.appendChild(div);

}

function moveElement(element, steps) {
  // moves the specified element up or down amongst its siblings, without escaping its parent

  var parent = element.parentNode;
  var sibling = element;

  // if the movement specified is 0, do nothing
  if (steps == 0) {
    return;
  }

  // if steps is positive, move the element up
  if (steps > 0) {
    for (var i = 0; i < steps; i++) {
      const previousSibling = sibling.previousElementSibling;
      if (previousSibling) {
        parent.insertBefore(sibling, previousSibling);
      } else {
        // reached the top, stop moving
        break;
      }
    }
  }

  // if steps is negative, move the element down
  if (steps < 0) {
    for (var i = 0; i > steps; i--) {
      const nextSibling = sibling.nextElementSibling;
      if (nextSibling) {
        parent.insertBefore(nextSibling, sibling);
      } else {
        // reached the bottom, stop moving
        break;
      }
    }
  }

}

function resumeAvalible() {
  // checks to see if resuming the media is possible and returns true or false
  return false;
}

function loadPageFromUrlHash() {
  // loadds the specific page on load based on what the page's hash is

  var id = window.location.hash.substring(1); // remove the first character, which is the hash symbol

  if (id) {
    if (id == 'page-history') {
      displayPage('myListsPage');
      showList('history');

    } else if (id.includes('page-')) {
      var page = id.substring(5); // remove the first 5 characters, which are 'page-'
      displayPage(page);

    } else if (id.includes('watch-')) {
      var parts = id.split('-');
      var mediaType = parts[1];
      var tmdbId = parts[2];
      var seasonNum = parts[3];
      var episodeNum = parts[4];
      displayInfoPage(tmdbId, mediaType, undefined, seasonNum, episodeNum);

    } else if (id.includes('search-')) {
      var searchString = id.substring(7); // remove the first 7 characters, which are 'search-'
      var query = decodeURIComponent(searchString);

      displayPage('searchPage');

      searchMoviesAndTvShows(query).then(response => {
        document.getElementById('searchInput').value = query;
        displaySearchResults(response);
      });

    }
  } else {
    loadPageContent('homePage');
  }
}

function animateMoveElement(element, steps, direction) {
  const parent = element.parentNode;
  let sibling = element;

  // Ensure steps are not zero
  if (steps === 0) return;

  // Define the element size (height for vertical, width for horizontal)
  const size = direction === 'v' ? sibling.offsetHeight : sibling.offsetWidth;

  // Helper function to handle DOM swap after animation
  const swapElementsInDOM = (element, target) => {
    if (target) {
      // Move element up (insertBefore the target)
      if (steps > 0) {
        parent.insertBefore(element, target);
      }
      // Move element down (insert target before element)
      else {
        parent.insertBefore(target, element);
      }
    }
  };

  // Helper function to animate both elements
  const animateSwap = (sibling, target) => {
    // Add transition class for both elements
    sibling.classList.add('moving');
    target.classList.add('moving');

    // Calculate and apply the translation based on direction (vertical or horizontal)
    const translation = size * steps;
    if (direction === 'v') {
      sibling.style.transform = `translateY(${-translation}px)`;
      target.style.transform = `translateY(${translation}px)`;
    } else {
      sibling.style.transform = `translateX(${-translation}px)`;
      target.style.transform = `translateX(${translation}px)`;
    }

    // After the transition finishes, swap the elements in the DOM and reset the styles
    setTimeout(() => {
      // Reset the transformation
      sibling.style.transform = '';
      target.style.transform = '';

      // Swap the elements in the DOM
      swapElementsInDOM(sibling, target);

      // Remove the transition class
      sibling.classList.remove('moving');
      target.classList.remove('moving');
    }, 300); // Match the transition duration with CSS
  };

  // Handle moving up (positive steps)
  if (steps > 0) {
    for (let i = 0; i < steps; i++) {
      const previousSibling = sibling.previousElementSibling;
      if (previousSibling) {
        animateSwap(sibling, previousSibling); // Animate the swap with previous sibling
        sibling = previousSibling; // Continue with the previous sibling for next iteration
      } else {
        break; // Stop if reached the first sibling
      }
    }
  }

  // Handle moving down (negative steps)
  if (steps < 0) {
    for (let i = 0; i > steps; i--) {
      const nextSibling = sibling.nextElementSibling;
      if (nextSibling) {
        animateSwap(sibling, nextSibling); // Animate the swap with next sibling
        sibling = nextSibling; // Continue with the next sibling for next iteration
      } else {
        break; // Stop if reached the last sibling
      }
    }
  }
}

function animateRemoval(element, direction) {
  // Add the 'disappearing' class to smoothly fade out and shrink the element
  if (direction == "v") {
    const elementHeight = element.offsetHeight;
    element.style.height = `${elementHeight}px`;
    var className = 'disappearingVertical';
  } else if (direction == "h") {
    const elementWidth = element.offsetWidth;
    element.style.width = `${elementWidth}px`;
    var className = 'disappearingHorizontal';
  }

  // Step 2: Apply the transition in the next tick (after a tiny delay)
  setTimeout(() => {
    // Add the 'disappearing' class, which will cause the element to fade out and collapse
    element.classList.add(className);
  }, 10); // Small delay to ensure the height is applied first

  // Step 3: Wait for the transition to finish, then remove the element from the DOM
  setTimeout(() => {
    element.parentNode.removeChild(element);
  }, 310); // 300ms to match the CSS transition (plus a little buffer)
}






// functions for loging in users
function authenticate() {
  // authenticate the user by checking to see if they have the apiKey, if not, make them login

  apiKey = getLocalStorage('Mflix.apiKey');
  if (apiKey) {
    // load the page from the hash in the window's url
    loadPageFromUrlHash();
    // hide the login page
    var loginPage = document.getElementById('loginPage');
    loginPage.classList.add("hidden");
    // add the user's name to the header
    var userProfileDiv = document.querySelector('#header > div > div');
    userProfileDiv.innerText = getLocalStorage('username');

  } else {
    var username = getLocalStorage('username');
    var password = getLocalStorage('password');
    if (username && password) {
      login(username, password);
    } else {
      // show the login page
      var loginPage = document.getElementById('loginPage');
      loginPage.classList.remove("hidden");
    }
  }
}

function login(username, passwordHash) {
  // login to the website to get the apiKey

  // disable the inputs
  document.getElementById("username").setAttribute('disabled', true);
  document.getElementById("password").setAttribute('disabled', true)

  // get the loginPage and error message div
  var loginPage = document.getElementById('loginPage');
  var errorMsgDiv = loginPage.children[4];
  errorMsgDiv.innerText = "";

  // if the username or password don't have any value, get the values from the input
  if (!username || !passwordHash) {
    // first check to see if the user already clicked the login button
    if (!loginPage.children[6].children[0].classList.contains('hidden')) {
      // the user is already trying to login, don't contact the server again
      return;
    }
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value.trim();
    if (!username || !password) {
      //displayPopup('username and password required');
      errorMsgDiv.innerText = "Username and Password Required";
      return;
    }
    var passwordHash = stringToHash(password);
  }

  // show the loading gif
  var loadingGif = loginPage.children[6].children[0];
  loadingGif.classList.remove('hidden');

  // contact the google apps script to validate login information
  var url = appsScriptBaseUrl + "?exec=login&username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(passwordHash);

  fetch(url)
    .then((response) => {
      return response.json();
    })
    .then((response) => {
      var key = response['apiKey'];
      if (!key) {
        var loginPage = document.getElementById('loginPage');
        loginPage.classList.remove("hidden");
        errorMsgDiv.innerText = response['error'];
        loadingGif.classList.add('hidden');
        document.getElementById("username").removeAttribute('disabled');
        document.getElementById("password").removeAttribute('disabled');
        return;
      }
      setLocalStorage("username", username);
      setLocalStorage("password", passwordHash);
      setLocalStorage("Mflix.apiKey", key);
      authenticate();
    });
}

function logout() {
  // logout of the website

  // reset the local storage by passing no arguments to setLocalStorage()
  setLocalStorage();

  // update the page hash
  window.location.hash = '';

  // reload the page
  var homePage = document.location.origin + document.location.pathname;
  document.location.href = homePage;
}



// functions for showing, hiding, and loading main page content
function displayPage(pageID) {
  // displays the page based off the pageID and hides the others

  // update the page hash
  window.location.hash = "page-" + pageID;

  // load the content for that page
  loadPageContent(pageID);

  // mark the selected page in the menubar as active and remove the other active classes
  var currentTab = document.querySelector('#menubar > .active');
  if (currentTab) {
    currentTab.classList.remove('active');
  }
  var newTab = document.getElementById(pageID.replace('Page', ''));
  if (newTab) {
    newTab.classList.add('active');
  }

  if (pageID == "settingsPage") {
    // the page is the settings page, so add the hidden class back to userDropdownOptions
    var dropdown = document.getElementById('userDropdownOptions');
    dropdown.classList.add('hidden');
  }

  // find the right page and make it visible, but hide the others
  var pageList = ['searchPage', 'homePage', 'moviesPage', 'tvShowsPage', 'myListsPage', 'settingsPage'];
  for (var i = 0; i < pageList.length; i++) {
    var id = pageList[i];
    var page = document.getElementById(id);
    page.classList.add('hidden');
  }
  var page = document.getElementById(pageID);
  page.classList.remove('hidden');
}

function loadPageContent(category) {
  // load the media for the page of the specific category

  if (category == 'homePage') {
    // first check to see if new page content needs to be loaded
    var container = document.getElementById(category).querySelector('.container');
    if (container.dataset.loaded == "true") {
      return; // don't load the content again
    }

    var url = 'https://api.themoviedb.org/3/discover/movie?api_key=' + apiKey + '&language=en-US&sort_by=popularity.desc&include_adult=false';
    fetch(url)
      .then(response => response.json())
      .then(data => {

        container.innerHTML = ''; // Clear previous content

        data.results.forEach(item => {
          var poster = makePosterDiv(item.id, item.title, "", item.poster_path, "movie");
          container.appendChild(poster);
        });

        // append invisible posters
        appendInvisiblePosters(container);

        // show that the content is already loaded
        container.dataset.loaded = "true";

        var genreDict = {
          10751: "Family Movies",
          28: "Action Movies",
          16: "Animation Movies",
          12: "Adventure Movies",
          14: "Fantasy Movies",
          27: "Horror Movies",
          878: "Science Fiction Movies",
          18: "Drama Movies",
          35: "Comedy Movies"
        };

        var currentDate = new Date().toISOString().split('T')[0]; // get current date in YYYY-MM-DD format

        var keys = Object.keys(genreDict);
        for (var i = 0; i < keys.length; i++) {
          var genreId = keys[i];
          var title = genreDict[genreId];
          var pageNum = getRandomNumber(2, 50);
          var url = 'https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=' + pageNum + '&region=US&release_date.lte=' + currentDate + '&sort_by=popularity.desc&with_genres=' + genreId + '&with_origin_country=US&with_original_language=en&api_key=' + apiKey;
          var mediaType = 'movie';
          createHorizontalList(title, url, mediaType, container, '');
        }

      })
      .catch(error => console.error('Error:', error));

  } else if (category == 'moviesPage') {
    getLatestMedia(1, category);

  } else if (category == 'tvShowsPage') {
    getLatestMedia(1, category);
  } else if (category == 'myListsPage') {
    // load the content for the myListsPage
    getWatchLists();

    // if the currently showing page is the history page, update the url hash
    var historyContainer = document.getElementById('myListsPage').getElementsByClassName('container')[1];
    if (!historyContainer.classList.contains('hidden')) {
      window.location.hash = "page-history";
    }
  } else if (category == 'searchPage') {
    // display search suggestions on the search page
    loadSearchSuggestions();
  }
}



// functions for loading the movie and tv posters
function getLatestMedia(pageNum = 1, category) {
  // get the latest tv shows or movies from the vidsrc api and add them to the container

  var element = document.getElementById(category).querySelector('.container');
  if (element.dataset.loading == 'true' || element.dataset.lastpagenum >= pageNum) {
    // if the previous media is still loading or the menu bar button is pressed again, do nothing
    return;
  } else {
    // show that the new media is now loading
    element.dataset.loading = 'true';
  }


  if (category == 'moviesPage') {
    var url = 'https://vidsrc.me/movies/latest/page-' + pageNum + '.json';
    var mediaType = 'movie';
  } else if (category == 'tvShowsPage') {
    var url = 'https://vidsrc.me/tvshows/latest/page-' + pageNum + '.json';
    var mediaType = 'tv';
  }

  fetch(url)
    .then(response => response.json())
    .then(data => {
      idList = [];
      for (var i = 0; i < data.result.length; i++) {
        idList[i] = data.result[i].tmdb_id;
      }

      // Creating an array of fetch promises for each movie ID
      const movieDetailsPromises = idList.map(id =>
        fetch('https://api.themoviedb.org/3/' + mediaType + '/' + id + '?api_key=' + apiKey)
        .then(response => response.json())
      );

      // Handling the resolved promises
      Promise.all(movieDetailsPromises)
        .then(movies => {
          // first remove the loading posters
          removeLoadingPosters(category);
          var container = document.getElementById(category).querySelector('.container');
          //container.innerHTML = ''; // Clear previous content
          // Iterating over each movie to extract and log the cover URL
          for (let i = 0; i < movies.length; i++) {
            let movie = movies[i];

            var title = movie.title || movie.name || data.result[i].title;
            var quality = data.result[i].quality;
            var imgURL = movie.poster_path;

            var poster = makePosterDiv(idList[i], title, quality, imgURL, mediaType);

            container.appendChild(poster);
            container.dataset.lastpagenum = pageNum;
          }
          // set the loading status back to false
          element.dataset.loading = 'false';

          // add more loading posters
          appendLoadingPosters(category);
        })
        .catch(error => console.error('Error fetching movie details:', error));

    })
    .catch(error => {
      console.error(error);
      alertMessage('Failed to get newly added media, server is down');
    });
}

function loadMoreMedia() {
  // loads more movies or tv shows for the currently active page

  var pageID = document.querySelector('#menubar > .active').id;
  var page = document.getElementById(pageID + 'Page').querySelector('.container');
  var lastPageNum = page.dataset.lastpagenum;

  getLatestMedia(lastPageNum + 1, pageID);
}

function makePosterDiv(id, title = "undefined title", quality = "", imgURL, mediaType) {
  // creates the html for each poster image, along with the quality and title

  var mainElm = document.createElement('div');
  mainElm.classList.add('posterContainer');
  mainElm.dataset.id = id;
  mainElm.dataset.mediaType = mediaType;

  var qaulityElm = document.createElement('div');
  qaulityElm.innerText = quality;

  var titleElm = document.createElement('div');
  titleElm.innerText = title;

  var img = document.createElement('img');
  if (!imgURL) {
    img.src = "icons/general/no_cover.png";
  } else {
    img.src = 'https://image.tmdb.org/t/p/w185' + imgURL;
  }


  mainElm.onclick = function() {
    // display the info page
    displayInfoPage(id, mediaType, title, 1, 1); // the two ones are for selecting the default season and episode
  };

  mainElm.appendChild(img);
  mainElm.appendChild(qaulityElm);
  mainElm.appendChild(titleElm);

  return mainElm;
}

function appendLoadingPosters(mediaPageID, repeatNum) {
  // creates loading posters to display at the bottom of the movies and tv shows page

  // if the page id is a string, get the container in that string
  if (typeof mediaPageID == "string") {
    var container = document.getElementById(mediaPageID).querySelector('.container');

  } else {
    // mediaPageID is an element, so append the posters directly to it
    var container = mediaPageID;

  }


  if (!repeatNum) {
    var numColumns = countColumns();
    var numPosters = container.children.length;
    var repeatNum = numColumns - (numPosters % numColumns);
  }

  for (var i = 0; i < repeatNum; i++) {
    var mainElm = document.createElement('div');
    mainElm.classList.add('posterContainer');
    mainElm.classList.add('noHover');

    var qaulityElm = document.createElement('div');

    var titleElm = document.createElement('div');

    var span = document.createElement('span');
    span.classList.add('loadingWave');

    mainElm.appendChild(span);
    mainElm.appendChild(qaulityElm);
    mainElm.appendChild(titleElm);

    container.appendChild(mainElm);
  }

}

function removeLoadingPosters(mediaPageID) {
  // removes the loading posters at the bottom of the tv shows and movies pages

  // if the page id is a string, get the container in that string
  if (typeof mediaPageID == "string") {
    var container = document.getElementById(mediaPageID).querySelector('.container');

  } else {
    // mediaPageID is an element, so remove the posters directly from it
    var container = mediaPageID;

  }

  var loadingPosters = container.querySelectorAll('.noHover');

  for (var i = 0; i < loadingPosters.length; i++) {
    loadingPosters[i].remove();
  }
}

function appendInvisiblePosters(mediaPageID, repeatNum) {
  // creates loading posters to display at the bottom of the movies and tv shows page

  // if the page id is a string, get the container in that string
  if (typeof mediaPageID == "string") {
    var container = document.getElementById(mediaPageID).querySelector('.container');

  } else {
    // mediaPageID is an element, so append the posters directly to it
    var container = mediaPageID;

  }


  if (!repeatNum) {
    var numColumns = countColumns();
    var numPosters = container.children.length;
    var repeatNum = numColumns - (numPosters % numColumns);
    if (repeatNum == numColumns) {
      repeatNum = 0;
    }
  }

  for (var i = 0; i < repeatNum; i++) {
    var mainElm = document.createElement('div');
    mainElm.classList.add('posterContainer');
    mainElm.classList.add('noHover');

    var qaulityElm = document.createElement('div');

    var titleElm = document.createElement('div');

    var span = document.createElement('span');

    mainElm.appendChild(span);
    mainElm.appendChild(qaulityElm);
    mainElm.appendChild(titleElm);

    container.appendChild(mainElm);
  }

}

function adjustPosterSpacing() {
  // adjusts how many loading or invisible posters are displayed on various pages

  var containerList = ['searchPage', 'homePage', 'moviesPage', 'tvShowsPage'];

  for (var i = 0; i < containerList.length; i++) {
    let container = document.querySelector('#' + containerList[i] + ' > .container');
    let children = container.querySelectorAll('.posterContainer');

    // don't do anything if the following are true
    if (container.dataset.lastpagenum == 0 || container.dataset.loaded == 'false' || children.length == 0) {
      continue;
    }

    let posters = container.querySelectorAll('.loadingWave');
    removeLoadingPosters(container);
    if (posters.length > 0) {
      // the posters should be loading
      setTimeout(function() {
        appendLoadingPosters(container);
      }, 1);

    } else {
      // the posters shoud be invisible
      setTimeout(function() {
        appendInvisiblePosters(container);
      }, 100);

    }

  }
}

async function createHorizontalList(title, url, mediaType, container, label) {
  // creates a list in the container that is specified

  // generate a new list
  var newList = document.createElement('div');
  newList.classList.add('listContainer');
  newList.innerHTML = '<h4><div><div>' + title + '</div></div></div></h4><div class="horizontalScroll"></div>';


  // fetch the url
  var response = await fetch(url);
  var data = await response.json();

  var media = data.results;


  var scrollContainer = newList.querySelector('.horizontalScroll');

  // loop through each modia to create a poster
  for (let i = 0; i < media.length; i++) {
    let item = media[i];

    var id = item.id;
    var title = item.title || item.name;
    if (label != undefined) {
      var qualityDiv = label;
    } else if (mediaType == 'tv') {
      var qualityDiv = "TV";
    } else if (mediaType == 'movie') {
      var qualityDiv = "Movie";
    }
    var imgURL = item.poster_path;

    // make the poster with the info, plus add an overlay that will move the media in the list
    let poster = makePosterDiv(id, title, qualityDiv, imgURL, mediaType);

    scrollContainer.appendChild(poster);
  }


  // append the list to the container
  container.appendChild(newList);

  // return the element
  return newList;

}



// functions that display or get info for the infoPage
async function displayInfoPage(mediaId, mediaType, optionalTitle, optionalSeasonNum, optionalEpisodeNum) {
  // display the info page with the results about the movie or tv show

  // store the previous hash and update the page's hash to the new one
  document.getElementById('backButton').dataset.previousHash = window.location.hash;
  window.location.hash = "watch-" + mediaType + "-" + mediaId;

  // load a video right away so that the player on mobile doesn't error on first attempt
  try {
    if (!trailerPlayer.getVideoData().video_id) {
      trailerPlayer.loadVideoById('none');
      trailerPlayer.playVideo();
      trailerPlayer.stopVideo();
    }
  } catch (e) {
    console.error("Could not load trailer immediately for mobile")
  }

  if (mediaType == 'movie') {
    var url = 'https://api.themoviedb.org/3/movie/' + mediaId + '?api_key=' + apiKey;
  } else if (mediaType == 'tv') {
    var url = 'https://api.themoviedb.org/3/tv/' + mediaId + '?api_key=' + apiKey;
  }

  fetch(url)
    .then(response => response.json())
    .then(media => {
      // Display media info
      var infoPage = document.getElementById('infoPage');
      infoPage.classList.remove('hidden');
      infoPage.dataset.id = mediaId;
      infoPage.dataset.mediaType = mediaType;
      var infoSplit1 = document.getElementById('infoSplit1');
      // set the title
      var titleElem = infoSplit1.children[0];
      titleElem.innerText = media.title || media.name || optionalTitle;
      // set the date
      displayReleaseDate(media.release_date || media.first_air_date);
      // set the critic rating
      displayRating(media.vote_average);
      // set the runtime
      displayRuntime(media.runtime || [media.number_of_episodes, media.number_of_seasons], mediaType);
      // set the certification rating
      displayCertification(mediaId, mediaType);
      // set the description / overview
      var overviewElem = infoSplit1.children[2].children[0];
      overviewElem.innerText = media.overview || "";

      // adjust the height of the overview / description element
      adjustOverviewHeight();

      // get the backdrop of the movie or tv show
      var infoSplit2 = document.getElementById('infoSplit2');
      infoSplit2.style.backgroundImage = 'url("https://image.tmdb.org/t/p/original' + media.backdrop_path + '")';
      if (!media.backdrop_path) {
        var img = infoSplit2.querySelector('img');
        img.classList.remove('hidden');
      } else {
        var img = infoSplit2.querySelector('img');
        img.classList.add('hidden');
      }


      // load the movie or tv show trailer
      getMediaTrailer(mediaId, mediaType).then(trailerID => {
        var trailerBtn1 = document.getElementById('stopTrailer');
        var trailerBtn2 = document.getElementById('restartTrailer');
        if (trailerID != null) {

          // make sure that the trailer buttons are visible
          trailerBtn1.classList.remove('hidden');
          trailerBtn2.classList.remove('hidden');

          // make the buttons behave properly
          trailerBtn1.onclick = function() {
            startTrailer(trailerID);
          }
          trailerBtn1.setAttribute("data-id", trailerID);

          // only autoplay the trailer if the setting is set to do so
          if (getSetting('autoStartTrailer')) {

            try {
              // load the video right away, but don't play it yet
              trailerPlayer.cueVideoById(trailerID);
            } catch {
              console.error('trailerPlayer is not yet defined, trailer autostart will not commence')
              return;
            }

            // autostart the trailer after 5 seconds
            trailerPlayerTimeout = setTimeout(function() {
              startTrailer(); // don't use a video id, so that the player doesn't have to reload
            }, 5000);

          }

        } else {
          // the trailer does not exist
          trailerBtn1.classList.add('hidden');
          trailerBtn2.classList.add('hidden');
        }
      });

      // preload the media
      preLoadMedia(mediaId, mediaType, optionalSeasonNum, optionalEpisodeNum);

      // check to see if resuming the media is avalible
      if (resumeAvalible() && mediaType == 'movie') {
        document.getElementById('resumeButton').classList.remove('hidden');
      } else if (mediaType == 'tv') {
        document.getElementById('episodesButton').classList.remove('hidden');
        populateEpisodesDropdown(media.seasons, media.last_episode_to_air);
        // select the correct season and episode
        selectLastEpisode(mediaId);
      }

    })
    .catch(error => {
      console.error(error);
      alertMessage(error);
    });

}

function displayReleaseDate(inputDate) {
  // display the release date on the infoPage

  if (inputDate == null || inputDate == undefined || inputDate == "") {
    var releaseText = "Not Yet Released";
  } else {
    var releaseDate = new Date(inputDate);
    var options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }
    var releaseText = releaseDate.toLocaleDateString('en-US', options);
  }

  var releaseElem = document.querySelector("#infoCluster > table > tbody > tr:nth-child(1) > td:nth-child(1)");
  releaseElem.innerText = releaseText;
}

function displayRating(ratingNum) {
  // displays the critic rating on the infoPage

  if (ratingNum == null || ratingNum == undefined || ratingNum == "") {
    var ratingNum = "-";


  } else {
    // round the rating to one decimal point
    var ratingNum = Math.round(ratingNum * 10) / 10;

  }

  var ratingElem = document.querySelector("#infoCluster > table > tbody > tr:nth-child(1) > td:nth-child(2)");
  var string = ratingNum + " ★";
  ratingElem.innerText = string;
}

function displayCertification(movieId, mediaType) {
  // display the certification rating on the infoPage

  if (mediaType == 'movie') {
    var url = 'https://api.themoviedb.org/3/movie/' + movieId + '/release_dates?api_key=' + apiKey;
  } else if (mediaType == 'tv') {
    var url = 'https://api.themoviedb.org/3/tv/' + movieId + '/content_ratings?api_key=' + apiKey
  }

  fetch(url)
    .then(response => response.json())
    .then(releaseData => {
      try {
        var certificationElem = document.querySelector("#infoCluster > table > tbody > tr:nth-child(2) > td:nth-child(1)");
        // Find the US certification
        const usRelease = releaseData.results.find(country => country.iso_3166_1 === 'US');
        if (usRelease) {
          var usCertification = usRelease.rating || usRelease.release_dates[0].certification;
          if (usCertification == "") {
            var usCertification = "NR";
          }
          certificationElem.innerText = usCertification;
        } else {
          certificationElem.innerText = "NR"; // default rating if the rating is not found
        }
      } catch {
        certificationElem.innerText = "NR"; // default rating if the rating is not found
      }
    });
}

function displayRuntime(runTime, mediaType) {
  // displays the runtime or seasons and episodes on the infoPage

  if (mediaType == 'tv') {
    var seasons = runTime[1] || '-';
    var episodes = runTime[0] || '-';
    var string = 'S' + seasons + ' E' + episodes;

  } else {
    if (typeof runTime != 'number') {
      var string = "-h -m";

    } else {
      var hours = Math.floor(runTime / 60);
      var minutes = runTime % 60;
      var string = hours + "h " + minutes + "m";
    }
  }

  var runtimeElem = document.querySelector("#infoCluster > table > tbody > tr:nth-child(2) > td:nth-child(2)");
  runtimeElem.innerText = string;

}

function adjustOverviewHeight() {
  // adjusts the description/overview height for when the user switches device orientation

  var flexElement = document.querySelector("#infoSplit1 > div.flex");
  flexElement.style.maxHeight = '1px';

  // check if the device is in landscape mode
  if (window.matchMedia("(orientation: landscape)").matches) {
    // it is in landscape mode, so set the max height to the scroll height of the flex content
    var flexContent = document.getElementById('descriptionContent');
    flexElement.style.maxHeight = flexContent.scrollHeight + 'px';
  } else {
    // it is not in portrait mode, so set the max heoght of the flex element to 100%
    flexElement.style.maxHeight = "100%";
  }
}

async function getMediaTrailer(mediaId, mediaType) {
  // function to get the movie or tv show trailer and return the video id

  // get the correct url based on the media type
  if (mediaType == 'movie') {
    var url = 'https://api.themoviedb.org/3/movie/' + mediaId + '/videos?api_key=' + apiKey;
  } else if (mediaType == 'tv') {
    var url = 'https://api.themoviedb.org/3/tv/' + mediaId + '/videos?api_key=' + apiKey;
  }

  // try to fetch the url
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }

    const data = await response.json();

    // find the YouTube trailer from the results of the url
    const trailer = data.results.find(video => video.site === 'YouTube' && video.type === 'Trailer');

    if (trailer) {
      return trailer.key;
    } else {
      return null;
    }

  } catch (error) {
    // return null and log the error
    console.error('There has been a problem with your fetch operation:', error);
    return null;
  }
}

function resetInfoPage() {
  // reset the info page when going back to the main page

  // stop the trailer
  try {
    trailerPlayer.stopVideo();
  } catch (e) {
    console.error(e);
  }

  // set the movie info back to normal
  var infoPage = document.getElementById('infoPage');
  infoPage.classList.add('hidden');
  var infoSplit1 = document.getElementById('infoSplit1');
  var titleElem = infoSplit1.children[0];
  titleElem.innerText = "";
  var infoCluster = document.getElementById('infoCluster');
  infoCluster.innerHTML = '<table><tbody><tr><td>Sep 20, 1987</td><td>10 / 10</td></tr><tr><td>PG-13</td><td>1h 48m</td></tr></tbody></table>';
  var overviewElem = infoSplit1.children[2].children[0];
  overviewElem.innerText = "";
  document.getElementById('resumeButton').classList.add('hidden');
  document.getElementById('episodesButton').classList.add('hidden');
  var loadingLastEpisodeDiv = document.querySelector("#episodesDropdown > div > div:nth-child(1)");
  loadingLastEpisodeDiv.classList.add('loadingWave');
  loadingLastEpisodeDiv.innerText = "Loading Last Watched Episode...";
  var playBtn = document.getElementById('playButton');
  playBtn.querySelector('div').innerText = "Play";

  // display the overlay over the trailer again
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'none';

  // reset the dataset of the infopage
  infoPage.removeAttribute('data-id');
  infoPage.removeAttribute('data-media-type');
  infoPage.removeAttribute('data-position');

  // stop the trailer from playing if the timeout has not happened yet
  clearTimeout(trailerPlayerTimeout);

  // find which page is showing and update the page's hash
  var previousHash = document.getElementById('backButton').dataset.previousHash;
  if (previousHash.includes('#watch-')) {
    // the page was reloaded, so shiw the home page
    displayPage('homePage');
  } else {
    // set the hash to the previousHash
    window.location.hash = previousHash;
  }
}



// functions that use the YouTube player
function onYouTubeIframeAPIReady() {
  // this function creates an <iframe> for the youtube player after the API code downloads

  trailerPlayer = new YT.Player('ytTrailerPlayer', {
    height: '100%',
    width: '100%',
    videoId: '',
    events: {
      'onStateChange': onTrailerStateChange,
      'onError': onTrailerError
    },
    playerVars: {
      'autoplay': 1,
      'controls': 0,
      'disablekb': 1,
      'iv_load_policy': 3
    }
  });

}

function onTrailerStateChange(event) {
  // the youtube API calls this function when the player's state changes

  var trailerBtn = document.getElementById('stopTrailer');

  if (event.data == YT.PlayerState.ENDED) {
    // the trailer has ended
    var playerElement = document.getElementById('ytTrailerPlayer');
    playerElement.style.display = 'none';
    trailerBtn.innerText = "Start Trailer";
    trailerBtn.onclick = function() {
      var id = trailerPlayer.getVideoData().video_id;
      startTrailer(id);
    }

  } else if (event.data == YT.PlayerState.PAUSED) {
    // the trailer has been paused
    trailerBtn.innerText = "Resume Trailer";
    trailerBtn.onclick = function() {
      var playerElement = document.getElementById('ytTrailerPlayer');
      playerElement.style.display = 'block';
      trailerPlayer.playVideo();
      trailerBtn.innerText = "Stop Trailer";
      trailerBtn.onclick = function() {
        trailerPlayer.pauseVideo();
      }
    }

  } else if (event.data == YT.PlayerState.PLAYING) {
    // the trailer has been resumed
    var playerElement = document.getElementById('ytTrailerPlayer');
    playerElement.style.display = 'block';
    trailerBtn.innerText = "Stop Trailer";
    trailerBtn.onclick = function() {
      trailerPlayer.pauseVideo();
    }

  } else if (event.data == -1) {
    // the trailer hasn't started yet
    trailerBtn.innerText = "Start Trailer";
    trailerBtn.onclick = function() {
      var id = trailerPlayer.getVideoData().video_id;
      startTrailer(id);
    }
  }
}

function onTrailerError(event) {
  // there was an error with the player, the video might no longer exist

  // hide the trailer player buttons and the player itself
  var trailerBtn1 = document.getElementById('stopTrailer');
  var trailerBtn2 = document.getElementById('restartTrailer');
  trailerBtn1.classList.add('hidden');
  trailerBtn2.classList.add('hidden');
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'none';

}

function startTrailer(trailerID) {
  // start the trailer with the given id or use the existing video in the player

  clearTimeout(trailerPlayerTimeout); // clear the timeout so that the trailer doesn't start over
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'block';

  if (trailerID) {
    // if the trailer id exists, load the player with the new video, otherwise play the existing video
    trailerPlayer.loadVideoById(trailerID);
  }

  trailerPlayer.playVideo();
}

function restartTrailer() {
  // restart the trailer and adjust the trailer player buttons

  // display the player again
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'block';

  var trailerBtn = document.getElementById('stopTrailer');
  if (trailerBtn.innerText == "Start Trailer") {
    trailerBtn.click();
    return;
  }
  trailerPlayer.seekTo(0);
  trailerPlayer.playVideo();
  var trailerBtn = document.getElementById('stopTrailer');
  trailerBtn.innerText = "Stop Trailer";
  trailerBtn.onclick = stopTrailer;
}



// functions for getting the source url for the media
async function preLoadMedia(tmdbID, mediaType, seasonNum, episodeNum) {
  // try to get the original source from vidsrc, otherwise use the regular embed url

  // update the hash to represent what episode the user is on
  if (mediaType == 'tv' && seasonNum && episodeNum) {
    window.location.hash = "watch-" + mediaType + "-" + tmdbID + "-" + seasonNum + "-" + episodeNum;
  } else if (mediaType == 'tv') {
    window.location.hash = "watch-" + mediaType + "-" + tmdbID;
  }

  var playBtn = document.getElementById('playButton');
  playBtn.onclick = "";

  var infoPage = document.getElementById('infoPage');


  try {
    // get the vidsrc id from tmdb id
    var vidsrcID = await getVidsrcId(tmdbID);
    var sourcesDict = await getSources(vidsrcID);
    // get the fid of the first source
    var sourceID = sourcesDict[Object.keys(sourcesDict)[0]];
    // get the url of the movie
    var sourceURL = await getSourceUrl(sourceID);

    // add the autostart parameter to the url
    if (sourceURL.includes('?')) {
      var sourceURL = sourceURL + "&autostart=true";
    } else {
      var sourceURL = sourceURL + "?autostart=true";
    }
  } catch {
    // when getting the direct source fails, use the regular sources
    var sourceURL = null;
  }


  // add the onclick function to play the movie
  playBtn.onclick = async function() {

    if (sourceURL == null) {
      var serverNum = getDefaultServer();
      var sourceURL = selectServer(serverNum, mediaType, tmdbID, seasonNum, episodeNum);
      infoPage.dataset.season = seasonNum;
      infoPage.dataset.episode = episodeNum;
      toggleEpisodesButtons(mediaType, seasonNum, episodeNum);
    }
    // play the movie by loading the sourceURL into the iframe
    playMovie(sourceURL);

    if (getSetting('saveWatchHistory')) {

      await getPlaybackPosition(tmdbID, mediaType);
      if (mediaType == 'tv') {
        if (seasonNum && episodeNum) {
          var position = "s" + seasonNum + "e" + episodeNum;
        } else {
          var position = "s0e0";
        }

      } else if (mediaType == 'movie') {
        var position = seasonNum || 0;
      }


      addToHistory(tmdbID, mediaType, position, true);
    }

  };

  if (mediaType == 'tv' && seasonNum && episodeNum) {
    playBtn.querySelector('div').innerText = "Play S" + seasonNum + " E" + episodeNum;
    infoPage.dataset.season = seasonNum;
    infoPage.dataset.episode = episodeNum;
  } else {
    playBtn.querySelector('div').innerText = "Play";
    infoPage.removeAttribute('data-season');
    infoPage.removeAttribute('data-episode');
  }
}

async function getVidsrcId(tmdbID) {
  // get the VidSrc id from vidsrc.to

  var url = "https://vidsrc.to/embed/movie/" + tmdbID;
  var html = (await (await fetch(url)).text());
  var doc = new DOMParser().parseFromString(html, 'text/html');
  var allATags = doc.querySelectorAll('a');
  var specificATags = Array.from(allATags).filter(a => a.href === "javascript:;");
  var vidsrcID = specificATags[0].dataset["id"];

  return vidsrcID;
}

async function getSources(vidsrcId) {
  // get the id of the first source that viscrc.to uses

  const response = await (await fetch('https://vidsrc.to/ajax/embed/episode/' + vidsrcId + '/sources')).json();
  const data = response.result;

  return data.reduce((acc, video) => {
    acc[video.title] = video.id;
    return acc;
  }, {});
}

async function getSourceUrl(sourceId) {
  // get the original source url by decrypting the result of this fetch

  const response = await fetch('https://vidsrc.to/ajax/embed/source/' + sourceId);
  const data = await response.json();
  const encryptedSourceUrl = data.result.url;

  return decryptSourceUrl(encryptedSourceUrl);
}

function decryptSourceUrl(sourceUrl) {
  // decrypt the encrypted source url

  const encoded = decodeBase64UrlSafe(sourceUrl);
  const decoded = adecode(encoded);

  const decodedText = new TextDecoder('utf-8').decode(decoded);
  return decodeURIComponent(decodedText);
}

function decodeBase64UrlSafe(str) {
  // change _ into / and - into + to standardize the base64
  var standardizedInput = str.replace(/_/g, '/').replace(/-/g, '+');

  // Decode the base64 URL-safe string
  var binaryData = atob(standardizedInput);

  var buffer = stringToBuffer(binaryData);
  return buffer;
}

function stringToBuffer(str) {
  // Create an ArrayBuffer with a size equal to the length of the string
  let buffer = new ArrayBuffer(str.length);

  // Create a Uint8Array view for the buffer
  let uint8View = new Uint8Array(buffer);

  // Set each byte in the buffer to the character code of the corresponding character in the string
  for (let i = 0; i < str.length; i++) {
    uint8View[i] = str.charCodeAt(i);
  }

  return uint8View;
}

function adecode(buffer) {
  // decode the buffer

  const keyBytes = stringToBuffer('WXrUARXb1aDLaZjI');
  let j = 0;
  const s = new Uint8Array(256).map((_, i) => i);

  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + keyBytes[i % keyBytes.length]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
  }

  const decoded = new Uint8Array(buffer.length);
  let i = 0;
  let k = 0;

  for (let index = 0; index < buffer.length; index++) {
    i = (i + 1) & 0xff;
    k = (k + s[i]) & 0xff;
    [s[i], s[k]] = [s[k], s[i]];
    const t = (s[i] + s[k]) & 0xff;
    decoded[index] = buffer[index] ^ s[t];
  }

  return decoded;
}

function logBuffer(buffer) {
  // a function for debugging
  // Log the entire buffer as a hexadecimal string
  let hexString = Array.from(buffer).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
  console.log(`<Buffer ${hexString}>`);
}



// functions that deal with playing the media from vidsrc
function playMovie(sourceURL) {
  // plays the movie or tv show in the iframe with the given source url

  // stop the trailer and show the poster again, also clear the timeout for the trailer
  clearTimeout(trailerPlayerTimeout);
  try {
    trailerPlayer.stopVideo();
  } catch (e) {
    console.error(e);
  }
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'none';

  // set the iframe source to the source url
  var iframe = document.getElementById('movieIframe');
  iframe.src = sourceURL;

  // display the iframe's parent element
  iframe.parentNode.classList.remove('hidden');

  // set the title of the page to the media that is playing
  var documentTitle = document.querySelector("head > title");
  var mediaTitle = document.querySelector("#infoSplit1 > h1").innerText;
  if (sourceURL.includes('season')) {
    var urlObj = new URL(sourceURL); // Create a URL object
    var urlParams = new URLSearchParams(urlObj.search);
    var seasonNum = urlParams.get('season');
    var episodeNum = urlParams.get('episode');
    var mediaTitle = mediaTitle + " - S" + seasonNum + " E" + episodeNum;
  }
  documentTitle.innerText = mediaTitle;
}

function stopMovie() {
  // stops playing the movie or tv show in the iframe

  // set the title of the site back to normal
  document.querySelector("head > title").innerText = "Mflix";

  // stop the media by setting the iframe source to nothing
  var iframe = document.getElementById('movieIframe');
  iframe.src = "";
  iframe.parentNode.classList.add('hidden');

  // reset the trailer player button
  var playTrailerBtn = document.getElementById('stopTrailer');
  var trailerID = playTrailerBtn.getAttribute("data-id");
  playTrailerBtn.onclick = function() {
    startTrailer(trailerID);
  }
}

function resumeMedia() {
  alert('Resume function coming soon');
}

function toggleServerSelection() {
  // function to toggle the visibility of the server selection tab

  var container = document.getElementById('serverSelection');
  var children = container.children;

  // start at index 1 to skip over the first element
  for (var i = 1; i < children.length; i++) {
    var child = children[i];
    child.classList.toggle('hidden');
  }

  // make an event listener for when the user clicks off of the dropdown
  var clickFunction = function(e) {

    // if the user clicks on the 'Try a different server' button, toggle the serverSelection
    if (e.srcElement != children[0]) {
      toggleServerSelection();
    }

    //remove the event listener if the user clicks the try a different server button
    document.removeEventListener('click', clickFunction);

  }

  // add or remove the background color
  if (container.style.backgroundColor == '') {
    // add the background color and border
    container.style.backgroundColor = 'var(--mflixGrey)';
    container.style.border = '1px solid var(--mflixWhite)';
    // add the event listener after a delay
    setTimeout(function() {
      document.addEventListener('click', clickFunction);
    }, 0);
  } else {
    // remove the background color and border
    container.style.backgroundColor = '';
    container.style.border = '';
  }

}

function selectServer(index, mediaType, id, season, episode) {
  // function to select which server the iframe should use

  selectedServer = index;

  var list = [{
      movie: "https://vidsrc.me/embed/movie?tmdb=<id>",
      tv: "https://vidsrc.me/embed/tv?tmdb=<id>&season=<s>&episode=<e>"
    },
    {
      movie: "https://vidsrc.to/embed/movie/<id>",
      tv: "https://vidsrc.to/embed/tv/<id>/<s>/<e>"
    },
    {
      movie: "https://vidsrc.cc/v2/embed/movie/<id>",
      tv: "https://vidsrc.cc/v2/embed/tv/<id>/<s>/<e>"
    },
    {
      movie: "https://vidsrc.icu/embed/movie/<id>",
      tv: "https://vidsrc.icu/embed/tv/<id>/<s>/<e>"
    }
  ];

  var container = document.getElementById('serverSelection');
  var children = container.children;

  // remove the active class from the active server
  container.querySelector('.active').classList.remove('active');

  // add the active class to the new server
  children[index].classList.add('active');

  // if the user clicked on the 'Try a different server' button
  if (!mediaType && !id) {
    // get the id, media type, and season and episode numbers
    var infoPage = document.getElementById('infoPage');
    var id = infoPage.dataset.id;
    var mediaType = infoPage.dataset.mediaType;
    var seasonNum = infoPage.dataset.season;
    var episodeNum = infoPage.dataset.episode;
    var skipSetUrl = false;
  } else {
    var seasonNum = season;
    var episodeNum = episode;
    var skipSetUrl = true;
  }

  // get the correct url from the list of dicts by getting the dict at the zero based index
  var dict = list[index - 1];
  var url = dict[mediaType];

  // if the season and episode numbers are undefined, use the server without specifing them
  if (!seasonNum || !episodeNum) {
    var url = url.split('<id>')[0] + id;
  } else {
    var url = url.replace('<id>', id).replace('<s>', seasonNum).replace('<e>', episodeNum);
  }

  if (skipSetUrl) {
    // just return the url
    return url;

  } else {
    // set the url of the iframe to the new url
    var iframe = document.getElementById('movieIframe');
    iframe.src = url;
  }

}

async function watchPreviousEpisode() {
  // function to select the previous episode over the iframe

  var infoPage = document.getElementById('infoPage');
  var mediaType = infoPage.dataset.mediaType;
  var tmdbID = infoPage.dataset.id;

  var currentSeasonNum = Number(infoPage.dataset.season);
  var currentEpisodeNum = Number(infoPage.dataset.episode);

  if (currentEpisodeNum - 1 <= 0) {
    // go to the next season
    if (currentSeasonNum - 1 <= 0) {
      alertMessage("No previous episodes avalible.");
      return;
    } else {
      var seasonNum = currentSeasonNum - 1;
      var episodeNum = Number(infoPage.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)").children[seasonNum].dataset.numEpisodes);
    }
  } else {
    var seasonNum = currentSeasonNum;
    var episodeNum = currentEpisodeNum - 1;
  }

  var serverNum = getDefaultServer();
  var sourceURL = selectServer(serverNum, mediaType, tmdbID, seasonNum, episodeNum);
  infoPage.dataset.season = seasonNum;
  infoPage.dataset.episode = episodeNum;
  toggleEpisodesButtons(mediaType, seasonNum, episodeNum);

  // play the movie by loading the sourceURL into the iframe
  playMovie(sourceURL);

  if (getSetting('saveWatchHistory')) {

    await getPlaybackPosition(tmdbID, mediaType);
    if (mediaType == 'tv') {
      if (seasonNum && episodeNum) {
        var position = "s" + seasonNum + "e" + episodeNum;
      } else {
        var position = "s0e0";
      }

    } else if (mediaType == 'movie') {
      var position = seasonNum || 0;
    }


    addToHistory(tmdbID, mediaType, position, true);
  }

  // make the play button show the correct season and episode
  var seasonsContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)");
  var episodesContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(2)");
  seasonsContainer.children[seasonNum - 1].click();
  episodesContainer.children[episodeNum - 1].click();

}

async function watchNextEpisode() {
  // function to select the next episode over the iframe

  var infoPage = document.getElementById('infoPage');
  var mediaType = infoPage.dataset.mediaType;
  var tmdbID = infoPage.dataset.id;

  var currentSeasonNum = Number(infoPage.dataset.season);
  var currentEpisodeNum = Number(infoPage.dataset.episode);
  var numOfSeasons = infoPage.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)").children.length;
  var episodesInSeason = Number(infoPage.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)").children[currentSeasonNum - 1].dataset.numEpisodes);

  if (currentEpisodeNum + 1 > episodesInSeason) {
    // go to the next season
    if (currentSeasonNum + 1 > numOfSeasons) {
      alertMessage("No more episodes avalible.");
      return;
    } else {
      var seasonNum = currentSeasonNum + 1;
      var episodeNum = 1;
    }
  } else {
    var seasonNum = currentSeasonNum;
    var episodeNum = currentEpisodeNum + 1;
  }

  var serverNum = getDefaultServer();
  var sourceURL = selectServer(serverNum, mediaType, tmdbID, seasonNum, episodeNum);
  infoPage.dataset.season = seasonNum;
  infoPage.dataset.episode = episodeNum;
  toggleEpisodesButtons(mediaType, seasonNum, episodeNum);

  // play the movie by loading the sourceURL into the iframe
  playMovie(sourceURL);

  if (getSetting('saveWatchHistory')) {

    await getPlaybackPosition(tmdbID, mediaType);
    if (mediaType == 'tv') {
      if (seasonNum && episodeNum) {
        var position = "s" + seasonNum + "e" + episodeNum;
      } else {
        var position = "s0e0";
      }

    } else if (mediaType == 'movie') {
      var position = seasonNum || 0;
    }


    addToHistory(tmdbID, mediaType, position, true);
  }

  // make the play button show the correct season and episode
  var seasonsContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)");
  var episodesContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(2)");
  seasonsContainer.children[seasonNum - 1].click();
  episodesContainer.children[episodeNum - 1].click();

}

function toggleEpisodesButtons(mediaType, seasonNum, episodeNum) {
  // function to show it hide the previous and next episode buttons over the iframe

  var prevBtn = document.getElementById('previousEpisodeBtn');
  var nextBtn = document.getElementById('nextEpisodeBtn');

  if (mediaType == 'movie' || (mediaType == 'tv' && (!seasonNum || !episodeNum))) {
    prevBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
    return;
  }

  // the mediaType must be tv, so show the buttons and figure out if the episodes are out if range
  prevBtn.classList.remove('hidden');
  nextBtn.classList.remove('hidden');

  var seasonsContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)");
  var numSeasons = seasonsContainer.children.length;
  var lastSeasonElm = seasonsContainer.children[numSeasons - 1];
  var lastEpisode = lastSeasonElm.dataset.numEpisodes;

  // if the current episode is the last avalible episode
  if (seasonNum == numSeasons && episodeNum == lastEpisode) {
    // make the next episode button unavalible
    nextBtn.classList.add('disabled');

  } else {
    nextBtn.classList.remove('disabled');
  }

  // if the current episode is the very first episode
  if (seasonNum == 1 && episodeNum == 1) {
    // make the next episode button unavalible
    prevBtn.classList.add('disabled');

  } else {
    prevBtn.classList.remove('disabled');
  }


}

function getDefaultServer() {
  // function to get either the selected server or the default server

  // if the selected server isn't defined, use the default server
  if (selectedServer == null) {
    return getSetting('defaultServer');
  }

  return selectedServer;
}



// functions for searching for movies and tv shows
async function searchMoviesAndTvShows(query) {
  // search for both movies and tv shows using the tmdb api, then return the results

  var url = 'https://api.themoviedb.org/3/search/multi?api_key=' + apiKey + '&query=' + encodeURIComponent(query);

  try {
    var response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    var data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data from TMDb:', error);
    return null; // Ensure the function returns null in case of an error
  }
}

function displaySearchDropdown(dict) {
  // displays the results in the dropdown below the search input

  const dropdown = document.getElementById('searchDropdown');
  dropdown.innerHTML = ''; // Clear previous results
  dropdown.style.display = 'block';

  // make the search bar appear above the search results
  var searchBar = document.getElementById('searchInput');
  searchBar.style.zIndex = 2;

  const results = dict['results'];

  results.forEach(result => {
    if (result['media_type'] == 'person') {
      return; // skip the person
    }

    const item = document.createElement('div');
    item.classList.add('searchDropdownItem');
    item.classList.add('button');
    const title = result.title || result.name; // Movies use 'title', TV shows use 'name'
    item.textContent = title;
    item.addEventListener('click', () => {
      document.getElementById('searchInput').value = title;
      hideSearchDropdown();
      searchMoviesAndTvShows(title).then(dict => {
          displaySearchResults(dict);
        })
        .catch(error => {
          console.error("Error fetching movies and TV shows:", error);
        });
    });
    dropdown.appendChild(item);
  });
}

function hideSearchDropdown() {
  // hides the dropdown below the search bar

  var dropdown = document.getElementById('searchDropdown');
  dropdown.innerHTML = '';
  dropdown.style.display = 'none';
  // change the search bar z index back to normal
  var searchBar = document.getElementById('searchInput');
  searchBar.style.zIndex = 0;
}

function displaySearchResults(dict) {
  // displays the movies and tv shows that matched the search query by creating posters for them

  const results = dict['results'];
  const container = document.getElementById('searchPage').querySelector('.container');
  container.innerHTML = ''; // Clear previous content

  if (results.length <= 0) {
    container.innerText = "No Avalible Results";
  }

  results.forEach(item => {
    if (item['media_type'] == 'person') {
      return; // skip the person
    }

    var title = item.title || item.name;
    if (item.media_type == 'tv') {
      var qualityDiv = "TV";
    } else {
      var qualityDiv = "Movie";
    }

    var poster = makePosterDiv(item.id, title, qualityDiv, item.poster_path, item.media_type);
    container.appendChild(poster);
  });

  // append some invisible posters
  appendInvisiblePosters(container);

  // update the page hash
  var query = document.getElementById('searchInput').value;
  var encodedQuery = encodeURIComponent(query)
  window.location.hash = 'search-' + encodedQuery;
}



// functions that deal with the user's watch lists
function getWatchLists() {
  // gets the user's lists from the server and displays them

  // stop the function if the watch lists are already loaded
  var loadingList = document.getElementById('loadingLists');
  if (!loadingList) {
    return false;
  }

  // if the container content is loading, don't do anything
  var container = document.querySelector('#myListsPage').getElementsByClassName('container')[0];
  if (container.dataset.loading == "true") {
    return;
  }
  container.dataset.loading = "true";

  var url = appsScriptBaseUrl + "?exec=getLists&username=" + encodeURIComponent(getLocalStorage('username')) + "&password=" + encodeURIComponent(getLocalStorage('password'));

  fetch(url)
    .then((response) => {
      return response.json();
    })
    .then((response) => {

      var userLists = response['userLists'];
      if (!userLists) {
        alertMessage(response['error']);
        return;
      }

      // populate the add to list dropdown right away
      populateAddToListDropdown(userLists);

      // make new lists to append to the container
      for (var i = 0; i < userLists.length; i++) {
        var mainDict = userLists[i];
        var name = mainDict['name'];
        var mediaList = mainDict['media'];
        appendExistingList(name, mediaList);
      }

      // after all the lists are done loading, remove the loading list and show the list edit container
      loadingList.parentNode.remove();
      var listsPage = document.querySelector("#myListsPage").getElementsByClassName('container')[0];
      if (!listsPage.classList.contains('hidden')) {
        document.getElementById('listEditContainer').classList.remove('hidden');
      }
      container.dataset.loading = "false";

    })
    .catch(error => {

      alertMessage(error);
      console.error(error);
    });

}

function showList(list) {
  // show either the watch lists tab or the history tab

  if (list == "history") {
    // update the page hash
    window.location.hash = 'page-history';

    if (getSetting('saveWatchHistory')) {
      var activeButton = document.querySelector("#myListsPage > div:nth-of-type(1) > div:nth-of-type(1)");
      var inactiveButton = document.querySelector("#myListsPage > div:nth-of-type(1) > div:nth-of-type(2)")
      var activePage = document.querySelector("#myListsPage").getElementsByClassName('container')[0];
      var inactivePage = document.querySelector("#myListsPage").getElementsByClassName('container')[1];
      if (inactivePage.dataset.loading == "false") {
        document.getElementById('historyEditContainer').classList.remove('hidden');
      }
      document.getElementById('listEditContainer').classList.add('hidden');
      getHistory();
    } else {
      alertMessage('History is disabled in settings');
    }

  } else {
    // update the page hash
    window.location.hash = 'page-myListsPage';

    var activeButton = document.querySelector("#myListsPage > div:nth-of-type(1) > div:nth-of-type(2)");
    var inactiveButton = document.querySelector("#myListsPage > div:nth-of-type(1) > div:nth-of-type(1)")
    var activePage = document.querySelector("#myListsPage").getElementsByClassName('container')[1];
    var inactivePage = document.querySelector("#myListsPage").getElementsByClassName('container')[0];
    if (inactivePage.dataset.loading == "false") {
      document.getElementById('listEditContainer').classList.remove('hidden');
    }
    document.getElementById('historyEditContainer').classList.add('hidden');
  }

  activeButton.classList.remove('active');
  inactiveButton.classList.add('active');
  activePage.classList.add('hidden');
  inactivePage.classList.remove('hidden');
}

function appendExistingList(name, mediaList) {
  // takes the dict as input and creates a new list on the watch list page

  // generate a new list
  var newList = document.createElement('div');
  newList.classList.add('listContainer');
  newList.innerHTML = '<h4><div><div>' + name + '</div><input type="text" placeholder="New List Name" value="' + name + '"><div class="button"><img src="icons/general/delete.svg" alt="delete"></div></div><div><div class="button"><img src="icons/general/arrow_up.svg" alt="up"></div><div class="button"><img src="icons/general/arrow_down.svg" alt="down"></div></div></h4><div class="horizontalScroll"><div>Add Movies or TV Shows to this list...</div></div>';

  // add an onclick event to the delete button
  newList.querySelector('div:nth-of-type(1) > div:nth-of-type(2)').onclick = function() {
    //newList.remove();
    animateRemoval(newList, 'v');
  };

  // add an onclick event to move the list up amongst its siblings
  newList.querySelector('div:nth-of-type(2) > div:nth-of-type(1)').onclick = function() {
    //moveElement(newList, 1);
    animateMoveElement(newList, 1, 'v');
  }

  // add an onclick event to move the list down amongst its siblings
  newList.querySelector('div:nth-of-type(2) > div:nth-of-type(2)').onclick = function() {
    //moveElement(newList, -1);
    animateMoveElement(newList, -1, 'v');
  }

  // Creating an array of fetch promises for each movie ID
  const movieDetailsPromises = mediaList.map(dict =>
    fetch('https://api.themoviedb.org/3/' + Object.values(dict)[0] + '/' + Object.keys(dict)[0] + '?api_key=' + apiKey)
    .then(response => response.json())
    // Object.values(dict)[0] is the media type for the given item
    // Object.keys(dict)[0] is the id fot the given item
  );

  // Handling the resolved promises
  Promise.all(movieDetailsPromises)
    .then(movies => {

      var container = newList.querySelector('.horizontalScroll');

      // loop through each modia to create a poster
      for (let i = 0; i < movies.length; i++) {
        let movie = movies[i];

        var id = Object.keys(mediaList[i])[0]; // this gets the key from the dict at index i in the mediaList
        var title = movie.title || movie.name;
        var mediaType = mediaList[i][id]; // this gets the value from the dict at index 1 in the mediaList
        if (mediaType == 'tv') {
          var qualityDiv = "TV";
        } else {
          var qualityDiv = "Movie";
        }
        var imgURL = movie.poster_path;

        // make the poster with the info, plus add an overlay that will move the media in the list
        let poster = makePosterDiv(id, title, qualityDiv, imgURL, mediaType);
        let buttonsOverlay = document.createElement('div');
        buttonsOverlay.classList.add('posterListButtons');
        buttonsOverlay.innerHTML = '<div class="button"><img src="icons/general/close.svg" alt="close"></div><div class="button"><img src="icons/general/arrow_back.svg" alt="left"></div><div class="button"><img src="icons/general/arrow_forward.svg" alt="right"></div>';
        buttonsOverlay.querySelector('div:nth-of-type(1)').onclick = function() {
          if (poster.parentNode.children.length == 1) {
            poster.parentNode.innerHTML = '<div>Add Movies or TV Shows to this list...</div>';
          } else {
            //poster.remove();
            animateRemoval(poster, 'h');
          }
          event.stopPropagation();
        }
        buttonsOverlay.querySelector('div:nth-of-type(2)').onclick = function() {
          //moveElement(poster, 1);
          animateMoveElement(poster, 1, 'h');
          event.stopPropagation();
        }
        buttonsOverlay.querySelector('div:nth-of-type(3)').onclick = function() {
          //moveElement(poster, -1);
          animateMoveElement(poster, -1, 'h');
          event.stopPropagation();
        }
        buttonsOverlay.onclick = function() {
          event.stopPropagation();
        }
        poster.appendChild(buttonsOverlay);

        // clear the previous element in the list, which is the placeholder text element
        if (i == 0) {
          container.innerHTML = '';
        }

        container.appendChild(poster);
      }

    })
    .catch(error => console.error('Error fetching movie details:', error));

  // append the list to the container
  var container = document.querySelector("#myListsPage").getElementsByClassName('container')[0];
  container.appendChild(newList);

  // return the element
  return newList;

}

function createNewList() {
  // opens a popup that asks the user to enter the list name

  // if the container content is loading, don't do anything
  var container = document.querySelector('#myListsPage').getElementsByClassName('container')[0];
  if (container.dataset.loading == "true") {
    return;
  }

  // generate a new list
  var newList = appendExistingList("New List", []);
  newList.querySelector('input').value = "";
  newList.classList.add('editList');

  // scroll to the bottom of the page
  var page = document.getElementById('myListsPage');
  page.scrollTop = page.scrollHeight;

  // focus on the input tag
  newList.querySelector('input').focus();

  // change the edit list button to the save lists button
  var editBtn = document.getElementById('listEditContainer').children[1];
  var saveBtn = document.getElementById('listEditContainer').children[2];
  editBtn.classList.add('hidden');
  saveBtn.classList.remove('hidden');

  // observe for when the myListsPage is hidden, then save the unsaved lists
  var targetElement = document.querySelectorAll('#myListsPage > .container')[0];
  observeForHidden(targetElement, function() {
    var unsavedList = targetElement.querySelectorAll('.editList');
    if (unsavedList.length > 0) {
      saveLists();
    }
  });
}

function editLists() {
  // changes the page to the edit list layout

  // change the edit list button to the save lists button
  var editBtn = document.getElementById('listEditContainer').children[1];
  var saveBtn = document.getElementById('listEditContainer').children[2];
  editBtn.classList.add('hidden');
  saveBtn.classList.remove('hidden');

  var lists = document.querySelector('#myListsPage').getElementsByClassName('container')[0].querySelectorAll('.listContainer:not(.hidden)');

  // loop through the elements
  for (var i = 0; i < lists.length; i++) {
    var list = lists[i];
    list.classList.add('editList');
    var title = list.querySelector('h4 > div:nth-of-type(1) > div:nth-of-type(1)').innerText;
    list.querySelector('input').value = title;
  }

  // observe for when the myListsPage is hidden, then save the unsaved lists
  var targetElement = document.querySelectorAll('#myListsPage > .container')[0];
  observeForHidden(targetElement, function() {
    var unsavedList = targetElement.querySelectorAll('.editList');
    if (unsavedList.length > 0) {
      saveLists();
    }
  });
}

function saveLists(saveImmediately = false) {
  // saves all of the lists and sends their data back to the server

  // if the container content is loading, don't do anything
  var container = document.querySelector('#myListsPage').getElementsByClassName('container')[0];
  if (container.dataset.loading == "true" && saveImmediately == false) {
    return;
  }

  // set the dataset to loading true
  container.dataset.loading = "true";
  var saveBtn = document.getElementById('listEditContainer').children[2];
  saveBtn.querySelector('img').src = "icons/general/loading_wheel.gif";

  var lists = container.querySelectorAll('.listContainer:not(.hidden)');
  var masterList = [];

  // loop through the elements to make a list of dicts to send to the server
  for (var i = 0; i < lists.length; i++) {
    var list = lists[i];

    // if the list is hidden, skip it
    if (list.classList.contains('hidden')) {
      continue;
    }

    var input = list.querySelector('input').value.trim();
    var title = input || 'New List';
    list.querySelector('h4 > div:nth-of-type(1) > div:nth-of-type(1)').innerText = title;
    list.classList.remove('editList');

    // get all of the ids of the media in the list
    var children = list.querySelectorAll('.posterContainer');
    var childrenIds = [];
    for (var j = 0; j < children.length; j++) {
      var id = children[j].dataset.id;
      var mediaType = children[j].dataset.mediaType;
      var tempDict = {};
      tempDict[id] = mediaType;
      childrenIds[j] = tempDict;
    }

    // add the dict to the list
    var dict = {
      name: title,
      media: childrenIds
    };

    masterList.push(dict);
  }

  // contact the google apps script to update the lists
  var masterListString = JSON.stringify(masterList);
  var url = appsScriptBaseUrl + "?exec=updateLists&username=" + encodeURIComponent(getLocalStorage('username')) + "&password=" + encodeURIComponent(getLocalStorage('password')) + "&newList=" + encodeURIComponent(masterListString);

  fetch(url)
    .then((response) => {
      return response.json();
    })
    .then((response) => {

      var success = response['success'];
      if (!success) {
        alertMessage(response['error']);
      }

      // change the buttons back to create list and edit lists
      var editBtn = document.getElementById('listEditContainer').children[1];
      var saveBtn = document.getElementById('listEditContainer').children[2];
      editBtn.classList.remove('hidden');
      saveBtn.classList.add('hidden');
      saveBtn.querySelector('img').src = "icons/general/save.svg";

      container.dataset.loading = "false";

    })
    .catch(error => {

      // change the buttons back to create list and edit lists
      var editBtn = document.getElementById('listEditContainer').children[1];
      var saveBtn = document.getElementById('listEditContainer').children[2];
      editBtn.classList.remove('hidden');
      saveBtn.classList.add('hidden');
      saveBtn.querySelector('img').src = "icons/general/save.svg";

      container.dataset.loading = "false";

      alertMessage(error);
    });
}

function dropdownAddToListMenu() {
  // this function makes the dropdown menu appear for the add to list button on the info page

  var dropdownMenu = document.getElementById('addToListDropdown');
  var container = document.querySelector("#addToListDropdown > div > div");

  // don't do anything if the dropdownMenu is already showing
  if (!dropdownMenu.classList.contains('hidden')) {
    return;
  }
  dropdownMenu.classList.remove('hidden');

  var alreadyPopulated = getWatchLists();

  if (alreadyPopulated != undefined && alreadyPopulated == false) {
    populateAddToListDropdown();
  }

  var resetCreateBtn = function() {
    // hide the create button and clear the input
    var mainElm = container.children[container.children.length - 2];
    var input = mainElm.querySelector('input');
    mainElm.classList.add('hidden');
    input.value = "";
    input.blur();
  }

  var scrollFunction = function() {
    // Check if the scroll position is at the top
    if (container.scrollTop === 0) {
      // If at the top, prevent further scrolling up
      container.scrollTop = 1; // Set it to 1 to prevent further scrolling
    } else if (container.scrollHeight - container.scrollTop === container.clientHeight) {
      // If at the bottom, prevent further scrolling down
      container.scrollTop = container.scrollHeight - container.clientHeight - 1;
    }
  };

  // add a click event listener for mobile users so that the menu will disappear
  var clickFunction = function(e) {
    // don't do anything if the user clicks inside of the dropdown menu
    if (dropdownMenu.contains(e.srcElement)) {
      return;
    }
    // if the user clicks outside the dropdown, hide it and remove the listener
    dropdownMenu.classList.add('hidden');
    document.body.removeEventListener('click', clickFunction);
    dropdownMenu.removeEventListener('mouseleave', mouseLeaveFunction);
    container.removeEventListener('scroll', scrollFunction);

    // hide the create button and clear the input
    resetCreateBtn();
  }

  var mouseLeaveFunction = function() {
    // hide the dropdown
    dropdownMenu.classList.add('hidden');
    dropdownMenu.removeEventListener('mouseleave', mouseLeaveFunction);
    document.body.removeEventListener('click', clickFunction);
    container.removeEventListener('scroll', scrollFunction);

    // hide the create button and clear the input
    resetCreateBtn();
  }

  // add the click event listener with a set timeout function, otherwise it will regester the current click as well
  setTimeout(function() {
    document.body.addEventListener('click', clickFunction);
    dropdownMenu.addEventListener('mouseleave', mouseLeaveFunction);
    container.addEventListener('scroll', scrollFunction);
    // set the scroll position to 1 to make scrolling smooth
    container.scrollTop = 1;
  }, 0000);

}

function populateAddToListDropdown(lists) {
  // creates the buttons inside of the add to list dropdown

  // if lists is not defined, get the lists from the myListsPage
  if (!lists) {
    var lists = document.querySelector('#myListsPage').getElementsByClassName('container')[0].querySelectorAll('.listContainer:not(.hidden)');
    var masterList = [];

    // loop through the elements to make a list of dicts
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];

      // if the list is hidden, skip it
      if (list.classList.contains('hidden')) {
        continue;
      }

      var input = list.querySelector('input').value.trim();
      var title = input || 'New List';
      list.querySelector('h4 > div:nth-of-type(1) > div:nth-of-type(1)').innerText = title;
      list.classList.remove('editList');

      // get all of the ids of the media in the list
      var children = list.querySelectorAll('.posterContainer');
      var childrenIds = [];
      for (var j = 0; j < children.length; j++) {
        var id = children[j].dataset.id;
        var mediaType = children[j].dataset.mediaType;
        var tempDict = {};
        tempDict[id] = mediaType;
        childrenIds[j] = tempDict;
      }

      // add the dict to the list
      var dict = {
        name: title,
        media: childrenIds
      };

      masterList.push(dict);
    }

    var lists = masterList;

  }

  // remove the previous elements
  var container = document.querySelector('#addToListDropdown > div > div');
  while (container.children.length > 2) {
    container.removeChild(container.firstElementChild);
  }

  // now create the list elements to populate the dropdown
  for (let i = 0; i < lists.length; i++) {
    var main = document.createElement('div');
    main.classList.add('button');
    var img = document.createElement('img');
    main.appendChild(img);
    var title = document.createElement('div');
    title.innerText = lists[i].name;
    main.appendChild(title);

    // find out if the movie or tv show is already in the list
    var id = document.getElementById('infoPage').dataset.id;
    var mediaType = document.getElementById('infoPage').dataset.mediaType;
    var list = lists[i].media;
    var dict = {};
    dict[id] = mediaType;
    var exists = list.some(item =>
      JSON.stringify(item) === JSON.stringify(dict)
    );
    if (exists) {
      img.src = "icons/general/playlist_remove.svg";
      main.onclick = function() {
        removeFromList(id, mediaType, i);
      }
      main.classList.add('onList');

    } else {
      img.src = "icons/general/playlist_add.svg";
      main.onclick = function() {
        addToList(id, mediaType, i);
      }

    }

    var secondToLastChild = container.children[container.children.length - 2];
    container.insertBefore(main, secondToLastChild);
  }

  // show the add to list button
  container.children[container.children.length - 1].classList.remove('hidden');

}

function addToList(id, mediaType, listIndex) {
  // adds the media to the specified list index

  var lists = document.querySelector('#myListsPage').getElementsByClassName('container')[0].querySelectorAll('.listContainer:not(.hidden)');
  var list = lists[listIndex];

  var container = list.querySelector('.horizontalScroll');

  // get the media details from the api
  var url = "https://api.themoviedb.org/3/" + mediaType + "/" + id + "?api_key=" + apiKey;

  fetch(url)
    .then(response => response.json()
      .then(data => {

        var title = data.title || data.name;
        var imgURL = data.poster_path;
        if (mediaType == "tv") {
          var qualityDiv = "TV";
        } else {
          var qualityDiv = "Movie";
        }

        var poster = makePosterDiv(id, title, qualityDiv, imgURL, mediaType);

        // check to see if the container has the placeholder text because it is empty
        var firstChild = container.children[0];
        if (!firstChild.classList.contains('posterContainer')) {
          // remove the 'empty list' text element
          firstChild.remove();
        }

        container.appendChild(poster);

        // repopulate the dropdown after a timeout, so the dropdown listener doesn't get confused
        setTimeout(function() {
          populateAddToListDropdown();
        }, 0);

        // save the lists immediately
        saveLists(true);

      }));

}

function removeFromList(id, mediaType, listIndex) {
  // removes the media from the specified list index

  var lists = document.querySelector('#myListsPage').getElementsByClassName('container')[0].querySelectorAll('.listContainer:not(.hidden)');
  var list = lists[listIndex];

  var container = list.querySelector('.horizontalScroll');

  var poster = container.querySelector('[data-id="' + id + '"][data-media-type="' + mediaType + '"]');
  poster.remove();

  // after removing the poster, if there are no elements in the list, add the 'empty list' element to it
  if (container.children.length == 0) {
    var newDiv = document.createElement('div');
    newDiv.innerText = "Add Movies or TV Shows to this list...";
    container.appendChild(newDiv);
  }

  // repopulate the dropdown after a timeout, so the dropdown listener doesn't get confused
  setTimeout(function() {
    populateAddToListDropdown();
  }, 0);

  // save the lists immediately
  saveLists(true);

}

function createNewListOnInfoPage() {
  // display the list maker on the dropdown

  var container = document.querySelector("#addToListDropdown > div > div");
  var mainElm = container.children[container.children.length - 2];

  mainElm.classList.remove('hidden');

  // scroll to the bottom of the container minus a pixel
  container.scrollTop = container.scrollHeight - container.clientHeight - 1;

  // focus on the input
  var input = mainElm.querySelector('input');
  input.focus();

}

function removeCreateButtonOnDropdown(decision) {
  // removes the create button on the dropdwn and either creates a new list or deletes the draft

  var container = document.querySelector("#addToListDropdown > div > div");
  var mainElm = container.children[container.children.length - 2];
  var input = mainElm.querySelector('input');
  var title = input.value.trim();
  if (title == "") {
    var title = "New List";
  }

  if (decision == "save") {
    // save the new list
    appendExistingList(title, []);
    saveLists(true);
  }

  // hide the create button, clear the input, and repopulate the dropdown
  mainElm.classList.add('hidden');
  input.value = "";
  input.blur();
  populateAddToListDropdown();

  setTimeout(function() {
    // scroll to the bottom of the container minus a pixel after a millisecond
    container.scrollTop = container.scrollHeight - container.clientHeight - 1;
  }, 1);

}



// functions that deal with the user's watch history and tv episodes
async function getHistory() {
  // gets the user's history and appends it to the history page

  // if the container is still loading or has already loaded, do nothing
  var container = document.getElementById('myListsPage').getElementsByClassName('container')[1];
  var loadingPoster = container.querySelector('.loadingWave');
  if (container.dataset.loading == "true" || loadingPoster == null) {
    return;
  }
  container.dataset.loading = "true";

  var url = appsScriptBaseUrl + "?exec=getHistory&username=" + encodeURIComponent(getLocalStorage('username')) + "&password=" + encodeURIComponent(getLocalStorage('password'));

  try {
    const response = await fetch(url);
    const data = await response.json();


    var history = data['history'];
    if (!history) {
      alertMessage(data['error']);
      return;
    }

    var keys = Object.keys(history);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var list = history[key];
      var mediaType = key;
      if (mediaType == "tv") {
        var horizontalScroll = document.getElementById('tvShowsHistory');
        var loadingList = document.getElementById('loadingTvShowsHistory');
      } else {
        var horizontalScroll = document.getElementById('moviesHistory');
        var loadingList = document.getElementById('loadingMoviesHistory');
      }

      for (var j = 0; j < list.length; j++) {
        var dict = list[j];
        var id = Object.keys(dict)[0];
        var position = Object.values(dict)[0];

        await addToHistory(id, mediaType, position);
      }

      if (list.length == 0) {
        horizontalScroll.innerHTML = '<div>Watch media to see it in your history...</div>';
      }

      // after all the lists are done loading, remove the loading posters
      loadingList.parentNode.remove();
      horizontalScroll.parentNode.classList.remove('hidden');

      container.dataset.loading = "false";
      var historyPage = document.querySelector("#myListsPage").getElementsByClassName('container')[1];
      if (!historyPage.classList.contains('hidden')) {
        document.getElementById('historyEditContainer').classList.remove('hidden');
      }


    }

  } catch (e) {

    alertMessage(error);
    console.error(error);
  };
}

async function addToHistory(id, mediaType, position, save = false) {
  // takes the id and mediaType as input and adds it to the user's history

  if (mediaType == "tv") {
    var container = document.getElementById('tvShowsHistory');
  } else {
    var container = document.getElementById('moviesHistory');
  }

  // first check to see if the item is already in the history
  var poster = container.querySelector('[data-id="' + id + '"]');
  if (poster) {
    // it already exists, so move it to the begenning of the history
    moveElement(poster, 30);
    poster.dataset.position = position;
    if (save == true) {
      saveHistory();
    }
    return;
  }

  // fetch the info for the movie
  var url = 'https://api.themoviedb.org/3/' + mediaType + '/' + id + '?api_key=' + apiKey;

  try {
    const response = await fetch(url);
    const media = await response.json();


    var title = media.title || media.name;
    var imgURL = media.poster_path;

    // make the poster with the info, plus add an overlay that will move the media in the list
    var poster = makePosterDiv(id, title, "", imgURL, mediaType);
    poster.dataset.position = position;
    let buttonsOverlay = document.createElement('div');
    buttonsOverlay.classList.add('posterListButtons');
    buttonsOverlay.innerHTML = '<div class="button"><img src="icons/general/close.svg" alt="close"></div>';
    buttonsOverlay.querySelector('div:nth-of-type(1)').onclick = function() {
      if (poster.parentNode.children.length == 1) {
        poster.parentNode.innerHTML = '<div>Watch media to see it in your history...</div>';
      } else {
        //poster.remove();
        animateRemoval(poster, 'h');
      }
      event.stopPropagation();
    }
    buttonsOverlay.onclick = function() {
      event.stopPropagation();
    }
    poster.appendChild(buttonsOverlay);

    // clear the previous element in the list, which is the placeholder text element
    var allPosters = container.querySelectorAll('.posterContainer');
    if (allPosters.length == 0) {
      container.innerHTML = '';
      container.appendChild(poster);
    } else {

      container.insertBefore(poster, container.children[0]);

      var allPosters = container.querySelectorAll('.posterContainer');
      // loop through the children and remove any that are greater than 30 children
      for (var i = 0; i < allPosters.length; i++) {
        if (i >= 30) {
          var poster = allPosters[i];
          poster.remove();
        }
      }

    }

    // if the save parameter is true, save the history to the server
    if (save == true) {
      saveHistory();
    }

  } catch (e) {
    console.error('Error fetching movie details:', error);
  };

}

function saveHistory() {
  // saves the current history by sending it to the server

  // if the history is already being saved, do nothing
  var saveBtnImg = document.getElementById('historyEditContainer').children[1].querySelector('img');
  if (saveBtnImg.src.includes('icons/general/loading_wheel.gif')) {
    return;
  }
  saveBtnImg.src = "icons/general/loading_wheel.gif";

  // remove the ability to remove items from the history
  var historyLists = document.querySelector('#myListsPage').getElementsByClassName('container')[1].querySelectorAll('.listContainer');
  for (var i = 0; i < historyLists.length; i++) {
    historyLists[i].classList.remove('editHistory');
  }

  var masterDict = {};

  var idList = ['moviesHistory', 'tvShowsHistory'];

  for (var i = 0; i < idList.length; i++) {
    var container = document.getElementById(idList[i]);
    var history = container.querySelectorAll('.posterContainer');
    var list = [];

    for (var j = 0; j < history.length; j++) {
      var media = history[j];
      var id = media.dataset.id;
      var position = media.dataset.position;
      var dict = {};
      dict[id] = position;
      list.unshift(dict); // add to the begenning of the list
    }

    if (idList[i] == 'moviesHistory') {
      masterDict['movie'] = list;
    } else {
      masterDict['tv'] = list;
    }

  }

  // send the masterDict to the server
  var masterDictString = JSON.stringify(masterDict);
  var url = appsScriptBaseUrl + "?exec=updateHistory&username=" + encodeURIComponent(getLocalStorage('username')) + "&password=" + encodeURIComponent(getLocalStorage('password')) + "&newHistory=" + encodeURIComponent(masterDictString);

  fetch(url)
    .then((response) => {
      return response.json();
    })
    .then((response) => {

      var success = response['success'];
      if (!success) {
        alertMessage(response['error']);
        return;
      }

      // change the save history buttons back to normal
      var editBtn = document.getElementById('historyEditContainer').children[0];
      var saveBtn = document.getElementById('historyEditContainer').children[1];
      editBtn.classList.remove('hidden');
      saveBtn.classList.add('hidden');
      saveBtnImg.src = "icons/general/save.svg";

    })
    .catch(error => {
      alertMessage(error);
    });
}

function editHistory() {
  // allows the user to remove items from their history

  // change the edit history button to the save lists button
  var editBtn = document.getElementById('historyEditContainer').children[0];
  var saveBtn = document.getElementById('historyEditContainer').children[1];
  editBtn.classList.add('hidden');
  saveBtn.classList.remove('hidden');

  var lists = document.querySelector('#myListsPage').getElementsByClassName('container')[1].querySelectorAll('.listContainer');

  // loop through the elements
  for (var i = 0; i < lists.length; i++) {
    var list = lists[i];
    list.classList.add('editHistory');
  }

  // observe for when the myListsPage is hidden, then save the unsaved lists
  var targetElement = document.querySelectorAll('#myListsPage > .container')[1];
  observeForHidden(targetElement, function() {
    var unsavedList = targetElement.querySelectorAll('.editHistory');
    if (unsavedList.length > 0) {
      saveHistory();
    }
  });
}

async function getPlaybackPosition(id, mediaType) {
  // gets the playback position of the media from the history

  // if the history is not loading and has not already loaded, get the history
  var historyContainer = document.getElementById('myListsPage').getElementsByClassName('container')[1];
  var loadingPoster = historyContainer.querySelector('.loadingWave');
  if (historyContainer.dataset.loading != "true" && loadingPoster != null) {

    await getHistory();
    return await getPlaybackPosition(id, mediaType);

  } else if (historyContainer.dataset.loading == "true") {
    // if the history is still loading, try again in 1 second
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
    return await getPlaybackPosition(id, mediaType);

  } else {
    // otherwise, get the position from the media and return it

    if (mediaType == "tv") {
      var container = document.getElementById('tvShowsHistory');
      var defaultReturn = "s0e0";
    } else {
      var container = document.getElementById('moviesHistory');
      var defaultReturn = 0;
    }

    var media = container.querySelector('[data-id="' + id + '"]');
    if (!media) {
      return defaultReturn;
    } else {
      if (mediaType == "tv") {
        return media.dataset.position;
      } else {
        return Number(media.dataset.position);
      }
    }

  }
}

function dropdownEpisodeSelector() {
  // shows the episodes selector on the infoPage

  var dropdownMenu = document.getElementById('episodesDropdown');
  var seasonsContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)");
  var episodesContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(2)");

  // don't do anything if the dropdownMenu is already showing
  if (!dropdownMenu.classList.contains('hidden')) {
    return;
  }
  dropdownMenu.classList.remove('hidden');

  // select the correct season and episode
  var infoPage = document.getElementById('infoPage');
  selectLastEpisode(infoPage.dataset.id);


  var scrollFunction = function(event) {
    var element = event.currentTarget;
    // Check if the scroll position is at the top
    if (element.scrollTop === 0) {
      // If at the top, prevent further scrolling up
      element.scrollTop = 1; // Set it to 1 to prevent further scrolling
    } else if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      // If at the bottom, prevent further scrolling down
      element.scrollTop = element.scrollHeight - element.clientHeight - 1;
    }
  };

  // add a click event listener for mobile users so that the menu will disappear
  var clickFunction = function(e) {
    // don't do anything if the user clicks inside of the dropdown menu
    if (dropdownMenu.contains(e.srcElement)) {
      return;
    }
    // if the user clicks outside the dropdown, hide it and remove the listener
    dropdownMenu.classList.add('hidden');
    document.body.removeEventListener('click', clickFunction);
    dropdownMenu.removeEventListener('mouseleave', mouseLeaveFunction);
    seasonsContainer.removeEventListener('scroll', scrollFunction);
    episodesContainer.removeEventListener('scroll', scrollFunction);
  }

  var mouseLeaveFunction = function() {
    // hide the dropdown
    dropdownMenu.classList.add('hidden');
    dropdownMenu.removeEventListener('mouseleave', mouseLeaveFunction);
    document.body.removeEventListener('click', clickFunction);
    seasonsContainer.removeEventListener('scroll', scrollFunction);
    episodesContainer.removeEventListener('scroll', scrollFunction);
  }

  // add the click event listener with a set timeout function, otherwise it will regester the current click as well
  setTimeout(function() {
    document.body.addEventListener('click', clickFunction);
    dropdownMenu.addEventListener('mouseleave', mouseLeaveFunction);
    seasonsContainer.addEventListener('scroll', scrollFunction);
    episodesContainer.addEventListener('scroll', scrollFunction);
    // set the scroll position to 1 to make scrolling smooth
    seasonsContainer.scrollTop = 1;
    episodesContainer.scrollTop = 1;
  }, 0000);

  // show or hide the Deselect Episode button
  if (getSetting('showDeselectEpisode')) {
    document.getElementById('showDeselectEpisode').classList.remove('hidden');
  } else {
    document.getElementById('showDeselectEpisode').classList.add('hidden');
  }
}

function populateEpisodesDropdown(list, lastEpisodeDict) {
  // populates the dropdown menu for the episodes selector on the infoPage

  var seasonsContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)");
  seasonsContainer.innerHTML = '';
  var episodesContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(2)");
  episodesContainer.innerHTML = '';

  // loop to create each season that is avalible
  for (var i = 0; i < list.length; i++) {
    let dict = list[i];

    let seasonNumber = dict.season_number;
    let lastAiredSeason = lastEpisodeDict.season_number;
    if (seasonNumber == 0 || seasonNumber > lastAiredSeason) {
      continue; // skip the season if it is a special or if it hasn't aired yet
    }

    let numEpisodes = dict.episode_count;

    // create the button for each season
    let element = document.createElement('div');
    element.innerText = "Season " + seasonNumber;
    element.classList.add('button');
    // set the season as active if it is the first season
    if (seasonNumber == 1) {
      element.classList.add('active');
    }
    element.dataset.ep = 0; // set the currently selected episode to 0
    // set the dataset numEpisodes to however many episodes are currently in that season
    if (seasonNumber == lastEpisodeDict.season_number) {
      element.dataset.numEpisodes = lastEpisodeDict.episode_number;
    } else {
      element.dataset.numEpisodes = numEpisodes;
    }

    element.onclick = function() {

      episodesContainer.innerHTML = '';

      // if the active season exists in the seasons container, remove it's active class
      if (seasonsContainer.querySelector('.active')) {
        seasonsContainer.querySelector('.active').classList.remove('active');
      }
      element.classList.add('active'); // add the active class to the selected season

      // loop to create each episode
      for (let j = 1; j <= numEpisodes; j++) {

        let lastAiredEpisode = lastEpisodeDict.episode_number;
        if (j > lastAiredEpisode && seasonNumber == lastAiredSeason) {
          continue; // skip the episode if it hasn't aired yet
        }

        // create a button for each episode
        let subElement = document.createElement('div');
        subElement.innerText = "Episode " + j;
        subElement.classList.add('button');

        // if the episode number is the same as the active episode in the season button, set it as active
        if (j == element.dataset.ep) {
          subElement.classList.add('active');
        }

        subElement.onclick = function() {
          // if the active episode exists in the episodes container, remove it's active class
          if (episodesContainer.querySelector('.active')) {
            episodesContainer.querySelector('.active').classList.remove('active');
          }
          subElement.classList.add('active'); // add the active class to the selected episode

          // remove the currently selected episode fom the season button
          let children = Array.from(seasonsContainer.children);
          children.forEach(function(item) {
            item.dataset.ep = 0;
          });
          element.dataset.ep = j; // set the new selected episode

          // set the play button to play the correct episode
          var id = document.getElementById('infoPage').dataset.id;
          preLoadMedia(id, 'tv', seasonNumber, j);
        };
        // append the episode button to the episodes container and scroll to the top
        episodesContainer.appendChild(subElement);
        episodesContainer.scrollTop = 1;
      }

    }

    seasonsContainer.appendChild(element);
  }
}

function selectLastEpisode(id) {
  // selects the correct season and episode in the dropdown

  var seasonsContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)");
  var episodesContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(2)");

  if (getSetting('saveWatchHistory')) {

    getPlaybackPosition(id, 'tv').then(position => {

      var season = Number(position.match(/s(\d+)/i)[1]);
      var episode = Number(position.match(/e(\d+)/i)[1]);

      // only click on the previously watched episode if the user hasn't changed the episode already
      if (seasonsContainer.children[0].classList.contains('active') && episodesContainer.children.length == 0) {
        try {
          // try to click on the last watched episode
          seasonsContainer.children[season - 1].click();
          episodesContainer.children[episode - 1].click();
        } catch {
          // if it doesn't work, click on the first season and episode
          try {
            seasonsContainer.children[0].click();
            episodesContainer.children[0].click();
          } catch (e) {
            console.error(e);
          }
        }
      }

      var loadingLastEpisodeDiv = document.querySelector("#episodesDropdown > div > div:nth-child(1)");
      loadingLastEpisodeDiv.classList.remove('loadingWave');
      loadingLastEpisodeDiv.innerText = "Last Watched: S" + season + " E" + episode;

    })

  } else {
    var loadingLastWatchedEpisodeDiv = document.querySelector("#episodesDropdown > div > div:nth-child(1)");
    loadingLastWatchedEpisodeDiv.innerText = "";
    loadingLastWatchedEpisodeDiv.classList.remove('loadingWave');
  }
}

function deselectEpisode() {
  // deselects the episode

  var id = document.getElementById('infoPage').dataset.id;
  preLoadMedia(id, 'tv');

  var seasonsContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(1)");
  var episodesContainer = document.querySelector("#episodesDropdown > div > div:nth-child(2) > div:nth-child(2)");

  seasonsContainer.querySelector('.active').classList.remove('active');
  episodesContainer.innerText = '';

  // remove the currently selected episode fom the season button
  var children = Array.from(seasonsContainer.children);
  children.forEach(function(item) {
    item.dataset.ep = 0;
  });
}



// functions for adjusting settings
function getSetting(setting) {
  // gets the specified setting from the local storage

  var defaultValues = {
    autoStartTrailer: true,
    saveWatchHistory: true,
    showDeselectEpisode: false,
    zoom: 100,
    defaultServer: 3
  }

  var value = getLocalStorage('Mflix.settings.' + setting);
  if (value == undefined) {
    var value = defaultValues[setting];
  }

  return value;
}

function setSetting(setting, value) {
  // sets the specified setting to the local storage

  setLocalStorage('Mflix.settings.' + setting, value);

  // immediately execute the attribution of the settings
  executeSettings();

  if (setting == "defaultServer") {
    selectedServer = null;
  }
}

function executeSettings() {
  // adjusts the settings page to reflect the current settings

  // adjust zoom settings
  var newZoom = getSetting('zoom')
  setZoom(newZoom);

  // adjust auto play buttons
  var container = document.getElementById('autoStartTrailerContainer');
  var btn1 = container.querySelector('input:nth-of-type(1)');
  var btn2 = container.querySelector('input:nth-of-type(2)');
  if (getSetting('autoStartTrailer')) {
    btn2.removeAttribute('checked');
    btn1.setAttribute('checked', true);
  } else {
    btn1.removeAttribute('checked');
    btn2.setAttribute('checked', true);
  }

  // adjust saveWatchHistory buttons
  var container = document.getElementById('saveWatchHistoryContainer');
  var btn1 = container.querySelector('input:nth-of-type(1)');
  var btn2 = container.querySelector('input:nth-of-type(2)');
  if (getSetting('saveWatchHistory')) {
    btn2.removeAttribute('checked');
    btn1.setAttribute('checked', true);
  } else {
    btn1.removeAttribute('checked');
    btn2.setAttribute('checked', true);
  }

  // adjust showDeselectEpisode buttons
  var container = document.getElementById('showDeselectEpisodeContainer');
  var btn1 = container.querySelector('input:nth-of-type(1)');
  var btn2 = container.querySelector('input:nth-of-type(2)');
  if (getSetting('showDeselectEpisode')) {
    btn2.removeAttribute('checked');
    btn1.setAttribute('checked', true);
  } else {
    btn1.removeAttribute('checked');
    btn2.setAttribute('checked', true);
  }

  // adjust defaultServer buttons
  var container = document.getElementById('defaultServer');
  var btn1 = container.querySelector('.btnContainer:nth-of-type(1) > input');
  var btn2 = container.querySelector('.btnContainer:nth-of-type(2) > input');
  var btn3 = container.querySelector('.btnContainer:nth-of-type(3) > input');
  var btn4 = container.querySelector('.btnContainer:nth-of-type(4) > input');
  var serverList = [btn1, btn2, btn3, btn4];
  var selection = getSetting('defaultServer') - 1;
  for (var i = 0; i < serverList.length; i++) {
    var btn = serverList[i];
    if (i == selection) {
      btn.setAttribute('checked', true);
    } else {
      btn.removeAttribute('checked');
    }
  }

}

function setZoom(zoomLevel) {
  // adjust the zoom level of the body tag to the given input

  var body = document.querySelector('body');
  if (body.style.zoom == '') {
    var currentZoom = 100;
  } else {
    var currentZoom = Number(body.style.zoom.replace('%', ''));
  }

  if (typeof zoomLevel == "number") {
    // zoom to the specified level
    var newZoom = zoomLevel;

  } else {
    if (zoomLevel == "+") {
      // zoom in by 10
      var newZoom = currentZoom + 10;

    } else if (zoomLevel == "-") {
      // zoom out by 10
      var newZoom = currentZoom - 10;

    }
  }

  body.style.zoom = newZoom + '%';

  var zoomInput = document.getElementById('zoomInput');
  zoomInput.value = newZoom;

  // add the setting to the local storage without using the setSetting function
  setLocalStorage('Mflix.settings.zoom', newZoom);
}



// functions that add event listeners or that run immediately
function addScrollListeners() {
  // add listeners to the movies and tv shows elements so that when the user scrolls to the bottom, more media loads

  var pages = ['moviesPage', 'tvShowsPage'];
  for (var i = 0; i < pages.length; i++) {
    (function() {
      var pageId = pages[i];
      var element = document.getElementById(pageId);

      // Add a scroll event listener to the element
      element.addEventListener('scroll', function() {
        // Calculate the scroll position
        var scrollPosition = element.scrollTop + element.clientHeight;
        var scrollHeight = element.scrollHeight - 1;

        // Check if the user has scrolled to the bottom
        if (scrollPosition >= scrollHeight) {
          var container = element.querySelector('.container');
          if (container.dataset.loading == 'true') {
            // if the previous media is still loading, do nothing
            return;
          }
          var nextPageNum = parseInt(container.dataset.lastpagenum) + 1;
          getLatestMedia(nextPageNum, pageId);
        }
      });
    })(); // IIFE to capture the correct `element`
  }
}

function addWindowResizeListeners() {
  // adds a listener for when the orientation changes or the window resizes

  window.addEventListener('resize', function() {

    // adjust the max height of the overview flex element
    var infoPage = document.getElementById('infoPage');
    if (!infoPage.classList.contains('hidden')) {
      adjustOverviewHeight();
    }

    // adjust how many loading or invisible posters are seen
    adjustPosterSpacing();
  });
}

function addSearchListeners() {
  // this function adds a variety of different event listeners relating to the search page

  // add an event listener to search for media only when there are more than two characters typed
  document.getElementById('searchInput').addEventListener('input', function(event) {
    const query = event.target.value;
    if (query.length > 2) {
      searchMoviesAndTvShows(query).then(dict => {
          displaySearchDropdown(dict);
        })
        .catch(error => {
          console.error("Error fetching movies and TV shows:", error);
        });
    } else {
      hideSearchDropdown();
    }
  });

  // add event listener for when the user presses enter in the search bar
  document.getElementById("searchInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") { // Check if the Enter key is pressed
      var title = document.getElementById('searchInput').value;
      searchMoviesAndTvShows(title).then(dict => {
          displaySearchResults(dict);
          hideSearchDropdown();
          document.getElementById('searchInput').blur();
        })
        .catch(error => {
          console.error("Error fetching movies and TV shows:", error);
        });
    }
  });

  // add an event listener to the whole document to see when the user clicks outside of the search input
  document.addEventListener('click', function(event) {
    if (!document.getElementById('searchInput').contains(event.target)) {
      hideSearchDropdown();
    }
  });
}

function addHeaderListeners() {
  // this function adds a few event listeners to the user element in the header

  // add an event listener to the user profile element to display the dropdown when clicked
  var userProfileDiv = document.querySelector('#header > div');
  userProfileDiv.addEventListener('click', function() {
    var dropdown = document.getElementById('userDropdownOptions');
    dropdown.classList.remove('hidden');
  });

  userProfileDiv.addEventListener('mouseleave', function() {
    var dropdown = document.getElementById('userDropdownOptions');
    dropdown.classList.add('hidden');
  });
}

function addZoomListeners() {
  // listen for when the input for the zoom changes

  var zoomInput = document.getElementById('zoomInput');
  zoomInput.addEventListener('change', function() {
    var zoomValue = Number(zoomInput.value);
    setZoom(zoomValue);
  });

}

function addLoginPageListeners() {
  // adds listeners for the login page

  // add an event listener for the username
  document.getElementById("username").addEventListener("keydown", function(event) {
    if (event.key === "Enter") { // Check if the Enter key is pressed
      // focus on the password
      document.getElementById("password").focus();
    }
  });

  // add an event listener for the password
  document.getElementById("password").addEventListener("keydown", function(event) {
    if (event.key === "Enter") { // Check if the Enter key is pressed
      // login and blur
      document.getElementById("password").blur();
      login();
    }
  });

}

function loadSearchSuggestions() {
  // this function gets a random selection of movies and tv shows on tmdb for search suggestions on the search page

  var container = document.getElementById('searchPage').querySelector('.container');

  var pageNum = getRandomNumber(500);
  var movieURL = "https://api.themoviedb.org/3/discover/movie?region=US&with_origin_country=US&language=en-US&page=" + pageNum + "&api_key=" + apiKey;
  var tvURL = "https://api.themoviedb.org/3/discover/tv?region=US&with_origin_country=US&language=en-US&page=" + pageNum + "&api_key=" + apiKey;

  Promise.all([
      fetch(movieURL).then((response) => response.json()),
      fetch(tvURL).then((response) => response.json())
    ])
    .then(([movies, tvShows]) => {

      if (container.innerText != '') {
        // don't do anything if there are already search results on the page
        return;
      }

      combinedResults = [...movies.results, ...tvShows.results];
      var shuffledList = shuffleList(combinedResults);

      // make a new element to display the search suggestions
      var main = document.createElement('div');
      main.id = "searchSuggestions";

      // make a heading for the search suggestions
      var heading = document.createElement('h3');
      heading.innerText = "Search Suggestions...";
      main.appendChild(heading);

      // itterate through the results and append it to the element
      for (var i = 0; i < shuffledList.length; i++) {
        var suggestion = document.createElement('div');
        suggestion.classList.add('button');
        let title = shuffledList[i].title || shuffledList[i].name;
        suggestion.innerText = title;
        suggestion.onclick = function() {
          document.getElementById('searchInput').value = title;
          searchMoviesAndTvShows(title).then(dict => {
              displaySearchResults(dict);
              hideSearchDropdown();
            })
            .catch(error => {
              console.error("Error fetching movies and TV shows:", error);
            });
        };
        main.appendChild(suggestion);
      }
      // append the main element to the container on the search page
      container.innerHTML = '';
      container.appendChild(main);
    })
    .catch(error => console.error('Error fetching data:', error));
}

function observeForHidden(targetElement, onHiddenFunction) {
  // observes for changes to the visibility and if the element becomes hidden, perform the onHiddenFunction

  // Helper function to check if the element is visible (or hidden by any of its parents)
  function isElementVisible(el) {
    return !!(el.offsetParent || el.getClientRects().length);
  }

  // Create a MutationObserver to monitor style and class changes
  const observer = new MutationObserver(() => {
    const visible = isElementVisible(targetElement);
    if (!visible) {
      // if the element is hidden, perform the function
      onHiddenFunction();
      // remove the observer
      observer.disconnect();
    }
  });

  // Function to observe the element and all of its parents
  function observeVisibility(el) {
    let currentEl = el;

    while (currentEl) {
      observer.observe(currentEl, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      currentEl = currentEl.parentElement; // Move up the DOM tree to observe parents
    }
  }

  // Start observing the target element and its parents
  observeVisibility(targetElement);

  // Return a function to disconnect the observer when needed
  return () => observer.disconnect();
}



// execute the main function right away
main();