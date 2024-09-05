// declare some global variables
var apiKey;
var appsScriptBaseUrl = 'https://script.google.com/macros/s/AKfycbyFDxOpK9tZyuQWtzqPV7zXe979LLQSk288L4p5kIizBDGcLKRPX9YMfbNveG2tvyZ9bw/exec';
var trailerPlayer;
var trailerPlayerTimeout;
var currentSource;

// main function
function main() {
  // add loading posters to each page before the actual media loads
  appendLoadingPosters('homePage', 20);
  appendLoadingPosters('homePage');
  appendLoadingPosters('moviesPage', 20);
  appendLoadingPosters('moviesPage');
  appendLoadingPosters('tvShowsPage', 20);
  appendLoadingPosters('tvShowsPage');

  // authenticate the current user immediately
  authenticate();

  // get the source to use to watch the movies
  getAvalibleSource();

  // add the scroll listeners in order to load more media
  addScrollListeners();
  // add the event listeners for the search page
  addSearchListeners();
  // add the event listebers for items in the header
  addHeaderListeners();

  // Add event listener for changes in orientation to adjust the max height of the overview flex element
  window.addEventListener('orientationchange', function() {
    var infoPage = document.getElementById('infoPage');
    if (!infoPage.classList.contains('hidden')) {
      adjustOverviewHeight();
    }
  });

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
  for (i = 0; i < mainPages.length; i++) {
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



// functions for loging in users
function authenticate() {
  // authenticate the user by checking to see if they have the apiKey, if not, make them login

  try {
    var fecDict = JSON.parse(localStorage.getItem('FEC'));
    apiKey = fecDict.Mflix.apiKey;
    loadPageContent('homePage');
    // hide the login page
    var loginPage = document.getElementById('loginPage');
    loginPage.classList.add("hidden");
    // add the user's name to the header
    var userProfileDiv = document.querySelector('#header > div > div');
    userProfileDiv.innerText = getLocalStorage('username');
    // display search suggestions on the search page
    loadSearchSuggestions();

  } catch {
    var username = getLocalStorage('username');
    var password = getLocalStorage('password');
    if (username && password) {
      login(username, password);
    } else {
      //displayPopup('<h1>Login To Continue</h1><br><input type="text" id="username" name="username" placeholder="Username"><br><br><input type="text" id="password" name="password" placeholder="Password">', null, "Login", login);
      var loginPage = document.getElementById('loginPage');
      loginPage.classList.remove("hidden");
    }
  }
}

function login(username, passwordHash) {
  // login to the website to get the apiKey

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
  //console.log(url);
  fetch(url)
    .then((response) => {
      //console.log(response.status);
      return response.json();
    })
    .then((response) => {
      var key = response['apiKey'];
      if (!key) {
        var loginPage = document.getElementById('loginPage');
        loginPage.classList.remove("hidden");
        errorMsgDiv.innerText = response['error'];
        loadingGif.classList.add('hidden');
        return;
      }
      setLocalStorage("username", username);
      setLocalStorage("password", password);
      setLocalStorage("Mflix.apiKey", key);
      authenticate();
    });
}

function logout() {
  // logout of the website

  // reset the local storage by passing no arguments to setLocalStorage()
  setLocalStorage();

  // reload the page
  var homePage = document.location.origin + document.location.pathname;
  document.location.href = homePage;
}



// functions for showing, hiding, and loading main page content
function displayPage(pageID) {
  // displays the page based off the pageID and hides the others

  // load the content for that page
  loadPageContent(pageID);

  // mark the selected page in the menubar as active and remove the other active classes
  var currentTab = document.querySelector('.active');
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
  for (i = 0; i < pageList.length; i++) {
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
      console.log('already loaded');
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

        // show that the content is already loaded
        container.dataset.loaded = "true";
      })
      .catch(error => console.error('Error:', error));

  } else if (category == 'moviesPage') {
    getLatestMedia(1, category);

  } else if (category == 'tvShowsPage') {
    getLatestMedia(1, category);
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
      console.log(data)
      idList = [];
      for (i = 0; i < data.result.length; i++) {
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
  console.log(id);

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
    console.log(id);
    displayInfoPage(id, mediaType, title);
  };

  mainElm.appendChild(img);
  mainElm.appendChild(qaulityElm);
  mainElm.appendChild(titleElm);

  return mainElm;
}

function appendLoadingPosters(mediaPageID, repeatNum) {
  // creates loading posters to display at the bottom of the movies and tv shows page

  var container = document.getElementById(mediaPageID).querySelector('.container');

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

  var container = document.getElementById(mediaPageID).querySelector('.container');

  var loadingPosters = container.querySelectorAll('.noHover');

  for (var i = 0; i < loadingPosters.length; i++) {
    loadingPosters[i].remove();
  }
}



// functions that display or get info for the infoPage
function displayInfoPage(mediaId, mediaType, optionalTitle) {
  // display the info page with the results about the movie or tv show

  // load a video right away so that the player on iOS doesn't error on first attempt
  if (!trailerPlayer.getVideoData().video_id) {
    trailerPlayer.loadVideoById('none');
    trailerPlayer.playVideo();
    trailerPlayer.stopVideo();
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

          // load the video right away, but don't play it yet
          trailerPlayer.cueVideoById(trailerID);

          // make sure that the trailer buttons are visible
          trailerBtn1.classList.remove('hidden');
          trailerBtn2.classList.remove('hidden');

          // make the buttons behave properly
          trailerBtn1.onclick = function() {
            startTrailer(trailerID);
          }
          trailerBtn1.setAttribute("data-id", trailerID);

          // autostart the trailer after 5 seconds
          trailerPlayerTimeout = setTimeout(function() {
            startTrailer(); // don't use a video id, so that the player doesn't have to reload
          }, 5000);

        } else {
          // the trailer does not exist
          trailerBtn1.classList.add('hidden');
          trailerBtn2.classList.add('hidden');
        }
      });


      preLoadMedia(mediaId, mediaType);

    })
    .catch(error => console.log('Error fetching movie info:', error));
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
  }

  // round the rating to one decimal point
  var ratingNum = Math.round(ratingNum * 10) / 10;

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
          console.log('found rating')
          console.log(usRelease);
          var usCertification = usRelease.rating || usRelease.release_dates[0].certification;
          console.log(usCertification)
          if (usCertification == "") {
            var usCertification = "NR";
          }
          certificationElem.innerText = usCertification;
          console.log('US Rating:', usCertification);
        } else {
          certificationElem.innerText = "NR";
          console.log('US Rating not found');
        }
      } catch {
        certificationElem.innerText = "NR";
        console.log('US Rating not found');
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
    //console.log('in landscape');
    // it is in landscape mode, so set the max height to the scroll height of the flex content
    var flexContent = document.getElementById('descriptionContent');
    flexElement.style.maxHeight = flexContent.scrollHeight + 'px';
  } else {
    //console.log('in portrait');
    // it is not in landscape mode, so set the max heoght of the flex element to 100%
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

  // stop the trailer by loading an invalid video
  trailerPlayer.stopVideo();
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
  // display the overlay over the trailer again
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'none';
  // stop the trailer feom playing if the timeout has not happened yet
  clearTimeout(trailerPlayerTimeout);
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
async function preLoadMedia(tmdbID, mediaType) {
  // try to get the original source from vidsrc, otherwise use the regular embed url

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
    // when getting the direct source fails
    var sourceURL = currentSource + "embed/" + mediaType + "/" + tmdbID;
  }

  // add the onclick function to play the movie
  var playBtn = document.getElementById('playButton');
  playBtn.onclick = function() {
    playMovie(sourceURL);
  };
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
  trailerPlayer.stopVideo();
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'none';

  // set the iframe source to the source url
  var iframe = document.getElementById('movieIframe');
  iframe.src = sourceURL;

  // display the iframe's parent element
  iframe.parentNode.classList.remove('hidden');
}

