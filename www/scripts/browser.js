
var sourcePlaylist = "/source/1/playlist/1";

document.observe("dom:loaded", function() {
  genresBox = $("genresBox");
  artistsBox = $("artistsBox");
  albumsBox = $("albumsBox");
  
  genresBox.observe("change", function(e) {
    e.stop();
    var filter = {};
    var g = genresBox.value;
    if (g && g != "All Genres") {
      filter.genre = g;
    }
    get(['artist','album'], filter.genre ? filter : null);
  });

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

  albumsBox.observe("change", function(e) {
    e.stop();
  });

  // Inititate the first XHR request:
  get(['genre','artist','album']);
});

var currentRequest;
function get(props, filters) {
  if (currentRequest) {
    currentRequest.transport.abort();
  }
  var selection = Object.keys(filters).length > 0 ? Object.toQueryString(filters) + "/" : "";
  currentRequest = new Ajax.Request(sourcePlaylist + "/track/" + selection + props.join(","), {
    method: "GET",
    parameters: { unique: true },
    onSuccess: function(r) {
      props.each(function(prop, i) {
        var html = "<option selected>All "+prop[0].toUpperCase()+prop.substring(1)+"s</option>";
        var array = props.length == 1 ? r.responseJSON : r.responseJSON[i];
        array.sort().without("").each(function(item) {
          html += '<option>' + item + '</option>';
        });
        $(prop + "sBox").update(html);
      });
    },
    onFailure: onXHRFailure
  });
}

function onXHRFailure(r) {
  console.log("nTunes returned an Error!");
  console.info(r.responseJSON);
}
