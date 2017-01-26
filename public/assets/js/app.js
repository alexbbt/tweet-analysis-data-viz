document.addEventListener("DOMContentLoaded", function() {
	var d3 = window.d3;
	var io = window.io;
	var noUiSlider = window.noUiSlider;

	var connection = io();
	var stopWords=[
		"a", "able", "about", "across", "after", "all", "almost", "also", "am", "among", "an", "and", "any", "are", "as", "at", "be", "because", "been", "but", "by", "can", "cannot", "could", "dear", "did", "do", "does", "either", "else", "ever", "every", "for", "from", "get", "got", "had", "has", "have", "he", "her", "hers", "him", "his", "how", "however", "i", "if", "in", "into", "is", "it", "its", "just", "least", "let", "like", "likely", "may", "me", "might", "most", "must", "my", "neither", "no", "nor", "not", "of", "off", "often", "on", "only", "or", "other", "our", "own", "rather", "said", "say", "says", "she", "should", "since", "so", "some", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "tis", "to", "too", "twas", "us", "wants", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would", "yet", "you", "your", "ain't", "aren't", "can't", "could've", "couldn't", "didn't", "doesn't", "don't", "hasn't", "he'd", "he'll", "he's", "how'd", "how'll", "how's", "i'd", "i'll", "i'm", "i've", "isn't", "it's", "might've", "mightn't", "must've", "mustn't", "shan't", "she'd", "she'll", "she's", "should've", "shouldn't", "that'll", "that's", "there's", "they'd", "they'll", "they're", "they've", "wasn't", "we'd", "we'll", "we're", "weren't", "what'd", "what's", "when'd", "when'll", "when's", "where'd", "where'll", "where's", "who'd", "who'll", "who's", "why'd", "why'll", "why's", "won't", "would've", "wouldn't", "you'd", "you'll", "you're", "you've"
	];


	var filters = {
		words: [],
		languages: [],
		sentiment: [-15, 15],
		allowRetweets: true
	};
	var blobCount = 0;
	var rawBlobs = [];
	var blobs = [];
	var topWordsToShow = 4;
	var langsToShow = 4;
	var tweetsToShow = 1;

	var secondsToKeep = 300;

	var word = "";

	var windowJustShown = false;

	// Set the dimensions of the canvas / graph
	var svg = d3.select("#mainGraph");
	var parent = document.querySelector("#mainGraph").parentNode;
	svg.attr("width", parent.scrollWidth).attr("height", parent.scrollHeight);

	var margin = {top: 10, right: 30, bottom: 100, left: 30};
	var width = +svg.attr("width") - margin.left - margin.right;
	var height = +svg.attr("height") - margin.top - margin.bottom;
	var graph = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Set the ranges
	var x = d3.scaleBand().rangeRound([0, width], .05).padding(0.1);
	var y = d3.scaleLinear().range([height, 0]);
	var init = function() {
		// Add the X Axis
		graph.append("g")
			.attr("class", "xAxis")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(x));

		// Add the Y Axis
		graph.append("g")
			.attr("class", "yAxis")
			.call(d3.axisLeft(y));

		connection.on("tweet", function(data) {
			blobCount++;
			data.time = data.time * 1000;
			rawBlobs.push(data);
			rawBlobs = rawBlobs.slice(-secondsToKeep);
			blobs = mergeBlobs(rawBlobs).slice(-secondsToKeep / 10);
			window.data = {
				rawBlobs,
				blobs
			};
			if (!document.hidden) {
				update(blobs);
			}
		});

		document.addEventListener("visibilitychange", function() {
			if (!document.hidden) {
				windowJustShown = true;
				update(blobs);
				windowJustShown = false;
			}
		});

		document.querySelector(".moreTopWords").addEventListener("click", function() {
			topWordsToShow++;
			update();
		});
		document.querySelector(".lessTopWords").addEventListener("click", function() {
			topWordsToShow--;
			update();
		});

		document.querySelector(".moreLangs").addEventListener("click", function() {
			langsToShow++;
			update();
		});
		document.querySelector(".lessLangs").addEventListener("click", function() {
			langsToShow--;
			update();
		});

		document.querySelector(".moreTweets").addEventListener("click", function() {
			tweetsToShow++;
			update();
		});
		document.querySelector(".lessTweets").addEventListener("click", function() {
			tweetsToShow--;
			update();
		});

		var rangeSlider = document.querySelector("#sentimentFilter");
		noUiSlider.create(rangeSlider, {
			start: [ -15, 15 ],
			step: 1,
			range: {
				"min": [  -15 ],
				"max": [ 15 ]
			}
		});
		rangeSlider.noUiSlider.on("slide", function(range) {
			filters.sentiment = range.map(function(num) { return parseInt(num); });
			update();
		});

	};

	var copyObject = function(o) {
		return JSON.parse(JSON.stringify(o));
	};

	var mergeBlobs = function(blobs) {
		var b = blobs.reduce(function(partial, blob) {
			var key = Math.floor(blob.time / 10000) * 10000;
			if (partial.hasOwnProperty(key)) {
				partial[key].tweets = partial[key].tweets.concat(blob.tweets);
			} else {
				partial[key] = {
					word: blob.word,
					time: key,
					tweets: blob.tweets
				};
			}
			return partial;
		}, {});
		return Object.values(b);
	};

	var filterBlob = function(blob, useSentiment = true) {
		blob.tweets = blob.tweets.filter(function(tweet) {
			// if (!useSentiment) console.log(tweet.sentiment >= filters.sentiment[0] && tweet.sentiment <= filters.sentiment[1]);
			var hasFilterWords = true;
			filters.words.forEach(function(word) {
				if (!(tweet.text.toLowerCase().split(" ").indexOf(word) > -1)) {
					hasFilterWords = false;
				}
			});
			return (
				hasFilterWords &&
				(filters.languages.length === 0 || filters.languages.indexOf(tweet.lang) > -1) &&
				(filters.allowRetweets || !tweet.retweeted_status) &&
				(!useSentiment || (tweet.sentiment >= filters.sentiment[0] && tweet.sentiment <= filters.sentiment[1]))
			);
		});
		return blob;
	};

	var updateStatsDisplay = function(filteredBlobs) {
		var tweetCount = blobs.reduce(function(count, blob) {
			return count + blob.tweets.length;
		}, 0);

		var seconds = Math.min(blobCount, secondsToKeep);
		var averageTweetsPerSecond = Math.round((tweetCount / seconds) * 100) / 100;

		var realTimeTweetsPerSecond = rawBlobs.slice(-1) ? rawBlobs.slice(-1)[0].tweets.length : 0;

		var filteredTweetCount = filteredBlobs.reduce(function(count, blob) {
			return count + blob.tweets.length;
		}, 0);

		document.getElementById("stats").innerHTML = JSON.stringify({
			"tweets received": tweetCount,
			"average tweets/sec": averageTweetsPerSecond,
			"real time tweets/sec": realTimeTweetsPerSecond,
			"showing": filteredTweetCount
		}, null, 2);

		var displayTweets = filteredBlobs.reduce(function(displayTweets, blob) {
			blob.tweets.forEach(function(tweet) {
				displayTweets.push({
					user: tweet.user,
					time: tweet.created_at,
					text: tweet.text,
					sentiment: tweet.sentiment
				});
			});
			return displayTweets;
		}, []).slice(-tweetsToShow);
		var urlRegex = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/;
		var formattedDisplay = JSON.stringify(displayTweets, null, 2).split("\\n").join("\n      ").replace(urlRegex, function(match) {
			return `<a target=_blank href=${match}>${match}</a>`;
		} );
		document.getElementById("tweetDisplay").innerHTML = formattedDisplay;

		word = blobs[0].word;
		document.getElementById("description").innerHTML = `Analysis of Tweets with the word: ${word}. Tweets are 1% of the live tweeter stream, chunked to one second blobs. Tweets are dumped after ${secondsToKeep} seconds to conserve memory.`;
	};

	var updateFilterDisplay = function() {
		var filterString = "";
		var filterLinkedObject = copyObject(filters);
		filterLinkedObject.words = filterLinkedObject.words.map(function(word) {
			return `<a id=word${word}>${word}</a>`;
		});
		filterLinkedObject.languages = filterLinkedObject.languages.map(function(lang) {
			return `<a id=lang${lang}>${lang}</a>`;
		});
		filterLinkedObject.sentiment = JSON.stringify(filterLinkedObject.sentiment, null, 1).split("\n").join("");
		filterLinkedObject.allowRetweets = `<a id=allowRetweets>${filterLinkedObject.allowRetweets}</a>`;
		filterString = JSON.stringify(filterLinkedObject, null, 2);
		document.getElementById("filters").innerHTML = filterString;
		filters.words.forEach(function(word) {
			document.getElementById("word" + word).addEventListener("click", function() {
				filters.words = filters.words.filter(function(fword) {
					return fword !== word;
				});
				update();
			});
		});
		filters.languages.forEach(function(lang) {
			document.getElementById("lang" + lang).addEventListener("click", function() {
				filters.languages = filters.languages.filter(function(flang) {
					return flang !== lang;
				});
				update();
			});
		});
		document.getElementById("allowRetweets").addEventListener("click", function() {
			filters.allowRetweets = !filters.allowRetweets;
			update();
		});
	};

	var updateTopWords = function(blobs) {
		var mostPopularWords = Object.values(blobs.reduce(function(partial, blob) {
			blob.tweets.forEach(function(tweet) {
				if (tweet.retweeted_status) {
					return;
				}
				tweet.text.split(" ").forEach(function(word) {
					var key = word.toLowerCase();
					if (
						key.length === 0 ||
						stopWords.indexOf(key) > -1 ||
						key.indexOf(blob.word.toLowerCase()) > -1 ||
						key.indexOf("http:") > -1 ||
						/\W/.test(key) ||
						filters.words.indexOf(key) > -1
					) {
						return;
					}
					if (partial.hasOwnProperty(key)) {
						partial[key].count++;
					} else {
						partial[key] = {
							word: key,
							count: 1
						};
					}
				});
			});
			return partial;
		}, {})).sort(function(a, b) {
			return b.count - a.count;
		});
		// console.log(mostPopularWords.slice(0, 3).reduce(function(s, w) { return s + w.word + ":" + w.count + " "; }, ""));
		var topWords = d3.select("#topWords").selectAll(".list-group-item")
			.data(mostPopularWords.slice(0, topWordsToShow), function(d) { return d.word + d.count; });
		topWords.exit().remove();
		topWords.enter()
			.append("a")
				.on("click", function(d) {
					filters.words.push(d.word);
					update();
				})
				.attr("class", "list-group-item")
				.text(function(d) { return d.word; })
				.append("span")
					.attr("class", "badge")
					.text(function(d) { return d.count; });
	};

	var updateLanguages = function() {
		var languages = Object.values(blobs.reduce(function(languages, blob) {
			blob.tweets.forEach(function(tweet) {
				var language = tweet.lang;
				if (
					filters.languages.indexOf(language) > -1
				) {
					return;
				}
				if (languages.hasOwnProperty(language)) {
					languages[language].count++;
				} else {
					languages[language] = {
						language: language,
						count: 1
					};
				}
			});
			return languages;
		}, {})).sort(function(a, b) {
			return b.count - a.count;
		});
		// console.log(languages.slice(0, langsToShow).reduce(function(s, w) { return s + w.language + ":" + w.count + " "; }, ""));
		var topWords = d3.select("#Languages").selectAll(".list-group-item")
			.data(languages.slice(0, langsToShow), function(d) { return d.language + d.count; });
		topWords.exit().remove();
		topWords.enter()
			.append("a")
				.on("click", function(d) {
					filters.languages.push(d.language);
					update();
				})
				.attr("class", "list-group-item")
				.html(function(d) { return d.language; })
				.append("span")
					.attr("class", "badge")
					.html(function(d) { return d.count; });
	};

	var update = function() {
		var filteredBlobs = copyObject(blobs).map(function(blob) { return filterBlob(blob); });

		updateTopWords(filteredBlobs);
		updateLanguages();
		updateFilterDisplay();
		updateStatsDisplay(filteredBlobs);
		updateSentimentGraph();

		document.querySelector("#showingTopWords").innerHTML = topWordsToShow;
		document.querySelector("#showingLangs").innerHTML = langsToShow;
		document.querySelector("#showingTweets").innerHTML = tweetsToShow;

		// Scale the range of the data
		x.domain(filteredBlobs.map(function(d) { return d.time; }));
		y.domain([0, d3.max(filteredBlobs, function(d) { return d.tweets.length; })]);

		var t = d3.transition();
		if (!windowJustShown) {
			t.duration(750);
		} else {
			t.duration(0);
		}

		var bars = graph.selectAll(".bar")
				.data(filteredBlobs, function(d) { return d.time; });
		// Add the Y Axis
		graph.select(".yAxis")
			.transition(t)
			.call(d3.axisLeft(y));

		bars.exit()
			.transition(t)
				.attr("width", 0)
				.attr("y", function() { return y(0); })
				.attr("height", function() { return height - y(0); })
				.remove();

		bars
			.enter().append("rect")
				.attr("class", "bar")
				.style("fill", "steelblue")
				.attr("x", function(d) { return x.bandwidth() + x(d.time); })
				.attr("width", 0)
				.attr("y", function() { return y(0); })
				.attr("height", function() { return height - y(0); })
				.transition(t)
					.attr("x", function(d) { return x(d.time); })
					.attr("width", x.bandwidth())
					.attr("y", function(d) { return y(d.tweets.length); })
					.attr("height", function(d) { return height - y(d.tweets.length); });

		bars
			.style("fill", "steelblue")
			.transition(t)
				.attr("x", function(d) { return x(d.time); })
				.attr("width", x.bandwidth())
				.attr("y", function(d) { return y(d.tweets.length); })
				.attr("height", function(d) { return height - y(d.tweets.length); });

		// Add the X Axis
		graph.select(".xAxis")
			.transition(t)
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(x).tickFormat(d3.timeFormat("%I:%M:%S %p")))
				.selectAll("text")
					.style("text-anchor", "end")
					.attr("dx", "-.8em")
					.attr("dy", ".15em")
					.attr("transform", "rotate(-65)");
	};

	init();

	var updateSentimentGraph = (function() {
		var sentimentGraphSvg = d3.select("#sentimentGraph");
		var sentimentGraphParent = document.querySelector("#sentimentGraph").parentNode;
		sentimentGraphSvg.attr("width", sentimentGraphParent.scrollWidth).attr("height", sentimentGraphParent.scrollHeight);

		var sentimentGraphMargin = {top: 10, right: 0, bottom: 30, left: 50};
		var sentimentGraphWidth = +sentimentGraphSvg.attr("width") - sentimentGraphMargin.left - sentimentGraphMargin.right;
		var sentimentGraphHeight = +sentimentGraphSvg.attr("height") - sentimentGraphMargin.top - sentimentGraphMargin.bottom;
		var sentimentGraph = sentimentGraphSvg.append("g").attr("transform", "translate(" + sentimentGraphMargin.left + "," + sentimentGraphMargin.top + ")");
		var counts = [];
		var unfilteredCounts = [];

		var x = d3.scaleLinear()
				.domain([-15, 15])
				.range([0, sentimentGraphWidth]);

		var y = d3.scaleLinear()
				.range([sentimentGraphHeight, 0]);

		var area = d3.area()
			.x(function(d) { return x(d.value); })
			.y0(sentimentGraphHeight)
			.y1(function(d) { return y(d.count); });

		sentimentGraph.append("path")
				.attr("class", "unfilteredArea")
				.attr("fill", "grey")
				.attr("d", area([]));

		sentimentGraph.append("path")
				.attr("class", "filteredArea")
				.attr("fill", "steelblue")
				.attr("d", area([]));

		// Add the Y Axis
		sentimentGraph.append("g")
			.attr("class", "yAxis")
			.call(d3.axisLeft(y).ticks(3));

		sentimentGraph.append("g")
			.attr("class", "xAxis")
			.attr("transform", "translate(0," + height + ")")
			.call(d3.axisBottom(x));

		var countTweetSenitment = function(blobs, filter) {
			return Object.values(copyObject(blobs)
				.map(function(blob) { return filterBlob(blob, filter); })
				.reduce(function(counts, blob) {
					blob.tweets.forEach(function(tweet) {
						if (counts.hasOwnProperty(tweet.sentiment)) {
							counts[tweet.sentiment].count++;
						} else {
							counts[tweet.sentiment] = {
								value: tweet.sentiment,
								count: 1
							};
						}
					});
					return counts;
				}, {}))
				.sort(function(a, b) {
					return a.value - b.value;
				});
		};

		var updateSentimentGraph = function() {
			counts = countTweetSenitment(blobs, true);
			unfilteredCounts = countTweetSenitment(blobs, false);

			if (counts.length === 0) {
				return;
			}

			y.domain([0, d3.max(counts, function(d) { return d.count; })]);
			area.y0(y(0));

			sentimentGraph.select(".filteredArea")
				.attr("d", area(counts));

			sentimentGraph.select(".unfilteredArea")
				.attr("d", area(unfilteredCounts));

			var t = d3.transition().duration(750);

			// Add the Y Axis
			sentimentGraph.select(".yAxis")
				.transition(t)
				.call(d3.axisLeft(y).ticks(3));

			// Add the X Axis
			sentimentGraph.select(".xAxis")
				.attr("transform", "translate(0," + sentimentGraphHeight + ")")
				.call(d3.axisBottom(x))
					.selectAll("text")
						.style("text-anchor", "end")
						.attr("dx", "-.8em")
						.attr("dy", ".15em")
						.attr("transform", "rotate(-65)");

		};
		updateSentimentGraph();

		return updateSentimentGraph;
	})();
});
