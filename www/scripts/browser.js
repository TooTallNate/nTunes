
document.observe("dom:loaded", function() {
  var genresBox = $("genresBox");
  var artistsBox = $("artistsBox");
  var albumsBox = $("albumsBox");
  
  // When the "Genres" box changes, we need to get the filteres Artists and
  // Albums based on the user selection.
  genresBox.observe("change", function(e) {
    e.stop();
    var filter = {};
    var g = genresBox.value;
    if (g && g != "All Genres") {
      filter.genre = g;
    }
    get(['artist','album'], filter);
  });

  // When the "Arists" box changes, we only need to get the filtered Albums,
  // but based on the current Genre and Aritst selections.
  artistsBox.observe("change", function(e) {
    e.stop();
    var g = genresBox.value;
    var a = artistsBox.value;
    var filter = {};
    if (g && g != "All Genres") {
      filter.genre = g;
    }
    if (a && a != "All Artists") {
      filter.artist = a;
    }
    get(['album'], filter);
  });

  // When the "Albums" box changes, we could do something like fetch the
  // filtered songs, and display them in a <ul> below. But in this example,
  // we won't do anything.
  albumsBox.observe("change", function(e) {
    e.stop();
  });

  // Inititate the first XHR request. Initially we need to fill all three of
  // the boxes (genre, artist, album), and with the "get" function defined
  // below that leverages the nTunes API, we can acheive all that in a single
  // XHR call.
  get(['genre','artist','album']);
});


// We keep a reference to the current XHR request, since only one should be
// active at a time, and we need this reference to abort() any old XHRs.
var currentRequest;
function get(props, filters) {
  // If there's a currently running XHR, call abort() on if before starting a
  // new one.
  if (currentRequest) {
    currentRequest.transport.abort();
  }
  // If any 'filters' we passed, then turn them into a query-string for
  // insertion into the GET url.
  var selection = Object.keys(filters).length > 0 ? Object.toQueryString(filters) + "/" : "";

  // Create a new Ajax.Request instance (Prototype's XHR helper wrapper),
  // dynamically creating the requesting URL based off the current user
  // selection of genre, artist, and album.
  currentRequest = new Ajax.Request("/source/1/playlist/1/track/" + selection + props.join(","), {
    // GET is used for reading properties/lists.
    // POST is used for writing properties/lists.
    method: "GET",
    // In the case of the "Genre", "Artist", and "Album" boxes, we only want
    // the unique entries from the list. We could get all entries and get the
    // unique values on the client-side, but:
    //   1) That wastes a ton on bandwidth
    //   2) Much slower to do the calculation on the client-side.
    parameters: { unique: true },
    // So when the request is successful iterate through the requested props,
    // and create new <option> elements with the returned values and insert
    // the options into the appropriate container element.
    onSuccess: function(r) {
      props.each(function(prop, i) {
        var html = "<option selected>All "+prop[0].toUpperCase()+prop.substring(1)+"s</option>";
        var array = props.length == 1 ? r.responseJSON : r.responseJSON[i];
        array.sort().without("").each(function(item) {
          html += '<option>' + item + '</option>';
        });
        $(prop + "sBox").update(html);
      });
      currentRequest = null;
    },
    // If the request for some reason fails (it shouldn't...) then print info
    // to the console...
    onFailure: function(r) {
      console.log("nTunes returned an Error!");
      console.info(r.responseJSON);
    }
  });
}
