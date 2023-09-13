const Broadcast = function (name) {
  this.id = Utils.guid();
  
  this.events = {};

  if (window.BroadcastChannel) {
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = function (event) {
      var data = JSON.parse(event.data);

      console.log('Broadcast recieve:', data);
  
      if (data.id !== this.id) {
        if (this.events[data.type]) {
          this.events[data.type].forEach(function (on) {
            on(data.message);
          });
        }
      }
    }.bind(this);
  }

  this.sendMessage = function (type, body) {
    if (window.BroadcastChannel) {
      var data = {
        id: this.id,
        type: type,
        message: body
      };

      console.log('Broadcast send:', data);

      this.channel.postMessage(JSON.stringify(data));
    }

    return this;
  }

  this.setOnMessage = function (type, on) {
    if (typeof on === 'function') {
      if (!this.events[type]) {
        this.events[type] = [];
      }

      this.events[type].push(on);
    }

    return this;
  }
}