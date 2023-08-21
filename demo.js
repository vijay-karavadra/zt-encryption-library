const crypto = require('crypto-browserify');

async function runDemo() {
  // Generate Diffie-Hellman keys
  const alice = crypto.createDiffieHellman(256);
  const alicePublicKey = alice.generateKeys();

  const bob = crypto.createDiffieHellman(256);
  const bobPublicKey = bob.generateKeys();

  // Exchange public keys
  const aliceSharedSecret = alice.computeSecret(bobPublicKey);
  const bobSharedSecret = bob.computeSecret(alicePublicKey);

  // Simulate message encryption and transmission
  const message = 'Hello, Bob!';
  const iv = crypto.randomBytes(16);
  const aliceCipher = crypto.createCipheriv('aes-256-cbc', aliceSharedSecret, iv);
  const encryptedMessage = Buffer.concat([iv, aliceCipher.update(message, 'utf8'), aliceCipher.final()]);

  // Simulate receiving and decrypting the message
  const receivedIv = encryptedMessage.slice(0, 16);
  const receivedCipherText = encryptedMessage.slice(16);
  const bobDecipher = crypto.createDecipheriv('aes-256-cbc', bobSharedSecret, receivedIv);
  const decryptedMessage = bobDecipher.update(receivedCipherText) + bobDecipher.final();

  console.log('Original Message:', message);
  console.log('Encrypted Message:', encryptedMessage.toString('base64'));
  console.log('Decrypted Message:', decryptedMessage);
}

runDemo();