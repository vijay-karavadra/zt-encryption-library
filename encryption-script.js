// encryption-library.js
(async function() {
  async function encryptData(data) {
    // Implement your encryption logic here (e.g., using secure libraries and shared secret)
    // For demonstration purposes, we'll use a simple Base64 encoding
    //let encoder = new TextEncoder();
    //let encryptedData = btoa(encoder.encode(data));

    //return encryptedData;
	return data;
  }

  function interceptXHRRequests() {
    let open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      this._url = url;
      open.call(this, method, url, async, user, password);
    };

    let send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(data) {
      if (this.method === 'POST' && this.setRequestHeader) {
        // Encrypt request data before sending to the API
        let requestData = JSON.parse(data);
        encryptData(JSON.stringify(requestData))
          .then((encryptedData) => {
            // Replace the original request body with the encrypted data
			console.log('logger:encryption-library, encrypted data: '+ encryptedData);
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
  }

  interceptXHRRequests();
})();