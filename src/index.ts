import express from 'express';
import healthRouter from './routes/health';

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/health', healthRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
