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
      encryptData(JSON.stringify(requestData))
        .then((encryptedData) => {
          // Replace the original request body with the encrypted data
          console.log('logger:encryption-library, encrypted data: ' + encryptedData);
          send.call(this, encryptedData);

          // Set a custom header for the encrypted data
          this.setRequestHeader('X-Encrypted-Data', 'true');
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
}


interceptXHRRequests();

console.log('zt encryption script loaded.');