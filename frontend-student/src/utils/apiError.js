const STATUS_MESSAGES = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested item was not found. It may have been removed or you may not have access.',
  408: 'The request took too long. Please try again.',
  409: 'This action could not be completed because of a conflict. Refresh the page and try again.',
  413: 'The file is too large to upload.',
  422: 'Some of the information provided is invalid. Please review and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our server. Please try again in a few minutes.',
  502: 'The server is temporarily unavailable. If you are running locally, make sure the backend is started and try again.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
  504: 'The server took too long to respond. Please try again.',
};

const NETWORK_MESSAGES = {
  ECONNABORTED: 'The request timed out. Please check your connection and try again.',
  ERR_NETWORK: 'Unable to reach the server. Check your internet connection and try again.',
};

/**
 * @param {unknown} data
 * @returns {string | null}
 */
function extractServerMessage(data) {
  if (!data) return null;

  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed || trimmed.startsWith('<')) return null;
    if (trimmed.length > 300) return null;
    return trimmed;
  }

  if (typeof data === 'object' && data !== null && typeof data.message === 'string') {
    const trimmed = data.message.trim();
    return trimmed || null;
  }

  return null;
}

/**
 * @param {import('axios').AxiosError} error
 * @returns {string}
 */
export function resolveApiErrorMessage(error) {
  const status = error.response?.status;
  const serverMessage = extractServerMessage(error.response?.data);

  if (serverMessage && !isGenericAxiosMessage(serverMessage)) {
    return serverMessage;
  }

  if (!error.response) {
    if (error.code && NETWORK_MESSAGES[error.code]) {
      return NETWORK_MESSAGES[error.code];
    }
    if (error.message === 'Network Error') {
      return NETWORK_MESSAGES.ERR_NETWORK;
    }
    return 'Unable to connect to the server. Please check your connection and try again.';
  }

  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  if (status) {
    return `Something went wrong while processing your request. Please try again.`;
  }

  return 'Something went wrong. Please try again.';
}

/**
 * @param {string} message
 */
function isGenericAxiosMessage(message) {
  return /^Request failed with status code \d+$/i.test(message);
}

/**
 * @param {import('axios').AxiosError} error
 */
export function normalizeApiError(error) {
  return {
    message: resolveApiErrorMessage(error),
    statusCode: error.response?.status ?? null,
    isNetworkError: !error.response,
    errors: error.response?.data?.errors ?? [],
  };
}