function stopMovie() {
  // stops playing the movie or tv show in the iframe

  // stop the media by loading an invalid movie
  var iframe = document.getElementById('movieIframe');
  iframe.src = "https://vidsrc.to/embed/movie/";
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
}



// functions that deal with the user's watch lists
function addToList() {
  alert('Add to list function coming soon');
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

        // Log the values
        /*console.log('scrollTop:', element.scrollTop);
        console.log('clientHeight:', element.clientHeight);
        console.log('scrollHeight:', element.scrollHeight);*/

        // Check if the user has scrolled to the bottom
        if (scrollPosition >= scrollHeight) {
          console.log('You have scrolled to the bottom!');
          //loadMoreMedia();
          console.log(pages[i])
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

  // add event listener for when the user presses enter in the ssearch bar
  document.getElementById("searchInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") { // Check if the Enter key is pressed
      var title = document.getElementById('searchInput').value;
      searchMoviesAndTvShows(title).then(dict => {
          displaySearchResults(dict);
          hideSearchDropdown();
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

async function getAvalibleSource() {
  // see which movie source is avalible, sidsrc.to or vidsrc.me

  try {
    var response = await fetch('https://vidsrc.to/movies/latest/page-1.json', {
      method: 'HEAD'
    }); // Use 'HEAD' method to fetch only headers
    if (response.ok) {
      //console.log('.to');
      currentSource = 'https://vidsrc.to/';
    } else {
      throw new Error('VidSrc.to is down!');
    }
  } catch (error) {
    try {
      var response = await fetch('https://vidsrc.me/movies/latest/page-1.json', {
        method: 'HEAD'
      }); // Use 'HEAD' method to fetch only headers
      if (response.ok) {
        //console.log('.me');
        currentSource = 'https://vidsrc.me/';
      } else {
        throw new Error('VidSrc.me is down!');
      }
    } catch (error2) {
      console.log(error2);
      console.log('Both VidSrc.to and VidSrc.me are down!');
    }
  }
}

function loadSearchSuggestions() {
  // this function gets a random selection of movies and tv shows on tmdb for search suggestions on the search page

  var pageNum = Math.floor(Math.random() * 500);
  var movieURL = "https://api.themoviedb.org/3/discover/movie?region=US&with_origin_country=US&language=en-US&page=" + pageNum + "&api_key=" + apiKey;
  var tvURL = "https://api.themoviedb.org/3/discover/tv?region=US&with_origin_country=US&language=en-US&page=" + pageNum + "&api_key=" + apiKey;

  Promise.all([
      fetch(movieURL).then((response) => response.json()),
      fetch(tvURL).then((response) => response.json())
    ])
    .then(([movies, tvShows]) => {
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
      var container = document.getElementById('searchPage').querySelector('.container');
      container.innerHTML = '';
      container.appendChild(main);
    })
    .catch(error => console.error('Error fetching data:', error));
}



// execute the main function right away
main();