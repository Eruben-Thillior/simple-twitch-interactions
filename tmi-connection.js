
/* Helpful information:
based on: https://codepen.io/gylidian/pen/NWWzGGg
*/
var showMessages = true;
var showRedeems = true;
var showCommands = true;

var searchPar = false;

var showId = false;

var tokenVal;
var userVal;
var mascotVal;
var chatVal;

var checkCommands = function (message) {
	switch (message.message) {
		case "!poyo":
			//code for the command
			break;
		case "!helpEru":
		case "!hEru":
			alert("help!");
			break;
		case "!AlertEru":
			alert("alert");
			break;
	}
};

function redeemAction() {}

//Add here individual redeems ids. It only allows redeems with text. Configure redeems events to dispatch in process variable
var eventsIds = [
	//{ id: "da1c99e9-4a1f-4077-bc81-a0fe09224504", process: 'getEventId' },
];

var auxEventId = "";

//get redeem event id, if somethings is redeemed without being configured it defualts to this.
function getEventId(message) {
	if (eventsIds.length == 0) {
		auxEventId = message["custom-reward-id"];
		alert("Redeem registered! Proceed to generate url");
		$("#messageForRedeem").hide();
		$("#copyToClipBoard").css("background-color","green");
		$("#copyToClipBoard").show();
		eventsIds.push({id:1,process:"test"});
	}
	if (showId) {
		alert(message["custom-reward-id"]);
	}
}

var defaultRedeem = getEventId;

var checkRedeems = function (message) {
	console.log(message["custom-reward-id"]);
	if (message.hasOwnProperty("custom-reward-id")) {
		for (var a = 0; a < eventsIds.length; a++) {
			console.log("firs");
			console.log(message["custom-reward-id"] == eventsIds[a].id);
			if (message["custom-reward-id"] == eventsIds[a].id) {
				document.dispatchEvent(
					new CustomEvent(eventsIds[a].process, {
						bubbles: true,
						detail: { message: message }
					})
				);
				return;
			}
		}
		defaultRedeem(message);
	}
};

$(document).ready(function () {
	if (
		window.location.search.indexOf("?editors=") != 0 &&
		window.location.search.indexOf("?key=index.html") != 0 &&
		window.location.search != ""
	) {
		var credentials = new URLSearchParams(window.location.search);
		tokenVal = credentials.get("token");
		userVal = credentials.get("user");
		mascotVal= credentials.get("image");
		chatVal=credentials.get("chat");
		if(chatVal==0){
			showMessages=false;
		}
		
		$("#generateURL").hide();
		$("#copyToClipBoard").hide();
		eventsIds.push(
			{ id: credentials.get("event"), process: "redeemAction" });
		searchPar = true;
		console.log("eventsIds", eventsIds);
		console.log("cred texts", credentials);
		startChat();
	} else {
		$("#credentials").show();
	}
	
});

