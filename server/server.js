/* =============================================================================
 * This file should not need many changes. =====================================
 * All changes should be done in the corresponding files. ======================
 * Such as database.js or routes.js ============================================
 *
 * Template Author: Alexander Bell-Towne =======================================
 * alexander@bell-towne.com ====================================================
 * www.bell-towne.com/node-template ============================================
 * github.com/alexbbt/node-template ============================================
 * =============================================================================
 */

// =============================================================================
// Set up ======================================================================
// =============================================================================
	var express    = require("express");
	var bodyParser = require("body-parser");
	var app        = express();
	var port       = process.env.PORT || 8080;
	var word       = process.env.WORD || "Trump";

	// Initialize app
	var server = app.listen(port);

	// Bind sockets to same server.
	var io = require("socket.io").listen(server);

// =============================================================================
// Configuration ===============================================================
// =============================================================================
	var twitter = require("./app/twitter.js")(word);

// =============================================================================
// Set the view engine to ejs ==================================================
// =============================================================================
	app.set("view engine", "ejs");

	app.use( express.static(__dirname + "/../public") );  // Static css and JS files
	app.use( bodyParser.json() );                // to support JSON-encoded bodies
	app.use( bodyParser.urlencoded({              // to support URL-encoded bodies
		extended: true
	}));

// =============================================================================
// Routes ======================================================================
// =============================================================================
	require("./app/routes.js")(app, io, twitter);

// =============================================================================
// Launch ======================================================================
// =============================================================================
	console.log("Tracking the word: ", word);
	console.log("The magic happens on port ", port);
