// JavaScript code for fetching data from TMDB API and handling click events
var apiKey;
let currentCategory = 'home';
var appsScriptBaseUrl = 'https://script.google.com/macros/s/AKfycbyFDxOpK9tZyuQWtzqPV7zXe979LLQSk288L4p5kIizBDGcLKRPX9YMfbNveG2tvyZ9bw/exec';

function fetchData(url) {
  return fetch(url)
    .then(response => response.json())
    .catch(error => console.error('Error:', error));
}

function loadPageContent(category) {
  if (category == 'homePage') {
    var url = 'https://api.themoviedb.org/3/discover/movie?api_key=' + apiKey + '&language=en-US&sort_by=popularity.desc&include_adult=false';
    fetchData(url)
      .then(data => {
        const container = document.getElementById(category).querySelector('.container');
        container.innerHTML = ''; // Clear previous content

        data.results.forEach(item => {
          var poster = makePosterDiv(item.id, item.title, "", item.poster_path, "movie");
          container.appendChild(poster);
        });
      })
      .catch(error => console.error('Error:', error));

  } else if (category == 'moviesPage') {
    getLatestMedia(1, category);

  } else if (category == 'tvShowsPage') {
    getLatestMedia(1, category);
  }
}

function displayInfoPage(mediaId, mediaType, optionalTitle) {
  console.log(mediaType);
  if (mediaType == 'movie') {
    var url = 'https://api.themoviedb.org/3/movie/' + mediaId + '?api_key=' + apiKey;
  } else if (mediaType == 'tv') {
    var url = 'https://api.themoviedb.org/3/tv/' + mediaId + '?api_key=' + apiKey;
  }
  console.log(url);
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


      // load the movie or tv show trailer
      getMediaTrailer(mediaId, mediaType).then(trailerID => {
        var trailerBtn1 = document.getElementById('stopTrailer');
        var trailerBtn2 = document.getElementById('restartTrailer');
        if (trailerID != null) {
          // make sure that the trailer buttons are visible
          trailerBtn1.classList.remove('hidden');
          trailerBtn2.classList.remove('hidden');

          // make the buttons behave properly and autodtart the trailer after 5 seconds
          trailerBtn1.onclick = function() {
            startTrailer(trailerID);
          }
          trailerBtn1.setAttribute("data-id", trailerID);
          //trailerBtn.innerText = "Stop Trailer";
          trailerPlayerTimeout = setTimeout(function() {
            startTrailer(trailerID);
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

// adjusts the description/overview height
function adjustOverviewHeight() {
  var flexElement = document.querySelector("#infoSplit1 > div.flex");
  flexElement.style.maxHeight = '1px';

  // Check if the device is in landscape mode
  if (window.matchMedia("(orientation: landscape)").matches) {
    console.log('in landscape');
    // It is in landscape mode, so set the max height to the scroll height of the flex content
    var flexContent = document.querySelector('.flex-content');
    flexElement.style.maxHeight = flexContent.scrollHeight + 'px';
  } else {
    console.log('in portrait');
    // it is not in landscape mode, so set the max heoght of the flex element to 100%
    flexElement.style.maxHeight = "100%";
  }
}

// function to get the movie or tv show trailer
async function getMediaTrailer(movieId, mediaType) {
  if (mediaType == 'movie') {
    var url = 'https://api.themoviedb.org/3/movie/' + movieId + '/videos?api_key=' + apiKey;
  } else if (mediaType == 'tv') {
    var url = 'https://api.themoviedb.org/3/tv/' + movieId + '/videos?api_key=' + apiKey;
  }
  console.log(url)

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    const data = await response.json();

    // Find the YouTube trailer
    const trailer = data.results.find(video => video.site === 'YouTube' && video.type === 'Trailer');
    if (trailer) {
      return trailer.key;
    } else {
      return null;
    }
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
    return null;
  }
}

function addToList() {
  alert('Add to list function coming soon');
}

function resumeMedia() {
  alert('Resume function coming soon');
}


function main() {
  // authenticate the current user immediately
  authenticate();

  // Add event listener for changes in orientation to adjust the max height of the overview flex element
  window.addEventListener('orientationchange', function() {
    var infoPage = document.getElementById('infoPage');
    if (!infoPage.classList.contains('hidden')) {
      adjustOverviewHeight();
    }
  });

  // get the source to use to watch the movies
  getAvalibleSource();

  // add the scroll listeners in order to load more media
  addScrollListeners();

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
}

function displayPage(pageID) {
  loadPageContent(pageID);
  var currentTab = document.querySelectorAll('.active')[0];
  currentTab.classList.remove('active');
  var newTab = document.getElementById(pageID.replace('Page', ''));
  newTab.classList.add('active');
  var pageList = ['searchPage', 'homePage', 'moviesPage', 'tvShowsPage', 'myListsPage'];
  for (i = 0; i < pageList.length; i++) {
    var id = pageList[i];
    var page = document.getElementById(id);
    page.classList.add('hidden');
  }
  var page = document.getElementById(pageID);
  page.classList.remove('hidden');
}


// declare some global variables
var trailerPlayer;
var trailerPlayerTimeout;
var globalMovieId;
var currentSource;

// This function creates an <iframe> (and YouTube player)
// after the API code downloads.
function onYouTubeIframeAPIReady() {
  trailerPlayer = new YT.Player('ytTrailerPlayer', {
    height: '100%',
    width: '100%',
    videoId: '',
    events: {
      'onStateChange': onTrailerStateChange
    },
    playerVars: {
      'autoplay': 1,
      'controls': 0,
      'disablekb': 1,
      'iv_load_policy': 3
    }
  });
}

// The API calls this function when the player's state changes.
function onTrailerStateChange(event) {
  var trailerBtn = document.getElementById('stopTrailer');
  if (event.data == YT.PlayerState.ENDED) {
    var playerElement = document.getElementById('ytTrailerPlayer');
    playerElement.style.display = 'none';

  } else if (event.data == YT.PlayerState.PAUSED) {
    trailerBtn.innerText = "Resume Trailer";
    trailerBtn.onclick = function() {
      trailerPlayer.playVideo();
      trailerBtn.innerText = "Stop Trailer";
      trailerBtn.onclick = function() {
        trailerPlayer.pauseVideo();
      }
    }

  } else if (event.data == YT.PlayerState.PLAYING) {
    trailerBtn.innerText = "Stop Trailer";
    trailerBtn.onclick = function() {
      trailerPlayer.pauseVideo();
    }

  } else if (event.data == -1) {
    trailerBtn.innerText = "Start Trailer";
    trailerBtn.onclick = function() {
      var id = trailerPlayer.getVideoData().video_id;
      startTrailer(id);
    }
  }
}

function startTrailer(trailerID) {
  clearTimeout(trailerPlayerTimeout);
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'block';
  trailerPlayer.loadVideoById(trailerID);
  trailerPlayer.playVideo();
}

function restartTrailer() {
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

function resetInfoPage() {
  // stop the trailer by loading an invalid video
  trailerPlayer.loadVideoById('none');
  // set the movie info back to normal
  var infoPage = document.getElementById('infoPage');
  infoPage.classList.add('hidden');
  var infoSplit1 = document.getElementById('infoSplit1');
  var titleElem = infoSplit1.children[0];
  titleElem.innerText = "";
  var infoCluster = document.getElementById('infoCluster');
  infoCluster.innerHTML = '<table style="width: 100%; font-weight: bold;"><tr><td>Not Yet Released</td><td>- / 10</td></tr><tr><td>NR</td><td>-h -m</td></tr></table>';
  var overviewElem = infoSplit1.children[2].children[0];
  overviewElem.innerText = "";
  // display the overlay over the trailer again
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'none';
  // stop the trailer feom playing if the timeout has not happened yet
  clearTimeout(trailerPlayerTimeout);
}


function playMovie(sourceURL) {
  // stop the trailer and show the poster again, also clear the timeout for the trailer
  clearTimeout(trailerPlayerTimeout);
  trailerPlayer.loadVideoById('none');
  var playerElement = document.getElementById('ytTrailerPlayer');
  playerElement.style.display = 'none';
  // set the iframe source to the source url
  var iframe = document.getElementById('movieIframe');
  iframe.src = sourceURL;
  // display the iframe's parent element
  iframe.parentNode.classList.remove('hidden');
}

function stopMovie() {
  var iframe = document.getElementById('movieIframe');
  iframe.src = "https://vidsrc.to/embed/movie/";
  iframe.parentNode.classList.add('hidden');
  var playTrailerBtn = document.getElementById('stopTrailer');
  var trailerID = playTrailerBtn.getAttribute("data-id");
  playTrailerBtn.onclick = function() {
    startTrailer(trailerID);
  }
}

/*
window.addEventListener('message', message => {
    alert(message.origin + "\n\n" + message.data);
    console.log(message.origin + "\n\n" + message.data);
});
*/

async function preLoadMedia(tmdbID, mediaType) {
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
  var url = "https://vidsrc.to/embed/movie/" + tmdbID;
  var html = (await (await fetch(url)).text());
  var doc = new DOMParser().parseFromString(html, 'text/html');
  var allATags = doc.querySelectorAll('a');
  var specificATags = Array.from(allATags).filter(a => a.href === "javascript:;");
  var vidsrcID = specificATags[0].dataset["id"];
  return vidsrcID;
}


async function getSources(vidsrcId) {
  const response = await (await fetch('https://vidsrc.to/ajax/embed/episode/' + vidsrcId + '/sources')).json();
  const data = response.result;
  return data.reduce((acc, video) => {
    acc[video.title] = video.id;
    return acc;
  }, {});
}


async function getSourceUrl(sourceId) {
  const response = await fetch('https://vidsrc.to/ajax/embed/source/' + sourceId);
  const data = await response.json();
  const encryptedSourceUrl = data.result.url;
  return decryptSourceUrl(encryptedSourceUrl);
}


function decryptSourceUrl(sourceUrl) {
  const encoded = decodeBase64UrlSafe(sourceUrl);
  const decoded = adecode(encoded);

  const decodedText = new TextDecoder('utf-8').decode(decoded);
  return decodeURIComponent(decodedText);
}


function decodeBase64UrlSafe(str) {
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


// a function for debugging
function logBuffer(buffer) {
  // Log the entire buffer as a hexadecimal string
  let hexString = Array.from(buffer).map(byte => byte.toString(16).padStart(2, '0')).join(' ');
  console.log(`<Buffer ${hexString}>`);
}




function displayReleaseDate(inputDate) {
  console.log(inputDate)
  // display the release date of the movie
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
  // display the critic rating
  console.log(ratingNum + " / 10");
  if (ratingNum == null || ratingNum == undefined || ratingNum == "") {
    var ratingNum = "-";
  }
  var ratingElem = document.querySelector("#infoCluster > table > tbody > tr:nth-child(1) > td:nth-child(2)");
  var string = ratingNum + " ★";
  ratingElem.innerText = string;
}


function displayRuntime(runTime, mediaType) {
  // display the runtime
  console.log(runTime + " minutes");
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


function displayCertification(movieId, mediaType) {
  // display the certification rating
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








function countColumns() {
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
  var style = window.getComputedStyle(posterElm);
  var totalMargin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
  var totalImgWidth = imgWidth + totalMargin;
  return Math.floor(containerWidth / totalImgWidth);
}

async function getAvalibleSource() {
  try {
    var response = await fetch('https://vidsrc.to/movies/latest/page-1.json', {
      method: 'HEAD'
    }); // Use 'HEAD' method to fetch only headers
    if (response.ok) {
      console.log('.to');
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
        console.log('.me');
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


document.getElementById('searchInput').addEventListener('input', function(event) {
  const query = event.target.value;
  if (query.length > 2) {
    searchMoviesAndTvShows(query).then(dict => {
        displayDropdown(dict);
      })
      .catch(error => {
        console.error("Error fetching movies and TV shows:", error);
      });
  } else {
    hideSearchDropdown();
  }
});

async function searchMoviesAndTvShows(query) {
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

function displayDropdown(dict) {
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
  var dropdown = document.getElementById('searchDropdown');
  dropdown.innerHTML = '';
  dropdown.style.display = 'none';
  // change the search bar z index back to normal
  var searchBar = document.getElementById('searchInput');
  searchBar.style.zIndex = 0;
}

document.addEventListener('click', function(event) {
  if (!document.getElementById('searchInput').contains(event.target)) {
    hideSearchDropdown();
  }
});

function displaySearchResults(dict) {
  //console.log(moviesList);
  //console.log(tvShowsList);
  //var combinedList = moviesList.concat(tvShowsList);
  const results = dict['results'];
  const container = document.getElementById('searchPage').querySelector('.container');
  container.innerHTML = ''; // Clear previous content

  results.forEach(item => {
    if (item['media_type'] == 'person') {
      return; // skip the person
    }
    /*const img = document.createElement('img');
    img.src = `https://image.tmdb.org/t/p/w185${item.poster_path}`;
    img.dataset.id = item.id;
    img.onclick = function() {
      displayInfoPage(item.id, item.media_type);
    };*/

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

function getLatestMedia(pageNum = 1, category) {
  // get the latest tv shows or movies from the vidsrc api

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

  console.log(url);

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
            /*console.log(`Title: ${movie.title}, Cover URL: https://image.tmdb.org/t/p/w500${movie.poster_path}`);
            console.log(movie)
            var quality = data.result[i].quality || "";
            console.log(quality)
            var title = movie.title || data.result[i].title;
            console.log(title);
            if (!movie.poster_path) {
                var cover =
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNNLEL-qmmLeFR1nxJuepFOgPYfnwHR56vcw&s";
            } else {
                var cover = 'https://image.tmdb.org/t/p/w185' + movie.poster_path;
            }
            console.log(cover)

            var mainElm = document.createElement('div');
            mainElm.classList.add('posterContainer');
            var qaulityElm = document.createElement('div');
            qaulityElm.innerText = quality;
            var titleElm = document.createElement('div');
            titleElm.innerText = title;


            var img = document.createElement('img');
            //img.src = 'https://image.tmdb.org/t/p/w185' + movie.poster_path;
            img.src = cover;
            img.dataset.id = movie.id;
            console.log(movie.id)
            img.onclick = function() {
                console.log(movie.id)
                displayInfoPage(movie.id, mediaType);
            };

            mainElm.appendChild(img);
            mainElm.appendChild(qaulityElm);
            mainElm.appendChild(titleElm);*/

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
  var pageID = document.querySelector('.sidebar > .active').id;
  var page = document.getElementById(pageID + 'Page').querySelector('.container');
  var lastPageNum = page.dataset.lastpagenum;
  getLatestMedia(lastPageNum + 1, pageID);
}

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
    img.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNNLEL-qmmLeFR1nxJuepFOgPYfnwHR56vcw&s";
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









function authenticate() {
  try {
    var fecDict = JSON.parse(localStorage.getItem('FEC'));
    console.log(fecDict)
    apiKey = fecDict.Mflix.apiKey;
    loadPageContent('homePage');
    var loginPage = document.getElementById('loginPage');
    loginPage.classList.add("hidden");

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

function displayPopup(message, closeText = null, continueText = null, continueFunction = null, ...continueArgs) {
  // first remove the prevent input element if it already exists
  var oldElem = document.getElementById('preventInput');
  if (oldElem != null) {
    oldElem.remove();
  }
  // create an element over the top of everything and display a message with options
  // create a blank div tag to prevent background items from being clicked
  var preventInput = document.createElement('div');
  preventInput.id = "preventInput";
  preventInput.style.height = "100%";
  preventInput.style.width = "100%";
  preventInput.style.overflow = "hidden";
  preventInput.style.top = "0";
  preventInput.style.position = "fixed";
  preventInput.style.backgroundColor = "rgba(0, 0, 0, 0.75)";
  document.body.appendChild(preventInput);

  var mainDiv = document.createElement('div');
  mainDiv.style.backgroundColor = "white";
  mainDiv.style.width = "70%";
  mainDiv.style.position = "fixed";
  mainDiv.style.top = "50%";
  mainDiv.style.left = "50%";
  mainDiv.style.transform = 'translate(-50%, -50%)';
  mainDiv.style.margin = "auto";
  mainDiv.style.overflow = "hidden";
  mainDiv.style.borderRadius = "20px";
  mainDiv.style.border = "solid";
  mainDiv.style.display = "flex";
  mainDiv.style.flexDirection = "column";
  mainDiv.style.textAlign = "center";
  preventInput.appendChild(mainDiv);

  var messageDiv = document.createElement('div');
  messageDiv.style.margin = "5%";
  messageDiv.innerHTML = message;
  mainDiv.appendChild(messageDiv);

  var buttonContainer = document.createElement('div');
  buttonContainer.style.display = "flex";
  buttonContainer.style.justifyContent = "space-evenly";
  buttonContainer.style.marginBottom = "5%";
  mainDiv.appendChild(buttonContainer);

  if (closeText != null) {
    var cancelBtn = document.createElement('div');
    cancelBtn.style.padding = "3% 5% 3% 5%";
    cancelBtn.style.borderRadius = "999px";
    cancelBtn.style.backgroundColor = "red";
    cancelBtn.innerText = closeText;
    cancelBtn.addEventListener('click', () => {
      preventInput.remove();
    });
    buttonContainer.appendChild(cancelBtn);
  }

  if (continueText != null && continueFunction != null) {
    var continueBtn = document.createElement('div');
    continueBtn.style.padding = "3% 5% 3% 5%";
    continueBtn.style.borderRadius = "999px";
    continueBtn.style.backgroundColor = "blue";
    continueBtn.innerText = continueText;
    continueBtn.addEventListener('click', () => {
      continueFunction(...continueArgs);
      preventInput.remove();
    });
    buttonContainer.appendChild(continueBtn);
  }
}

function login(username, passwordHash) {
  // get the loginPage and error message div
  var loginPage = document.getElementById('loginPage');
  var errorMsgDiv = loginPage.children[4];
  errorMsgDiv.innerText = "";

  // if the username or password don't have any value, get the values from the input
  if (!username || !passwordHash) {
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


  //displayPopup("Username: " + username + "\nPassword: " + password);
  var url = appsScriptBaseUrl + "?exec=login&username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(passwordHash);
  console.log(url);
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

function setLocalStorage(keyPath, value) {
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
  var fecDict = JSON.parse(localStorage.getItem('FEC'));
  return keyPath.split('.').reduce((acc, part) => acc && acc[part], fecDict);
}

function stringToHash(string) {
  return string.split('').reduce((hash, char) => {
    return char.charCodeAt(0) + (hash << 6) + (hash << 16) - hash;
  }, 0);
}





function appendLoadingPosters(mediaPageID) {
  // creates loading posters to display at the bottom of the movies and tv shows page

  var container = document.getElementById(mediaPageID).querySelector('.container');

  var numColumns = countColumns();
  var numPosters = container.children.length;
  var repeatNum = numColumns - (numPosters % numColumns);

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









main();