function startChat() {
	if (typeof tokenVal === "undefined") {
		tokenVal = $("#token").val();
		userVal = $("#username").val();
		
		if($("#imageMascot").val()!=""){
			mascotVal=$("#imageMascot").val();
		}else{
			mascotVal="https://i.imgur.com/MWr6HW8.png";
		}
		
		$("#credentials").hide();
	}
	
	$("#mascot").attr("src",mascotVal);
	
	if(eventsIds.length==0){
		$("#messageForRedeem").show();
	}

	const chatEle = document.getElementById("chat");
	const twitchBadgeCache = {
		data: { global: {} }
	};

	const bttvEmoteCache = {
		lastUpdated: 0,
		data: { global: [] },
		urlTemplate: "//cdn.betterttv.net/emote/{{id}}/{{image}}"
	};

	const krakenBase = "https://api.twitch.tv/kraken/";
	const krakenClientID = tokenVal;

	const chatFilters = [
		"\u0250-\u02AF", // IPA Extensions
		"\u02B0-\u02FF", // Spacing Modifier Letters
		"\u0300-\u036F", // Combining Diacritical Marks
		"\u0370-\u03FF", // Greek and Coptic
		"\u0400-\u04FF", // Cyrillic
		"\u0500-\u052F", // Cyrillic Supplement
		"\u0530-\u1FFF", // Bunch of non-English
		"\u2100-\u214F", // Letter Like
		"\u2500-\u257F", // Box Drawing
		"\u2580-\u259F", // Block Elements
		"\u25A0-\u25FF", // Geometric Shapes
		"\u2600-\u26FF", // Miscellaneous Symbols
		"\u2800-\u28FF" // Braille
	];
	const chatFilter = new RegExp(`[${chatFilters.join("")}]`);

	let client;

	let testing = false;

	if (testing) {
		kraken({
			endpoint: "streams",
			qs: {
				limit: 10,
				language: "en"
			}
		}).then(({ streams }) => {
			client = new tmi.client({
				connection: {
					reconnect: true,
					secure: true
				},

				channels: [userVal]
			});
			addListeners();
			client.connect();
		});
	} else {
		client = new tmi.client({
			connection: {
				reconnect: true,
				secure: true
			},
			channels: [userVal]
		});

		addListeners();
		client.connect();
	}

	function addListeners() {
		window.client = client;
		client.on("connecting", () => {
			showAdminMessage({
				message: "Connecting...",
				attribs: { subtype: "connecting" }
			});

			removeAdminChatLine({ subtype: "disconnected" });
		});

		client.on("connected", () => {
			getBTTVEmotes();
			getBadges().then((badges) => (twitchBadgeCache.data.global = badges));
			showAdminMessage({
				message: "Connected...",
				attribs: { subtype: "connected" },
				timeout: 5000
			});

			removeAdminChatLine({ subtype: "connecting" });
			removeAdminChatLine({ subtype: "disconnected" });
		});

		client.on("disconnected", () => {
			twitchBadgeCache.data = { global: {} };
			bttvEmoteCache.data = { global: [] };
			showAdminMessage({
				message: "Disconnected...",
				attribs: { subtype: "disconnected" }
			});

			removeAdminChatLine({ subtype: "connecting" });
			removeAdminChatLine({ subtype: "connected" });
		});

		function handleMessage(channel, userstate, message, fromSelf) {
			if (chatFilter.test(message)) {
				testing && console.log(message);
				return;
			}

			let chan = getChan(channel);
			let name = userstate["display-name"] || userstate.username;
			if (/[^\w]/g.test(name)) {
				name += ` (${userstate.username})`;
			}
			userstate.name = name;
			showMessage({
				chan,
				type: "chat",
				message,
				data: userstate,
				timeout: 20000
			});
		}

		client.on("message", handleMessage);
		client.on("cheer", handleMessage);

		client.on("chat", function (channel, user, message, self) {
			if (message.startsWith("!poyo")) {
				client.say("channel", "poyoyoyoy?");
			}
		});

		client.on("join", (channel, username, self) => {
			if (!self) {
				return;
			}
			let chan = getChan(channel);
			getBTTVEmotes(chan);
			twitchNameToUser(chan)
				.then((user) => getBadges(user._id))
				.then((badges) => (twitchBadgeCache.data[chan] = badges));
			showAdminMessage({
				message: `Joined ${chan}`,
				timeout: 1000
			});
		});

		client.on("part", (channel, username, self) => {
			if (!self) {
				return;
			}
			let chan = getChan(channel);
			delete bttvEmoteCache.data[chan];
			showAdminMessage({
				message: `Parted ${chan}`,
				timeout: 1000
			});
		});

		client.on("clearchat", (channel) => {
			removeChatLine({ channel });
		});

		client.on("timeout", (channel, username) => {
			removeChatLine({ channel, username });
		});
	}

	function removeChatLine(params = {}) {
		if ("channel" in params) {
			params.channel = getChan(params.channel);
		}
		let search = Object.keys(params)
			.map((key) => `[${key}="${params[key]}"]`)
			.join("");
		chatEle.querySelectorAll(search).forEach((n) => chatEle.removeChild(n));
	}

	function removeAdminChatLine(params = {}) {
		params.type = "admin";
		removeChatLine(params);
	}

	function showAdminMessage(opts) {
		opts.type = "admin";
		if ("attribs" in opts === false) {
			opts.attribs = {};
		}
		opts.attribs.type = "admin";
		return showMessage(opts);
	}

	function getChan(channel = "") {
		return channel.replace(/^#/, "");
	}

	function showMessage({
		chan,
		type,
		message = "",
		data = {},
		timeout = 0,
		attribs = {}
	} = {}) {
		checkRedeems(data);
		if (!showMessages) {
			return;
		}
		let chatLine_ = document.createElement("div");
		let chatLine = document.createElement("div");
		chatLine_.classList.add("chat-line");
		chatLine.classList.add("chat-line-inner");
		chatLine_.appendChild(chatLine);

		if (chan) {
			chatLine_.setAttribute("channel", chan);
		}

		Object.keys(attribs).forEach((key) => {
			chatLine_.setAttribute(key, attribs[key]);
		});

		if (type === "chat") {
			"id" in data && chatLine_.setAttribute("message-id", data.id);
			"user-id" in data && chatLine_.setAttribute("user-id", data["user-id"]);
			"room-id" in data && chatLine_.setAttribute("channel-id", data["room-id"]);
			"username" in data && chatLine_.setAttribute("username", data.username);

			let spaceEle = document.createElement("span");
			spaceEle.innerText = " ";
			let badgeEle = document.createElement("span");
			if ("badges" in data && data.badges !== null) {
				badgeEle.classList.add("badges");
				let badgeGroup = Object.assign(
					{},
					twitchBadgeCache.data.global,
					twitchBadgeCache.data[chan] || {}
				);
				let badges = Object.keys(data.badges).forEach((type) => {
					let version = data.badges[type];
					let group = badgeGroup[type];
					if (group && version in group.versions) {
						let url = group.versions[version].image_url_1x;
						let ele = document.createElement("img");
						ele.setAttribute("src", url);
						ele.setAttribute("badgeType", type);
						ele.setAttribute("alt", type);
						ele.classList.add("badge");
						badgeEle.appendChild(ele);
					}
				}, []);
			}

			let nameEle = document.createElement("span");
			nameEle.classList.add("user-name");
			nameEle.innerText = data.name;

			let colonEle = document.createElement("span");
			colonEle.classList.add("message-colon");
			colonEle.innerText = ": ";

			let messageEle = document.createElement("span");
			messageEle.classList.add("message");

			let finalMessage = handleEmotes(chan, data.emotes || {}, message);
			addEmoteDOM(messageEle, finalMessage);

			chatLine.appendChild(badgeEle);
			chatLine.appendChild(spaceEle);
			chatLine.appendChild(nameEle);
			chatLine.appendChild(colonEle);
			chatLine.appendChild(messageEle);
		} else if (type === "admin") {
			chatLine_.classList.add("admin");

			let messageEle = document.createElement("span");
			messageEle.classList.add("message");
			messageEle.innerText = message;

			chatLine.appendChild(messageEle);
		}

		chatEle.appendChild(chatLine_);

		setTimeout(() => chatLine_.classList.add("visible"), 100);

		if (chatEle.childElementCount > 30) {
			chatEle.removeChild(chatEle.children[0]);
		}

		if (timeout) {
			setTimeout(() => {
				if (chatLine_.parentElement) {
					chatLine_.classList.remove("visible");
					setTimeout(() => chatEle.removeChild(chatLine_), 1000);
				}
			}, timeout);
		}
	}

	function handleEmotes(channel, emotes, message) {
		// let messageParts = message.split(' ');
		let bttvEmotes = bttvEmoteCache.data.global.slice(0);
		if (channel in bttvEmoteCache.data) {
			bttvEmotes = bttvEmotes.concat(bttvEmoteCache.data[channel]);
		}
		let twitchEmoteKeys = Object.keys(emotes);
		let allEmotes = twitchEmoteKeys.reduce((p, id) => {
			let emoteData = emotes[id].map((n) => {
				let [a, b] = n.split("-");
				let start = +a;
				let end = +b + 1;
				return {
					start,
					end,
					id,
					code: message.slice(start, end),
					type: ["twitch", "emote"]
				};
			});
			return p.concat(emoteData);
		}, []);
		bttvEmotes.forEach(({ code, id, type, imageType }) => {
			let hasEmote = message.indexOf(code);
			if (hasEmote === -1) {
				return;
			}
			for (
				let start = message.indexOf(code);
				start > -1;
				start = message.indexOf(code, start + 1)
			) {
				if (window.CP.shouldStopExecution(0)) break;
				let end = start + code.length;
				allEmotes.push({ start, end, id, code, type });
			}
			window.CP.exitedLoop(0);
		});
		let seen = [];
		allEmotes = allEmotes
			.sort((a, b) => a.start - b.start)
			.filter(({ start, end }) => {
				if (seen.length && !seen.every((n) => start > n.end)) {
					return false;
				}
				seen.push({ start, end });
				return true;
			});
		if (allEmotes.length) {
			let finalMessage = [message.slice(0, allEmotes[0].start)];
			allEmotes.forEach((n, i) => {
				let p = Object.assign({}, n, { i });
				let { end } = p;
				finalMessage.push(p);
				if (i === allEmotes.length - 1) {
					finalMessage.push(message.slice(end));
				} else {
					finalMessage.push(message.slice(end, allEmotes[i + 1].start));
				}
				finalMessage = finalMessage.filter((n) => n);
			});
			return finalMessage;
		}
		return [message];
	}

	function addEmoteDOM(ele, data) {
		data.forEach((n) => {
			let out = null;
			if (typeof n === "string") {
				out = document.createTextNode(n);
			} else {
				let {
					type: [type, subtype],
					code
				} = n;
				if (type === "twitch") {
					if (subtype === "emote") {
						out = document.createElement("img");
						out.setAttribute(
							"src",
							`https://static-cdn.jtvnw.net/emoticons/v1/${n.id}/1.0`
						);
						out.setAttribute("alt", code);
					}
				} else if (type === "bttv") {
					out = document.createElement("img");
					let url = bttvEmoteCache.urlTemplate;
					url = url.replace("{{id}}", n.id).replace("{{image}}", "1x");
					out.setAttribute("src", "https:" + url);
				}
			}

			if (out) {
				ele.appendChild(out);
			}
		});
		twemoji.parse(ele);
	}

	function formQuerystring(qs = {}) {
		return Object.keys(qs)
			.map((key) => `${key}=${qs[key]}`)
			.join("&");
	}

	function request({
		base = "",
		endpoint = "",
		qs,
		headers = {},
		method = "get"
	}) {
		let opts = {
			method,
			headers: new Headers(headers)
		};

		return fetch(base + endpoint + "?" + formQuerystring(qs), opts).then((res) =>
			res.json()
		);
	}

	function kraken(opts) {
		let defaults = {
			base: krakenBase,
			headers: {
				"Client-ID": krakenClientID,
				Accept: "application/vnd.twitchtv.v5+json"
			}
		};

		return request(Object.assign(defaults, opts));
	}

	function twitchNameToUser(username) {
		return kraken({
			endpoint: "users",
			qs: { login: username }
		}).then(({ users }) => users[0] || null);
	}

	function getBadges(channel) {
		return kraken({
			base: "https://badges.twitch.tv/v1/badges/",
			endpoint: (channel ? `channels/${channel}` : "global") + "/display",
			qs: { language: "en" }
		}).then((data) => data.badge_sets);
	}

	function getClip(clipSlug) {
		return kraken({
			endpoint: `clips/${clipSlug}`
		});
	}

	function getBTTVEmotes(channel) {
		let endpoint = "emotes";
		let global = true;
		if (channel) {
			endpoint = "channels/" + channel;
			global = false;
		}
		return request({
			base: "https://api.betterttv.net/2/",
			endpoint
		}).then(({ emotes, status, urlTemplate }) => {
			if (status === 404) return;
			bttvEmoteCache.urlTemplate = urlTemplate;
			emotes.forEach((n) => {
				n.global = global;
				n.type = ["bttv", "emote"];
				if (!global) {
					if (channel in bttvEmoteCache.data === false) {
						bttvEmoteCache.data[channel] = [];
					}
					bttvEmoteCache.data[channel].push(n);
				} else {
					bttvEmoteCache.data.global.push(n);
				}
			});
		});
	}

	$("document").ready(function () {
		$("body").on("click", ".chat-line", function () {
			$(this).remove();
		});
	});
}

function copyToClipBoard() {
	if (tokenVal === null || auxEventId == "") {
		alert("You need to configure token and user and redeem");
		return;
	}
	var auxText = $('[rel="canonical"]').attr("href");
	if (typeof auxText === "undefined") {
		auxText = location.toString();
	}
	console.log("auxtext", auxText);
	if (auxText.indexOf("?") > 0) {
		auxText = auxText.substring(0, auxText.indexOf("?"));
	}
	auxText = auxText.replace("/pen/", "/full/");
	auxText = auxText.replace("/fullpage/", "/full/");
	auxText = auxText.replace("https://cdpn.io/", "https://codepen.io/");
	
	if($("#imageMascot").val()!=""){
		imageMascot=$("#imageMascot").val();
	}else{
		imageMascot="https://i.imgur.com/MWr6HW8.png";
	}
	
	chatVal=$('input[name=showChat]:checked').val();
	if(typeof(chatVal)==='undefined'){
		chatVal="0";
	}

	auxText +=
		"?token=" +
		tokenVal +
		"&user=" +
		userVal +
		"&event=" +
		auxEventId+
		"&chat="+
		chatVal+
		"&image="+
		imageMascot;
	$("#urlFull").val(auxText);
	var copyText = document.getElementById("urlFull");

	copyText.select();
	copyText.setSelectionRange(0, 99999);
	
	document.execCommand("copy");
	
	alert("Copied to clipboard!");
}

