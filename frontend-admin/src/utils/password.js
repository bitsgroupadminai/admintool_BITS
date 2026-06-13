/**
 * Generate a random password for staff accounts.
 * @param {number} [length=12]
 */
export function generatePassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%&*';
  const all = lowercase + uppercase + digits + symbols;

  const required = [
    lowercase[randomIndex(lowercase.length)],
    uppercase[randomIndex(uppercase.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ];

  const rest = Array.from({ length: length - required.length }, () =>
    all[randomIndex(all.length)],
  );

  const chars = [...required, ...rest];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * @param {number} max
 */
function randomIndex(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}
