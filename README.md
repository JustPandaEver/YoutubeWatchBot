<p align="center">
    <img alt="ViewCount" src="https://komarev.com/ghpvc/?username=JijaProGamer&color=green">
    <img alt="OS" src="https://img.shields.io/badge/OS-Windows%20/%20Linux-success">
    <img alt="Downloads" src="https://img.shields.io/github/downloads/JijaProGamer/youtubeWatchBot/total.svg">
    <a href="https://github.com/JijaProGamer/youtubeWatchBot/releases/dev">
</p>

# Youtube watch bot

NodeJS program for view botting, watch time botting, comment botting, and like botting
You can use it as a CLI, as a simple program or by using its API, with control over every part of the program

![CLI Example image](cli/Capture.PNG?raw=true)

# Requirements

 * NodeJS 16.17.1 (other versions not tested)
 * Connection speed of at least 0.7 mbps per worker
 * Google chrome 107.0.5304.107 or later (NO OTHER BROWSER SUPPORTED OTHER THAN CHROME)
 * A good proxy is needed if you need many views

# Features
 * Bypasess bot detection
 * Can customise every part of it, including extensions
 * Multithreaded and small CPU usage (Up to 30 workers at the same time)
 * Multiple ways to watch video, higher SEO
 * Uses as little bandwith as possible (Around 4 megabits per minute per worker)
 * Can customise watchtime, can like video and comment if logged in
 * http, https, socks4, socks5 & authentification support for proxy

# CPU Usage (i5 10400)
 * Each worker 1.8-3.1% CPU usage and ~440MB Ram
 * Program itself 4% CPU usage

# CLI Usage

```bash
node app.js --index1 value1 --index2 value1 value2 --index3

#Arguments possible:

--views Integer [How many views per proxy (Or just the value if no proxy)]
--style String [Direct, Search, Subscriptions]
--headless [USE ONLY IN TESTING, MAY BREAK BOT AND YOUTUBE CAN DETECT IT]
--videos String String  ... [ids of the videos to watch, could be URLs too]
--concurrency Integer [How many browsers to run at the same time]
--concurrencyInterval Integer [Every x seconds start a new browser (Small values can lag some systems)]
--watchTime Integer/Percent [How much of the video should be watched. Use seconds (162) or percent (75p)]

# These arguments override /cli/options.json
```