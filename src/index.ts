import 'dotenv/config';
import app from './app';

if (require.main === module) {
  const listenPort = Number(process.env.PORT ?? 4000); //change port
  app.listen(listenPort, () => console.log(`Server listening on port ${listenPort}`));
}
