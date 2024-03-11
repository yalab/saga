import { App } from '@slack/bolt';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config'

const app = new App({"token": process.env.SLACK_BOT_TOKEN || '',
		     "signingSecret": process.env.SLACK_SIGNING_SECRET || '',
		     "appToken": process.env.SLACK_APP_TOKEN,
		     "socketMode": true,
		     "port": Number(process.env.PORT) || 3000});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });

app.message('hello', async ({ message, say }) => {
  const result = await model.generateContent('おはようございます');
  const response = await result.response;
  console.log();

  await say(response.text());
});

(async () => {
  await app.start();
  console.log('⚡️ Bolt app is running!');
})();
