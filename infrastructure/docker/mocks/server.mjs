import { createServer } from 'node:http';

const provider = process.env.MOCK_PROVIDER;
const port = Number(process.env.PORT ?? 8080);

if (provider !== 'sepay' && provider !== 'zalo') {
  throw new Error('MOCK_PROVIDER must be either sepay or zalo');
}

const responses = {
  sepay: {
    success: {
      provider: 'sepay-local-mock',
      status: 'success',
      transactionId: 'sepay-local-transaction-0001',
    },
    error: {
      provider: 'sepay-local-mock',
      status: 'error',
      code: 'SEPAY_LOCAL_TEST_ERROR',
    },
  },
  zalo: {
    success: {
      provider: 'zalo-local-mock',
      status: 'success',
      messageId: 'zalo-local-message-0001',
    },
    error: {
      provider: 'zalo-local-mock',
      status: 'error',
      code: 'ZALO_LOCAL_TEST_ERROR',
    },
  },
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(`${JSON.stringify(body)}\n`);
}

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { provider: `${provider}-local-mock`, status: 'ok' });
    return;
  }

  if (request.method === 'POST' && request.url === '/success') {
    request.resume();
    sendJson(response, 200, responses[provider].success);
    return;
  }

  if (request.method === 'POST' && request.url === '/error') {
    request.resume();
    sendJson(response, 422, responses[provider].error);
    return;
  }

  request.resume();
  sendJson(response, 404, {
    provider: `${provider}-local-mock`,
    status: 'error',
    code: 'NOT_FOUND',
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(JSON.stringify({ event: 'mock_started', provider, port }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ event: 'mock_stopping', provider, signal }));
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
