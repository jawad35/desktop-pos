// test-simple.js
import { google } from 'googleapis';
import readline from 'readline';
import http from 'http';
import url from 'url';
import open from 'open';

const CLIENT_ID = '';
const CLIENT_SECRET = '';
const REDIRECT_URI = 'http://localhost:3000';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
});

console.log('Opening browser for authentication...');
open(authUrl);

// Create a simple server to catch the redirect
const server = http.createServer(async (req, res) => {
    const query = url.parse(req.url, true).query;
    
    if (query.code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authentication successful! You can close this window.</h1>');
        
        const { tokens } = await oauth2Client.getToken(query.code);
        console.log('✅ Success! Tokens:', tokens);
        
        server.close();
        process.exit(0);
    }
});

server.listen(3000, () => {
    console.log('Waiting for authentication callback...');
});