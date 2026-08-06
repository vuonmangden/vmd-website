import { createMockServer } from './mock-app.mjs';

const provider = process.env.MOCK_PROVIDER;
const port = Number(process.env.PORT ?? 8080);

const server = createMockServer(provider);

server.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'mock_started', provider, port }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ event: 'mock_stopping', provider, signal }));
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
