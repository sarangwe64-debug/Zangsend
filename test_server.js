// Test the local server directly (not Apify, not browser)
const TEST_URL = 'https://www.linkedin.com/in/williamhgates/';

async function main() {
  console.log('Step 1: Checking if local server is running...');
  try {
    const ping = await fetch('http://127.0.0.1:54321/health');
    console.log('Health check:', ping.status, await ping.text());
  } catch (err) {
    console.error('❌ LOCAL SERVER IS NOT RUNNING:', err.message);
    console.log('\nFix: Open a terminal in the app folder and run: npm run dev');
    return;
  }

  console.log('\nStep 2: Sending find-email request to local server...');
  try {
    const res = await fetch('http://127.0.0.1:54321/functions/v1/find-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: TEST_URL })
    });
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Request failed:', err.message);
  }
}

main();
