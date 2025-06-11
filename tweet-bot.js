require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


// Twitter authentication
const twitterClient = new TwitterApi({
  appKey: process.env.APP_KEY,
  appSecret: process.env.APP_SECRET,
  accessToken: process.env.ACCESS_TOKEN,
  accessSecret: process.env.ACCESS_SECRET,
});

const PERPLEXITY_API_KEY = process.env.PPLX_KEY;

// Generate tweet content using Perplexity AI
async function generateTweet() {
  const prompt = "Write a unique, under 280 character tweet about AI tools, web development, or SaaS insights. It should be useful or witty. Add emojis. Don't be vague.";

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: "system", content: "Be precise and concise." },
          { role: "user", content: prompt },
        ],
        max_tokens: 550,
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const tweet = data?.choices?.[0]?.message?.content?.trim();

    if (!tweet) throw new Error("No tweet returned");

    return tweet;
  } catch (error) {
    console.error("Perplexity API error:", error.message);
    return "Perplexity glitched! Still, keep building and sharing 💡";
  }
}

// Post to Twitter
async function postTweet() {
  const tweet = await generateTweet();
  try {
    await twitterClient.v2.tweet(tweet);
    console.log("✅ Tweet posted:", tweet);
  } catch (err) {
    console.error("Twitter API error:", err.message);
  }
}

// Tweet 10 times/day between 9 AM and 10 PM
const TWEETS_PER_DAY = 10;
const START_HOUR = 1;
const END_HOUR = 22;
const INTERVAL_MINUTES = Math.floor(((END_HOUR - START_HOUR) * 60) / TWEETS_PER_DAY); // ~78 mins

function scheduleTweets() {
  const now = new Date();
  const firstTweetTime = new Date();
  firstTweetTime.setHours(START_HOUR, 0, 0, 0);

  if (now > firstTweetTime) {
    const minutesSinceStart = Math.floor((now - firstTweetTime) / 60000);
    const minutesUntilNextSlot = INTERVAL_MINUTES - (minutesSinceStart % INTERVAL_MINUTES);
    const msUntilNext = minutesUntilNextSlot * 60 * 1000;

    console.log(`⏳ Waiting ${minutesUntilNextSlot} minutes to post first tweet...`);
    setTimeout(startTweetLoop, msUntilNext);
  } else {
    const delay = firstTweetTime - now;
    console.log(`⏳ Waiting until ${START_HOUR}:00 AM to start tweeting...`);
    setTimeout(startTweetLoop, delay);
  }
}

function startTweetLoop() {
  postTweet(); // First tweet
  setInterval(() => {
    const hour = new Date().getHours();
    if (hour >= START_HOUR && hour <= END_HOUR) {
      postTweet();
    } else {
      console.log("⏸️ Off hours. Skipping tweet.");
    }
  }, INTERVAL_MINUTES * 60 * 1000);
}

scheduleTweets();
