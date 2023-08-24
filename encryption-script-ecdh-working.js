// encryption-library.js
const crypto = require('crypto-browserify');
const elliptic = require('elliptic');
const Buffer = require('buffer').Buffer; // Require the 'buffer' package
const axios = require('axios');

window.Buffer = Buffer;
let iv;
let sharedSecretHex;

// Create a function to send a POST request using XMLHttpRequest
function sendPostRequest(url, data) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = false;

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error('Request failed with status ${xhr.status}: ${xhr.statusText}'));
      }
    };

    xhr.onerror = function () {
      reject(new Error('Network error'));
    };

    xhr.send(JSON.stringify(data));
  });
}

// working
async function performKeyExchange(host) {
  const alice = crypto.createECDH('prime256v1');
  const alicePublicKey = alice.generateKeys('base64');
  
  axios.defaults.withCredentials = false;
  axios.defaults.headers.post['Content-Type'] ='application/json';

  console.log('Initiating handshake.');
  console.log('Generated client\'s Public Key: '+ alicePublicKey);
  console.log('Sending handshake request with client\'s Public Key in Request.');
  const responseText = await sendPostRequest(
  host+'/api/handshake/key-exchange'
  //'https://localhost:7179/api/handshake/key-exchange'
  //'https://customers-central-vm-5.zta-gateway.com/api/handshake/key-exchange'
  , { alicePublicKey });
  const response = JSON.parse(responseText);

  const adjustedBobPublicKeyHex = response.bobPublicKeyHex;

	const aliceSharedSecretHex = alice.computeSecret(adjustedBobPublicKeyHex, 'base64', 'hex');
	console.log('Received Server\'s public key: ' + adjustedBobPublicKeyHex);
	console.log('Shared Secret Computed: ', aliceSharedSecretHex.toString('hex'));
	console.log('Handshake completed.');
  return aliceSharedSecretHex.toString('hex');
}

async function encryptData(data, host, iv) {
  if (!sharedSecretHex) {
	// Perform the key exchange with the server if the shared secret is not available
	sharedSecretHex = await performKeyExchange(host);
  }
  const aliceSharedSecret = Buffer.from(sharedSecretHex, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', aliceSharedSecret, iv);
  cipher.setAutoPadding(true); // Ensure PKCS7 padding
  const encryptedMessage = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const encryptedMessageBase64 = encryptedMessage.toString('base64');
  return encryptedMessageBase64;
}

function interceptXHRRequests() {
   let open = XMLHttpRequest.prototype.open;
   XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
     this._url = url;
     this._method = method; // Store the request method in _method property
	 this._host = new URL(url).host; // Store the host information
     this._scheme = new URL(url).protocol.replace(':', ''); // Store the scheme without the colon

	 // Add condition to check if the URL matches the specific API path for key exchange
     if (url.includes('api/handshake/key-exchange')) {
     this._isKeyExchange = true;
     } else {
     this._isKeyExchange = false;
     }
	
     open.call(this, method, url, async, user, password);
   };

   let send = XMLHttpRequest.prototype.send;
   XMLHttpRequest.prototype.send = function(data) {
     console.log('intercepted the request.');

     if (this._method === 'POST' && !this._isKeyExchange) { // Check the _method property for POST
       console.log('inside if post.');

       // Encrypt request data before sending to the API
       let requestData = JSON.parse(data);

	   console.log('Request, before encryption:');
	   console.log(requestData);
	   const iv = crypto.randomBytes(16);
	   const host = `${this._scheme}://${this._host}`;
       encryptData(JSON.stringify(requestData), host, iv)
         .then((encryptedData) => {
          // Set a custom header for the encrypted data
          this.setRequestHeader('X-Encrypted-Data', 'true');
		  this.setRequestHeader('X-IV',iv.toString('base64'))
		  console.log('Request, after encryption:');
          // Replace the original request body with the encrypted data
          console.log(encryptedData);
          send.call(this, encryptedData);
        })
        .catch((error) => {
           console.error(error);

           // Call the original 'send' function with the original data
           send.call(this, data);
        });
     } else {
       // Call the original 'send' function for other types of requests
       send.call(this, data);
     }
   };

  // Create a wrapper function to handle the response
  function handleResponse() {
    if (this.readyState === XMLHttpRequest.DONE && this.getResponseHeader('content-type')?.startsWith('application/json')
		// &&
        // this.getRequestHeader('X-Encrypted-Data') === 'true'
		 ) {
		
	   console.log('success');
		
	   // console.log('Response, before decryption:');
       // console.log(this.responseText);

      // // Decrypt the response data if it's not null or undefined
      // let decryptedResponse = this.responseText ? decryptData(this.responseText) : null;
	  
      // // Replace the original response data with the decrypted data
      // this.responseText = decryptedResponse;
		
	  
	  
      // Log the decrypted response data (optional, for debugging purposes)
      console.log('Response, from server:');
      console.log(this.responseText);
     }
   }

   // Listen for the 'load' event to handle the response
   let originalOpen = XMLHttpRequest.prototype.open;
   XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
     this.addEventListener('load', handleResponse); // Add the event listener for 'load' event
     originalOpen.call(this, method, url, async, user, password);
   };
}

interceptXHRRequests();

console.log('zt encryption script loaded.');



// Function to derive encryption key from shared secret
// function deriveKeyFromSecret(secret) {
  // const hash = crypto.createHash('sha256');
  // hash.update(secret);
  // return hash.digest();
// }

// async function startHandshakeAndSendMessage() {
  // let aliceSharedSecretHex = await performKeyExchange();

  // // Continue with encryption and sending of the message
  // const message = 'Hello, Server! I\'m JavaScript.';
  // const iv = crypto.randomBytes(16);
  
    // const aliceSharedSecret = Buffer.from(aliceSharedSecretHex, 'hex');
  // const aliceEncryptionKey = deriveKeyFromSecret(aliceSharedSecret);

  // //console.log('Alice Encryption Key:', aliceEncryptionKey.toString('hex')); // Log the encryption key
  
  // const cipher = crypto.createCipheriv('aes-256-cbc', 
  // //aliceEncryptionKey, 
  // aliceSharedSecret,
  // iv);
  // cipher.setAutoPadding(true); // Ensure PKCS7 padding
  // const encryptedMessage = Buffer.concat([cipher.update(message, 'utf8'), cipher.final()]);

  // const encryptedMessageBase64 = encryptedMessage.toString('base64');
  // // const ivBase64 = iv.toString('base64');
  // // Use the raw 16-byte IV, without base64 encoding
  // const ivBytes = iv;
  // console.log('_____________________________________________');
  // console.log('');
  // console.log('Sending actual API request to the server.');
  // console.log('Actual message: ' + message);
  // console.log('Encrypted message: ' + encryptedMessageBase64);
  
  // // Send the encrypted message and IV to the .NET API for decryption
  // try {
  // const responseText = await sendPostRequest(
  // //'https://localhost:7179/api/handshake/decrypt-message'
  // 'https://customers-central-vm-5.zta-gateway.com/api/handshake/decrypt-message'
  // , {
    // encryptedMessage: encryptedMessageBase64,
    // iv: ivBytes.toString('base64')
  // });

  // console.log('Received response from Server.')
  // // const response = JSON.parse(responseText);
  // console.log('Decrypted Message from Server:', responseText);
  // console.log('Request completed successfully.');
// } catch (error) {
  // console.error('Error decrypting message:', error);
// }

// }

// startHandshakeAndSendMessage();
