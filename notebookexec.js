var DEFAULT_TMPNB = "https://tmpnb.org";

/**
 * @class Notebookie
 * @classdesc pulls notebooks from GitHub gists and propagates cells on the page
 * @param {number} gistID Gist numeric id
 */
Notebookie = function(notebookName) {
  notebookName = notebookName.replace(/\/$/, "");
  $.get("/downloads/notebooks/" + notebookName, this._read.bind(this));
  this.tmpnb = DEFAULT_TMPNB;
};

/**
 * String.includes polyfill
 */
if (!String.prototype.includes) {
  String.prototype.includes = function() {'use strict';
    return String.prototype.indexOf.apply(this, arguments) !== -1;
  };
}

Notebookie.prototype._read = function(notebook) {
  var $container = $('#container');

  this.renderNotebook(notebook);

  $('#main').show();
  $('#loading').hide();
};

/**
 * Tickles the notebook server's contents API to sneakily upload data
 *
 * resp = requests.put("http://127.0.0.1:8888/user/neNUk0HdyfGm/api/contents/that.py",
 *                     json={'type': 'file', 'format': 'text', 'content': "import this"})
 */
upload = function(base_server, filepath, content) {
  fetch(base_server + filepath, {
    method: 'put',
    body: JSON.stringify({
      type: 'file',
      format: 'text', // TODO: This is definitely an assumption...
      content: content
    }),
    headers: {
      'Accept': 'application/json'
    }
  });
};


/**
 * Render a notebook on the DOM. Likely ugly.
 * @param {Object} notebook Jupyter Notebook document
 */
Notebookie.prototype.renderNotebook = function(notebook) {
  // TODO: Check that it's really a notebook (existence of content key)
  console.log("Rendering notebook");

  notebook = JSON.parse(notebook);

  var $container = $('#container');
  $container.empty();

  var cell;

  if (notebook.hasOwnProperty('worksheets')) {
    // Slight conversion from < v4 notebook to v4
    notebook.cells = notebook.worksheets[0].cells;
    for (cellID = 0; cellID < notebook.cells.length; cellID++ ) {
      cell = notebook.cells[cellID];
      cell.source = cell.input;
    }
  }

  for (cellID = 0; cellID < notebook.cells.length; cellID++ ) {
    cell = notebook.cells[cellID];
    if (cell.source && cell.cell_type) {
      if (cell.cell_type == 'code') {
        var code;

        if (typeof cell.source === 'string') {
          code = cell.source;
        } else { // Assume list of source cells
          code = cell.source.join('');
        }

        // Raw <pre> cells with source for thebe to process
        $container.append('<pre data-executable=\'true\'>' + code + '</pre>\n');
      } else if (cell.cell_type == 'markdown') {
        var markdown;

        if (typeof cell.source === 'string') {
          markdown = cell.source;
        } else { // Assume list of source cells
          markdown = cell.source.join('');
        }

        // Little blocks of markdown everywhere
        var html = marked(markdown);
        var el = $container.append('<div class="md">' + html + '</div>');

        // Render LaTeX
        //MathJax.Hub.Queue(["Typeset", MathJax.Hub, el[0]]);

      } else {
        console.log("Unknown cell type: " + cell.cell_type);
      }

    } else {
      console.log("No cell source and/or cell_type: ");
      console.log(cell);
    }
  }
  MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

  var kernel_name;
  try {
    kernel_name = notebook.metadata.kernelspec.name;
  } catch(e) {
    // If a kernel wasn't detected, go with python3
    kernel_name = "python3";
  }

  console.log("Connection to " + this.tmpnb);

  this.thebe = new Thebe({
    url: this.tmpnb,
    kernel_name: kernel_name || "python3",
    codemirror_mode_name: "python"
  });
};

/**
 * Utility funciton to set up Notebookie on the page
 */
notebookexec = function( ) {
  var params = getUrlParams();

  if (!params.notebookID) {
    $('#main').show();
    $('#loading').hide();
    return;
  }
  $('#loading').show();

  //Init MathJax
  MathJax.Hub.Config({
      tex2jax: {
          inlineMath: [ ['$','$'], ["\\(","\\)"] ],
          displayMath: [ ['$$','$$'], ["\\[","\\]"] ],
          processEscapes: true,
          processEnvironments: true
      },
      // Center justify equations in code and markdown cells. Elsewhere
      // we use CSS to left justify single line equations in code cells.
      displayAlign: 'center',
      "HTML-CSS": {
          availableFonts: [],
          imageFont: null,
          preferredFont: null,
          webFont: "STIX-Web",
          //styles: {'.MathJax_Display': {"margin": 0}},
          linebreaks: { automatic: true }
      }
  });
  MathJax.Hub.Configured();

  if (params.notebookID) {
    return new Notebookie(params.notebookID);
  }
};

/**
 * Returns a bare object of the URL's query parameters.
 * You can pass just a query string rather than a complete URL.
 * The default URL is the current page.
 *
 * From: http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
 */
var getUrlParams = function(url) {
    // http://stackoverflow.com/a/23946023/2407309
    if (typeof url == 'undefined') {
        url = window.location.search;
    }
    url = url.split('#')[0]; // Discard fragment identifier.
    var queryString = url.split('?')[1];
    if (!queryString) {
        if (url.search('=') !== false) {
            queryString = url;
        }
    }
    var urlParams = {};
    if (queryString) {
        var keyValuePairs = queryString.split('&');
        for (var i = 0; i < keyValuePairs.length; i++) {
            var keyValuePair = keyValuePairs[i].split('=');
            var paramName = keyValuePair[0];
            var paramValue = keyValuePair[1] || '';
            urlParams[paramName] = decodeURIComponent(paramValue.replace(/\+/g, ' '));
        }
    }
    return urlParams;
}; // getUrlParams
