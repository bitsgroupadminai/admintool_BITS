const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {() => Promise<{ data: { data: { user: unknown } } }>} request
 * @param {(user: unknown) => boolean} [validateUser]
 * @param {number} [retries]
 */
export async function bootstrapSession(request, validateUser, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { data } = await request();
      const user = data.data.user;

      if (validateUser && !validateUser(user)) {
        return { user: null, isAuthenticated: false };
      }

      return { user, isAuthenticated: Boolean(user) };
    } catch (err) {
      if (err?.statusCode === 401) {
        return { user: null, isAuthenticated: false };
      }

      if (attempt < retries) {
        await sleep(350 * (attempt + 1));
        continue;
      }

      throw err;
    }
  }

  return { user: null, isAuthenticated: false };
}
