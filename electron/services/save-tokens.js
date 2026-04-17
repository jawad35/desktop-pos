// electron/save-tokens.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokens = {
  access_token: 'ya29.a0Aa7MYipGw2cHxWXXyYaHNLciUuVh_7752IF6XMG5hxsumHlgyovXHCJs79qzKwMOS-AS-7cx9L1hfEmthKYjbALocvKpVQF7SGB_gTuorirLWky3GIzZeoqvpPTxGutIwO_Tk2OK1LjSs2f9P0wLC04zLaBvSSoxE5X8efSM8rxQp7dDGjX_tBoEKBflfZ2XRlA7qDUaCgYKAVUSARISFQHGX2MiyKkrjMLM2cQ4unHpx67VZQ0206',
  refresh_token: '1//03TasjL4nOIxWCgYIARAAGAMSNwF-L9IrOtoVBkfIUldC1w6hDLz5xgJdFn0elE0qRsZU5JiywoV5T-G_q7GdQwp895gWA0R_ttY',
  scope: 'https://www.googleapis.com/auth/drive.file',
  token_type: 'Bearer',
  refresh_token_expires_in: 604799,
  expiry_date: 1776335780950
};

// Save tokens to a file
const tokensPath = path.join(__dirname, 'google-drive-tokens.json');
fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
console.log(`✅ Tokens saved to ${tokensPath}`);