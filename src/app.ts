import { App, LogLevel } from '@slack/bolt';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config'

const app = new App({"token": process.env.SLACK_BOT_TOKEN || '',
		     "signingSecret": process.env.SLACK_SIGNING_SECRET || '',
		     "appToken": process.env.SLACK_APP_TOKEN,
		     "socketMode": true,
		     "logLevel": process.env.LOG_LEVEL ? process.env.LOG_LEVEL as LogLevel : LogLevel.INFO,
		     "port": Number(process.env.PORT) || 3000});
const redis = require('redis').createClient({url: process.env.REDIS_URL});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
const dyingMessage = 'Help me. I have died....'

const talkToAI = async (messages: Array<string>) => {
  const msg = messages.pop() || ''
  const history = messages.map((text, i) => {
    const role = i % 2 === 0 ? 'user' : 'model'
    return {role: role, parts: [{text: text}]}
  })
  const chat = model.startChat({
    history: history,
    generationConfig: {
      maxOutputTokens: 100,
    },
  });

  const result = await chat.sendMessage(msg);
  const response = await result.response;
  const text = response.text();
  return text
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

app.message(async ({ message, say, logger }) => {
  if( !('thread_ts' in message) ){
    return
  }
  if (message.text?.substring(0, 1) === '#') {
    logger.debug('これはコメントやから無視しとこか')
    return
  }
  await redis.connect()
  const str = await redis.get(String(message.thread_ts))
  if (!str) { return }
  const messages = JSON.parse(str)
  messages.push(message.text)
  console.log(messages)
  const text = await talkToAI(messages)
  messages.push(text)
  await redis.set(String(message.thread_ts), JSON.stringify(messages), 3600)
  redis.disconnect()
  await say({text: text, thread_ts: message.thread_ts})
});

(async () => {
  await app.start();
  console.log('⚡️ Bolt app is running!');
})();
