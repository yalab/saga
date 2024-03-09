import { App } from '@slack/bolt';
import 'dotenv/config'

const app = new App({"token": process.env.SLACK_BOT_TOKEN || '',
		     "signingSecret": process.env.SLACK_SIGNING_SECRET || '',
		     "appToken": process.env.SLACK_APP_TOKEN,
		     "socketMode": true,
		     "port": Number(process.env.PORT) || 3000});

app.message('hello', async ({ message, say }) => {
  console.log(message)
  await say(`Hey guys!`);
});


(async () => {
  await app.start();
  console.log('⚡️ Bolt app is running!');
})();
