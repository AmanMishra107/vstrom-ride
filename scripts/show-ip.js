// ============================================================
// V-Strom Ride OS — Mobile Network IP & QR Code Utility
// ============================================================

import os from 'os';
import QRCode from 'qrcode';

function getLocalIpAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip internal (127.0.0.1) and non-ipv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        // Prioritize standard local Wi-Fi / LAN ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const isLan = net.address.startsWith('192.168.') ||
                      net.address.startsWith('10.') ||
                      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(net.address);
        addresses.push({ name, address: net.address, isLan });
      }
    }
  }

  // Sort LAN addresses first
  addresses.sort((a, b) => (b.isLan ? 1 : 0) - (a.isLan ? 1 : 0));
  return addresses;
}

const port = process.env.PORT || (process.argv.includes('--dev') ? 5173 : 4173);
const isHttps = true; // default to https for mobile GPS
const protocol = isHttps ? 'https' : 'http';

const interfaces = getLocalIpAddresses();
const primaryIp = interfaces[0]?.address || 'localhost';
const mobileUrl = `${protocol}://${primaryIp}:${port}`;

console.log('\n============================================================');
console.log('🏍️  V-STROM RIDE OS — MOBILE NETWORK CONNECT');
console.log('============================================================\n');

console.log(`📱 Scan this QR Code with your smartphone camera to connect:\n`);

QRCode.toString(mobileUrl, { type: 'terminal', small: true }, (err, qr) => {
  if (!err) {
    console.log(qr);
  }

  console.log(`\n🔗 Primary Mobile URL:`);
  console.log(`   \x1b[36m\x1b[1m${mobileUrl}\x1b[0m\n`);

  if (interfaces.length > 1) {
    console.log('Available Network Interfaces:');
    for (const iface of interfaces) {
      console.log(`   - ${iface.name}: ${protocol}://${iface.address}:${port}`);
    }
    console.log('');
  }

  console.log('💡 TIP FOR MOBILE GPS TRACKING:');
  console.log('   - For native GPS on phone, run: \x1b[32mnpm run dev:https\x1b[0m');
  console.log('   - If connecting via plain HTTP, Android Chrome requires:');
  console.log(`     chrome://flags/#unsafely-treat-insecure-origin-as-secure -> add ${mobileUrl}`);
  console.log('============================================================\n');
});
