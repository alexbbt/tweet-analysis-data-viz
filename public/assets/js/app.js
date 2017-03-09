document.addEventListener("DOMContentLoaded", function() {
	var d3 = window.d3;
	var io = window.io;
	var noUiSlider = window.noUiSlider;

	var connection = io();
	var stopWords=[
		"a", "able", "about", "across", "after", "all", "almost", "also", "am", "among", "an", "and", "any", "are", "as", "at", "be", "because", "been", "but", "by", "can", "cannot", "could", "dear", "did", "do", "does", "either", "else", "ever", "every", "for", "from", "get", "got", "had", "has", "have", "he", "her", "hers", "him", "his", "how", "however", "i", "if", "in", "into", "is", "it", "its", "just", "least", "let", "like", "likely", "may", "me", "might", "most", "must", "my", "neither", "no", "nor", "not", "of", "off", "often", "on", "only", "or", "other", "our", "own", "rather", "said", "say", "says", "she", "should", "since", "so", "some", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "tis", "to", "too", "twas", "us", "wants", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would", "yet", "you", "your", "ain't", "aren't", "can't", "could've", "couldn't", "didn't", "doesn't", "don't", "hasn't", "he'd", "he'll", "he's", "how'd", "how'll", "how's", "i'd", "i'll", "i'm", "i've", "isn't", "it's", "might've", "mightn't", "must've", "mustn't", "shan't", "she'd", "she'll", "she's", "should've", "shouldn't", "that'll", "that's", "there's", "they'd", "they'll", "they're", "they've", "via", "wasn't", "we'd", "we'll", "we're", "weren't", "what'd", "what's", "when'd", "when'll", "when's", "where'd", "where'll", "where's", "who'd", "who'll", "who's", "why'd", "why'll", "why's", "won't", "would've", "wouldn't", "you'd", "you'll", "you're", "you've"
	];

	var tweetColors = ["#67001f","#b2182b","#d6604d","#f4a582","#fddbc7","#f7f7f7","#d1e5f0","#92c5de","#4393c3","#2166ac","#053061"];

	var filters = {
		words: [],
		languages: [],
		hashtags: [],
		sentiment: [-15, 15],
		allowRetweets: true
	};

	var blobCount = 0;
	var rawBlobs = [];
	var blobs = [];

	var limits = {
		words: 4,
		languages: 4,
		hashtags: 4,
		tweets: 4
	};

	var secondsToKeep = 300;

	var windowJustShown = false;

	var incrementors = [
		{
			selector: "TopWords",
			update: function() {
				update();
			},
			number: "words"
		},{
			selector: "Langs",
			update: function() {
				update();
			},
			number: "languages"
		},{
			selector: "Hashtags",
			update: function() {
				update();
			},
			number: "hashtags"
		},{
			selector: "Tweets",
			update: function() {
				update();
			},
			number: "tweets"
		}
	];

	var graphs = [
		{
			selector: "#mainGraph",
			type: "bar",
			scale: "range",
			margin: {top: 10, right: 0, bottom: 100, left: 30},
			x: {
				domain: function(blobs) {
					return blobs.map(function(d) { return d.time; });
				},
				time: true
			},
			y: {
				domain: function(blobs) {
					return [0, d3.max(blobs, function(d) { return d.tweets.length; })];
				},
				ticks: 4
			},
			segments: [
				{
					class: "bar",
					color: "steelblue"
				}
			]
		},
		{
			selector: "#sentimentGraph",
			type: "area",
			scale: "linear",
			margin: {top: 10, right: 0, bottom: 30, left: 30},
			x: {
				domain: function() {
					return [-15, 15];
				}
			},
			y: {
				domain: function() {
					var tweets = countTweetSenitment(blobs, true);
					return [0, d3.max(tweets, function(d) { return d.count; })];
				},
				ticks: 3
			},
			segments: [
				{
					class: "unfilteredArea",
					color: "grey",
					update: function() {
						return countTweetSenitment(blobs, false);
					}
				},
				{
					class: "filteredArea",
					color: "steelblue",
					update: function() {
						return countTweetSenitment(blobs, true);
					}
				}
			]
		}
	];

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

	var init = function() {
		graphs = graphs.map(function(graph) {
			return createGraph(graph);
		});

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
				update();
			}
		});

		document.querySelector("#allowRetweets").addEventListener("change", function(e) {
			filters.allowRetweets = e.target.checked;
			update();
		});

		var sentimentScale = document.querySelector("#sentimentScale");
		tweetColors.forEach(function(color) {
			var box = document.createElement("div");
			box.style.cssText = `
				display: inline-block;
				background-color: ${color};
				height: ${Math.floor(sentimentScale.scrollWidth / tweetColors.length)}px;
				width: ${Math.floor(sentimentScale.scrollWidth / tweetColors.length)}px;
			`;
			sentimentScale.append(box);
		});

		document.addEventListener("visibilitychange", function() {
			if (!document.hidden) {
				windowJustShown = true;
				update(blobs);
				windowJustShown = false;
			}
		});

		incrementors.forEach(createIncrementor);

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
			var hasHashtags = true;
			filters.hashtags.forEach(function(filterHashtag) {
				var found = !!tweet.hashtags.find(function(hashtag) {
					return filterHashtag === hashtag.text.toLowerCase();
				});
				if (!found) {
					hasHashtags = false;
				}
				if (hasHashtags) {
					var i = i;
				}
			});
			return (
				hasFilterWords &&
				hasHashtags &&
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
			return displayTweets.concat(blob.tweets.map(function(tweet) {
				return (`
					<div className="tweetBox">
						<blockquote className="twitter-tweet" style="border-color: ${tweetColors[Math.floor(((tweet.sentiment + 15) / 30) * tweetColors.length)]};">
							<p className="tweetText">${tweet.text}</p>
								&mdash; ${tweet.user} (@${tweet.screen_name})
							<a target="_blank" className="pull-right" href="https://twitter.com/${tweet.screen_name}/status/${tweet.id}">
								${new Date(parseInt(tweet.timestamp_ms, 10)).toLocaleString()}
							</a>
						</blockquote>
					</div>
				`);
			}));
		}, []).slice(-limits.tweets);
		document.getElementById("tweetDisplay").innerHTML = displayTweets.join("");

		document.getElementById("description").innerHTML = `Analysis of Tweets with the word: ${blobs[0].word}. Tweets are 1% of the live tweeter stream, chunked to one second blobs. Tweets are dumped after ${secondsToKeep} seconds to conserve memory.`;
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
						/\W/.test(key)
					) {
						return;
					}
					if (partial.hasOwnProperty(key)) {
						partial[key].count++;
					} else {
						partial[key] = {
							word: key,
							count: 1,
							active: filters.words.indexOf(key) > -1
						};
					}
				});
			});
			return partial;
		}, {})).sort(function(a, b) {
			return b.count - a.count;
		});
		var currentWords = filters.words.map(function(word) {
			return {
				word: word,
				active: true
			};
		});
		var groupedWords = currentWords.concat(mostPopularWords.filter(function(d) { return !d.active; }));
		var topWords = d3.select("#topWords").selectAll(".list-group-item")
			.data(groupedWords.slice(0, limits.words), function(d) { return d.word + d.count; });
		topWords.exit().remove();
		topWords.enter()
			.append("a")
				.on("click", function(d) {
					if (d.active) {
						filters.words = filters.words.filter(function(word) {
							return word !== d.word;
						});
					} else {
						filters.words.push(d.word);
					}
					update();
				})
				.attr("class", function(d) {
					if (d.active) {
						return "list-group-item active";
					}
					return "list-group-item";
				})
				.text(function(d) { return d.word; })
				.append("span")
					.attr("class", "badge")
					.text(function(d) { return d.count; });
		topWords.attr("class", function(d) {
			if (d.active) {
				return "list-group-item active";
			}
			return "list-group-item";
		});
	};

	var updateHashtags = function(blobs) {
		var hashtags = Object.values(blobs.reduce(function(partial, blob) {
			blob.tweets.forEach(function(tweet) {
				if (tweet.retweeted_status) {
					return;
				}
				tweet.hashtags.forEach(function(hashtag) {
					var key = hashtag.text.toLowerCase();
					if (key.length === 0) {
						return;
					}
					if (partial.hasOwnProperty(key)) {
						partial[key].count++;
					} else {
						partial[key] = {
							text: key,
							count: 1,
							active: filters.hashtags.indexOf(key) > -1
						};
					}
				});
			});
			return partial;
		}, {})).sort(function(a, b) {
			return b.count - a.count;
		});
		var currentHashtags = filters.hashtags.map(function(hashtag) {
			return {
				text: hashtag,
				active: true
			};
		});
		var groupedHashtags = currentHashtags.concat(hashtags.filter(function(d) { return !d.active; }));
		var topHashtags = d3.select("#Hashtags").selectAll(".list-group-item")
			.data(groupedHashtags.slice(0, limits.hashtags), function(d) { return d.text + d.count; });
		topHashtags.exit().remove();
		topHashtags.enter()
			.append("a")
				.on("click", function(d) {
					if (d.active) {
						filters.hashtags = filters.hashtags.filter(function(hashtag) {
							return hashtag !== d.text;
						});
					} else {
						filters.hashtags.push(d.text);
					}
					update();
				})
				.attr("class", function(d) {
					if (d.active) {
						return "list-group-item active";
					}
					return "list-group-item";
				})
				.text(function(d) { return "#" + d.text; })
				.append("span")
					.attr("class", "badge")
					.text(function(d) { return d.count; });
		topHashtags.attr("class", function(d) {
			if (d.active) {
				return "list-group-item active";
			}
			return "list-group-item";
		});
	};

	var updateLanguages = function() {
		var languages = Object.values(blobs.reduce(function(languages, blob) {
			blob.tweets.forEach(function(tweet) {
				var language = tweet.lang;
				if (languages.hasOwnProperty(language)) {
					languages[language].count++;
				} else {
					languages[language] = {
						language: language,
						count: 1,
						active: filters.languages.indexOf(language) > -1
					};
				}
			});
			return languages;
		}, {})).sort(function(a, b) {
			return b.count - a.count;
		});
		var topLanguages = d3.select("#Languages").selectAll(".list-group-item")
			.data(languages.slice(0, limits.languages), function(d) { return d.language + d.count; });
		topLanguages.exit().remove();
		topLanguages.enter()
			.append("a")
				.on("click", function(d) {
					if (d.active) {
						filters.languages = filters.languages.filter(function(language) {
							return language !== d.language;
						});
					} else {
						filters.languages.push(d.language);
					}
					update();
				})
				.attr("class", function(d) {
					if (d.active) {
						return "list-group-item active";
					}
					return "list-group-item";
				})
				.html(function(d) { return d.language; })
				.append("span")
					.attr("class", "badge")
					.html(function(d) { return d.count; });
		topLanguages.attr("class", function(d) {
			if (d.active) {
				return "list-group-item active";
			}
			return "list-group-item";
		});

	};

	var update = function() {
		var filteredBlobs = copyObject(blobs).map(function(blob) { return filterBlob(blob); });

		updateTopWords(filteredBlobs);
		updateLanguages();
		updateHashtags(filteredBlobs);
		updateStatsDisplay(filteredBlobs);

		graphs.forEach(function(updateGraph) {
			updateGraph(filteredBlobs);
		});

		incrementors.forEach(function(incrementor) {
			document.querySelector(`#showing${incrementor.selector}`).innerHTML = limits[incrementor.number];
		});
	};

	var createIncrementor = function(options) {
		document.querySelector(`.more${options.selector}`).addEventListener("click", function() {
			limits[options.number]++;
			options.update();
		});
		document.querySelector(`.less${options.selector}`).addEventListener("click", function() {
			limits[options.number]--;
			options.update();
		});
	};

	var createGraph = function(options) {
		var segments = options.segments;

		// Set the dimensions of the canvas / graph
		var svg = d3.select(options.selector);
		var graphParent = document.querySelector(options.selector).parentNode;
		svg.attr("width", graphParent.scrollWidth).attr("height", graphParent.scrollHeight);

		var margin = options.margin;
		var width = +svg.attr("width") - margin.left - margin.right;
		var height = +svg.attr("height") - margin.top - margin.bottom;
		var graph = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		// Set the ranges
		var x;
		switch(options.scale){
		case "linear":
			x = d3.scaleLinear()
				.range([0, width]);
			break;
		case "range":
			x = d3.scaleBand()
				.rangeRound([0, width], .05)
				.padding(0.1);
			break;
		}

		var y = d3.scaleLinear()
				.range([height, 0]);

		// Graph Type
		var transform;
		switch(options.type) {
		case "area":
			transform = d3.area()
				.x(function(d) { return x(d.value); })
				.y0(height)
				.y1(function(d) { return y(d.count); });
			break;
		case "bar":
			transform = d3.area()
				.x(function(d) { return x(d.value); })
				.y0(height)
				.y1(function(d) { return y(d.count); });
			break;
		}

		segments.forEach(function(segment) {
			switch(options.type) {
			case "area":
				graph.append("path")
						.attr("class", segment.class)
						.attr("fill", segment.color)
						.attr("d", transform([]));
				break;
			}
		});

		// Add the Y Axis
		graph.append("g")
			.attr("class", "yAxis");

		// Add the X Axis}
		graph.append("g")
			.attr("class", "xAxis")
			.attr("transform", "translate(0," + height + ")");

		var updateGraph = function(blobs) {
			var t = d3.transition();
			if (!windowJustShown) {
				t.duration(750);
			} else {
				t.duration(0);
			}

			// Scale the range of the data
			x.domain(options.x.domain(blobs));
			y.domain(options.y.domain(blobs));
			segments.forEach(function(segment) {

				switch(options.type) {
				case "area":
					var data = segment.update();
					if (data.length <= 0) {
						return;
					}
					graph.select(`.${segment.class}`)
						.attr("d", transform(data));
					break;
				case "bar":
					var bars = graph.selectAll(`.${segment.class}`)
							.data(blobs, function(d) { return d.time; });
					bars.exit()
						.transition(t)
							.attr("width", 0)
							.attr("y", function() { return y(0); })
							.attr("height", function() { return height - y(0); })
							.remove();

					bars
						.enter().append("rect")
							.attr("class", segment.class)
							.style("fill", segment.color)
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
						.transition(t)
							.attr("x", function(d) { return x(d.time); })
							.attr("width", x.bandwidth())
							.attr("y", function(d) { return y(d.tweets.length); })
							.attr("height", function(d) { return height - y(d.tweets.length); });
					break;
				}
			});

			// Update the Y Axis
			var yAxis = d3.axisLeft(y);
			if (options.y.ticks) {
				yAxis.ticks(options.y.ticks);
			}
			if (options.y.time) {
				yAxis.tickFormat(d3.timeFormat("%I:%M:%S %p"));
			}
			graph.select(".yAxis")
				.transition(t)
				.call(yAxis);


			// Update the X Axis
			var xAxis = d3.axisBottom(x);
			if (options.x.ticks) {
				xAxis.ticks(options.x.ticks);
			}
			if (options.x.time) {
				xAxis.tickFormat(d3.timeFormat("%I:%M:%S %p"));
			}
			graph.select(".xAxis")
				.attr("transform", "translate(0," + height + ")")
				.transition(t)
				.call(xAxis)
					.selectAll("text")
						.style("text-anchor", "end")
						.attr("dx", "-.8em")
						.attr("dy", ".15em")
						.attr("transform", "rotate(-65)");
		};
		updateGraph([]);

		return updateGraph;
	};

	var copyObject = function(o) {
		return JSON.parse(JSON.stringify(o));
	};

	init();
});
