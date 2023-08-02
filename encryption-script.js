// encryption-library.js

async function encryptData(data) {
  // Implement your encryption logic here
  // For demonstration purposes, we'll use a basic Caesar cipher encryption
  let encryptedData = "";
  let shift = 3; // The number of positions to shift each character

  for (let i = 0; i < data.length; i++) {
    let char = data[i];

    // Shift only alphabetic characters (uppercase and lowercase)
    if (/[a-zA-Z]/.test(char)) {
      let code = char.charCodeAt(0);
      let shiftedCode = code + shift;

      // Handle wrap-around for lowercase letters
      if (char >= 'a' && char <= 'z' && shiftedCode > 'z'.charCodeAt(0)) {
        shiftedCode -= 26;
      }

      // Handle wrap-around for uppercase letters
      if (char >= 'A' && char <= 'Z' && shiftedCode > 'Z'.charCodeAt(0)) {
        shiftedCode -= 26;
      }

      encryptedData += String.fromCharCode(shiftedCode);
    } else {
      // Leave non-alphabetic characters unchanged
      encryptedData += char;
    }
  }

  return encryptedData;
}


async function decryptData(data) {
  // Implement your decryption logic here
  // For demonstration purposes, we'll use the reverse Caesar cipher decryption
  let decryptedData = "";
  let shift = 3; // The number of positions to shift each character

  for (let i = 0; i < data.length; i++) {
    let char = data[i];

    // Shift only alphabetic characters (uppercase and lowercase)
    if (/[a-zA-Z]/.test(char)) {
      let code = char.charCodeAt(0);
      let shiftedCode = code - shift;

      // Handle wrap-around for lowercase letters
      if (char >= 'a' && char <= 'z' && shiftedCode < 'a'.charCodeAt(0)) {
        shiftedCode += 26;
      }

      // Handle wrap-around for uppercase letters
      if (char >= 'A' && char <= 'Z' && shiftedCode < 'A'.charCodeAt(0)) {
        shiftedCode += 26;
      }

      decryptedData += String.fromCharCode(shiftedCode);
    } else {
      // Leave non-alphabetic characters unchanged
      decryptedData += char;
    }
  }

  return decryptedData;
}



// ... Your encryptData and decryptData functions ...

function interceptXHRRequests() {
  let open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._url = url;
    this._method = method; // Store the request method in _method property
    open.call(this, method, url, async, user, password);
  };

  let send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(data) {
    console.log('intercepted the request.');

    if (this._method === 'POST') { // Check the _method property for POST
      console.log('inside if post.');

      // Encrypt request data before sending to the API
      let requestData = JSON.parse(data);

	  console.log('Request, before encryption:');
	  console.log(requestData);
	  
      encryptData(JSON.stringify(requestData))
        .then((encryptedData) => {
          // Set a custom header for the encrypted data
          this.setRequestHeader('X-Encrypted-Data', 'true');

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
		//&&
        //this.getRequestHeader('X-Encrypted-Data') === 'true'
		) {
		
	  console.log('success');
		
	  console.log('Response, before decryption:');
      console.log(this.responseText);

      // Decrypt the response data if it's not null or undefined
      let decryptedResponse = this.responseText ? decryptData(this.responseText) : null;

      // Replace the original response data with the decrypted data
      this.responseText = decryptedResponse;
		
	  

      // Log the decrypted response data (optional, for debugging purposes)
      console.log('Response, after decryption:');
      console.log(decryptedResponse);
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
