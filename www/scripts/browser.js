
var sourcePlaylist = "/source/1/playlist/1";

document.observe("dom:loaded", function() {
  genresBox = $("genresBox");
  artistsBox = $("artistsBox");
  albumsBox = $("albumsBox");
  
  genresBox.observe("change", function(e) {
    e.stop();
    var g = genresBox.value;
    getArtistsByGenre(g == "All Genres" ? null : g);
    getAlbumsByGenreAndArtist(g == "All Genres" ? null : g, null);
  });

  artistsBox.observe("change", function(e) {
    e.stop();
    var g = genresBox.value;
    var a = artistsBox.value;
    getAlbumsByGenreAndArtist(g == "All Genres" ? null : g, a == "All Artists" ? null : a);
  });

  albumsBox.observe("change", function(e) {
    e.stop();
    var g = genresBox.value;
    //getArtistsByGenre(g == "All Genres" ? null : g);
  });

  // Inititate the first XHR requests:
  getGenres();
  getArtistsByGenre();
  getAlbumsByGenreAndArtist();
});

var currentGenreRequest;
function getGenres() {
  if (currentGenreRequest) {
    currentGenreRequest.transport.abort();
  }
  currentGenreRequest = new Ajax.Request(sourcePlaylist + "/track/genre", {
    method: "GET",
    parameters: { unique: true },
    onSuccess: function(r) {
      var html = "<option selected>All Genres</option>";
      Array.sort(r.responseJSON).without("").each(function(genre) {
        html += '<option>' + genre + '</option>';
      });
      genresBox.update(html);
    },
    onFailure: onXHRFailure
  });
}

var currentArtistRequest;
function getArtistsByGenre(genre) {
  if (currentArtistRequest) {
    currentArtistRequest.transport.abort();
  }
  var selection = "";
  if (genre) {
    selection = Object.toQueryString({genre:genre}) + "/";
  }
  currentArtistRequest = new Ajax.Request(sourcePlaylist + "/track/" + selection + "artist", {
    method: "GET",
    parameters: { unique: true },
    onSuccess: function(r) {
      var html = "<option selected>All Artists</option>";
      Array.sort(r.responseJSON).without("").each(function(artist) {
        html += '<option>' + artist + '</option>';
      });
      artistsBox.update(html);
    },
    onFailure: onXHRFailure
  });
}

var currentAlbumRequest;
function getAlbumsByGenreAndArtist(genre, artist) {
  if (currentAlbumRequest) {
    currentAlbumRequest.transport.abort();
  }
  var query = {};
  if (genre) {
    query.genre = genre;
  }
  if (artist) {
    query.artist = artist;
  }
  var selection = Object.keys(query).length > 0 ? Object.toQueryString(query) + "/" : "";
  currentAlbumRequest = new Ajax.Request(sourcePlaylist + "/track/" + selection + "album", {
    method: "GET",
    parameters: { unique: true },
    onSuccess: function(r) {
      var html = "<option selected>All Albums</option>";
      Array.sort(r.responseJSON).without("").each(function(album) {
        html += '<option>' + album + '</option>';
      });
      albumsBox.update(html);
    },
    onFailure: onXHRFailure
  });
}

function onXHRFailure(r) {
  console.log("nTunes returned an Error!");
  console.info(r.responseJSON);
}
