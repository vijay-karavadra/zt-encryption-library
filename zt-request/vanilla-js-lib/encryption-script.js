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

// Function to check if a property needs to be encrypted
function shouldEncryptProperty(propertyName, schema) {
  const propertyNames = propertyName.split('.');
  let currentSchema = schema;
  for (const name of propertyNames) {
    if (currentSchema[name] === undefined) {
	  console.log('Property name: '+name+'should encrypt property: false')
      return false;
    }
    currentSchema = currentSchema[name];
  }
  
  const result =  currentSchema === true;
  console.log('Property name: '+propertyName+'. should encrypt property: '+result);
  return result;
}

// Function to recursively encrypt properties based on the schema
async function encryptProperties(data, schema, host, iv) {
  for (const key in data) {
    if (schema[key] !== undefined) {
      if (typeof data[key] === 'object' && typeof schema[key] === 'object') {
        data[key] = await encryptProperties(data[key], schema[key], host, iv);
      } else if (shouldEncryptProperty(key, schema)) {
        // Encrypt only if the schema value is true
        data[key] = await encryptData(data[key], host, iv);
      }
    }
  }
  return data;
}

// Fetch encryption schema from API
async function fetchEncryptionSchema(userId) {
  try {
    const response = await axios.get(`https://localhost:7180/api/EncryptionSettings/apis?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching encryption schema:', error);
    return [];
  }
}

function interceptXHRRequests() {
   let open = XMLHttpRequest.prototype.open;
   XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
     this._url = url;
     this._method = method; // Store the request method in _method property
	 this._host = new URL(url).host; // Store the host information
     this._scheme = new URL(url).protocol.replace(':', ''); // Store the scheme without the colon
	 this._relativePath = new URL(url).pathname; // Store the relative path of the request

	 // Add condition to check if the URL matches the specific API path for key exchange
     if (url.includes('api/handshake/key-exchange') || url.includes('api/EncryptionSettings/apis')) {
		this._isInternalApi = true;
     }
	 else {
		this._isInternalApi = false;
     }
	
	 
     open.call(this, method, url, async, user, password);
   };

   let send = XMLHttpRequest.prototype.send;
   XMLHttpRequest.prototype.send = function(data) {
     console.log('intercepted the request.');

     if (this._method === 'POST' && !this._isInternalApi) { // Check the _method property for POST
       console.log('Inside if POST. Relative Path:', this._relativePath);

       // Encrypt request data before sending to the API
       let requestData = JSON.parse(data);

		// Fetch encryption schema for the user
		const userId = 'vijay1'; // Replace with actual user ID
		// const encryptionSchema = await fetchEncryptionSchema(userId);

   // Fetch encryption schema for the user using Promise and then syntax
       fetchEncryptionSchema(userId).then(encryptionSchema => {
		   
         const matchingSchema = encryptionSchema.find(schema =>
           schema.httpMethod === this._method &&
           schema.absoluteRequestUrl === this._url
         );

         if (matchingSchema) {
				   // Encrypt properties according to the encryption schema
				console.log('matching schema: ' + JSON.stringify(matchingSchema));
			   console.log('Request, before encryption:');
			   console.log(data);
			   const iv = crypto.randomBytes(16);
			   const host = `${this._scheme}://${this._host}`;

				 encryptProperties(requestData, JSON.parse(matchingSchema.bodyEncryptionSchema), host, iv)
				 .then(encryptedData => {
				   this.setRequestHeader('X-Encrypted-Data', 'true');
				   this.setRequestHeader('X-IV', iv.toString('base64'));
				   this.setRequestHeader('X-ZT-UID', userId);
				   console.log('Request, after encryption:');
				   var encryptedDataJson = JSON.stringify(encryptedData);
				   console.log(encryptedDataJson);
				   send.call(this, encryptedDataJson);
				 })
				 .catch(error => {
				   console.error('Error encrypting data:', error);
				   send.call(this, data);
				 });
			 
         }
		 else {
           // No matching schema found, send the original data
           send.call(this, data);
         }
       }).catch(error => {
         console.error('Error fetching encryption schema:', error);
         // Call the original 'send' function with the original data
         send.call(this, data);
       });











       // encryptData(JSON.stringify(requestData), host, iv)
         // .then((encryptedData) => {
          // // Set a custom header for the encrypted data
          // this.setRequestHeader('X-Encrypted-Data', 'true');
		  // this.setRequestHeader('X-IV',iv.toString('base64'))
		  // console.log('Request, after encryption:');
          // // Replace the original request body with the encrypted data
          // console.log(encryptedData);
          // send.call(this, encryptedData);
        // })
        // .catch((error) => {
           // console.error(error);

           // // Call the original 'send' function with the original data
           // send.call(this, data);
        // });
		
		
     } else {
		 console.log('Inside else POST. Relative Path:', this._relativePath);
       // Call the original 'send' function for other types of requests
       send.call(this, data);
     }
   };

  // Create a wrapper function to handle the response
  function handleResponse() {
    if (this.readyState === XMLHttpRequest.DONE && this.getResponseHeader('content-type')?.startsWith('application/json')
		 ) {
		
	   console.log('success');
		
	  
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