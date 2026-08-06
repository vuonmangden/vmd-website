import { createServer } from 'node:http';

const responses = {
  sepay: {
    success: { provider: 'sepay-local-mock', status: 'success', transactionId: 'sepay-local-transaction-0001' },
    error: { provider: 'sepay-local-mock', status: 'error', code: 'SEPAY_LOCAL_TEST_ERROR' },
  },
  zalo: {
    success: { provider: 'zalo-local-mock', status: 'success', messageId: 'zalo-local-message-0001' },
    error: { provider: 'zalo-local-mock', status: 'error', code: 'ZALO_LOCAL_TEST_ERROR' },
  },
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(`${JSON.stringify(body)}\n`);
}

export function createMockServer(provider) {
  if (provider !== 'sepay' && provider !== 'zalo') throw new Error('provider must be either sepay or zalo');
  return createServer((request, response) => {
    request.resume();
    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, { provider: `${provider}-local-mock`, status: 'ok' });
    } else if (request.method === 'POST' && request.url === '/success') {
      sendJson(response, 200, responses[provider].success);
    } else if (request.method === 'POST' && request.url === '/error') {
      sendJson(response, 422, responses[provider].error);
    } else {
      sendJson(response, 404, { provider: `${provider}-local-mock`, status: 'error', code: 'NOT_FOUND' });
    }
  });
}
