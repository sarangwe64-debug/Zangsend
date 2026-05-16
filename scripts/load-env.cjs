const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name} in .env`);
    process.exit(1);
  }
  return value;
};
