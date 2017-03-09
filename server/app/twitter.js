// =============================================================================
// Load your Modules ===========================================================
// =============================================================================
	var Twitter    = require("node-tweet-stream");
	var sentiment  = require("sentiment");
	var ISO6391    = require("iso-639-1");

// =============================================================================
// Load the database variables =================================================
// =============================================================================
	var config = require("../config/private_config.js").twitter;

// =============================================================================
// Local Variables =============================================================
// =============================================================================
	var listener = () => {};
	var tweetCount = 0;
	var tweets = [];
	var lastSent = null;
	var last1000tweets = [];
	var memoryUsed = 0;

// =============================================================================
// Public Functions ============================================================
// =============================================================================
	module.exports = (word) => {
		// =========================================================================
		// Connect to your database. ===============================================
		// =========================================================================
		var connection = new Twitter(config);

		// =========================================================================
		// Private Functions =======================================================
		// =========================================================================
		connection.on("tweet", function(tweet) {
			tweetCount++;

			var tweetSentiment = sentiment(tweet.text);
			var timeBlock = Math.floor(Date.now() / 1000);

			if (last1000tweets.indexOf(tweet.id) > -1) {
				return;
			}

			last1000tweets.push(tweet.id);
			last1000tweets.slice(-1000);

			tweets.push({
				id: tweet.id_str,
				lang: ISO6391.validate(tweet.lang) ? ISO6391.getName(tweet.lang) : tweet.lang,
				text: tweet.text,
				retweeted_status: tweet.hasOwnProperty("retweeted_status"),
				timestamp_ms: tweet.timestamp_ms,
				user: tweet.user.name,
				screen_name: tweet.user.screen_name,
				sentiment: tweetSentiment.score,
				hashtags: tweet.entities.hashtags
			});

			if (lastSent != timeBlock) {
				memoryUsed += roughSizeOfObject(tweets);
				lastSent = timeBlock;
				listener({
					word: word,
					tweets: tweets,
					time: timeBlock
				});
				tweets = [];
			}

			process.stdout.clearLine();  // clear current text
			process.stdout.cursorTo(0);  // move cursor to beginning of line
			process.stdout.write(`Tweets: ${tweetCount}, Memory Used: ${memoryUsed / 1024 / 1024}`);

		});

		connection.on("error", function (err) {
			console.log("Oh no", err);
		});

		// =========================================================================
		// Stream Config ===========================================================
		// =========================================================================
		connection.track(word);
		// connection.language('en')

		// =========================================================================
		// Stream Config ===========================================================
		// =========================================================================
		return {
			listen: (newListener) => {
				listener = newListener;
			}
		};
	};

	function roughSizeOfObject( object ) {

		var objectList = [];
		var stack = [ object ];
		var bytes = 0;

		while ( stack.length ) {
			var value = stack.pop();

			if ( typeof value === "boolean" ) {
				bytes += 4;
			}
			else if ( typeof value === "string" ) {
				bytes += value.length * 2;
			}
			else if ( typeof value === "number" ) {
				bytes += 8;
			}
			else if
				(
						typeof value === "object"
						&& objectList.indexOf( value ) === -1
				)
				{
				objectList.push( value );

				for( var i in value ) {
					stack.push( value[ i ] );
				}
			}
		}
		return bytes;
	}
