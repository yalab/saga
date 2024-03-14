import { App } from '@slack/bolt';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config'

const app = new App({"token": process.env.SLACK_BOT_TOKEN || '',
		     "signingSecret": process.env.SLACK_SIGNING_SECRET || '',
		     "appToken": process.env.SLACK_APP_TOKEN,
		     "socketMode": true,
		     "port": Number(process.env.PORT) || 3000});
const redis = require('redis').createClient({url: process.env.REDIS_URL});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
const dyingMessage = 'Help me. I have died....'

const talkToAI = async (messages: Array<string>) => {
  const result = await model.generateContent(messages[0])
  const response = await result.response
  return response.text()
}

app.event('app_mention', async ({ event, say }) => {
  const thread_ts = event.thread_ts ? event.thread_ts : event.ts;
  const call = event.text.substring(15)
  try {
    await redis.connect()
  } catch (e: unknown) {
    if ( e instanceof Error ) {
      if (e.message !== 'Socket already opened' ) {
	say(dyingMessage)
	console.error(e);
      }
    }
  }
  const response = await talkToAI([call])
  redis.set(String(thread_ts), JSON.stringify([call, response]), 3600)
  await say({ text: response, thread_ts: thread_ts });
  await redis.disconnect()
});

(async () => {
  await app.start();
  console.log('⚡️ Bolt app is running!');
})();
