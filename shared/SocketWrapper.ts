export class SocketWrapper {
  private socket: WebSocket;

  constructor(socket: WebSocket) {
    this.socket = socket;
  }

  on(action: string, callback: (event: any) => any) {
    switch (action) {
      case 'open':
        this.socket.addEventListener('open', (event) => callback(event));
        break;
      case 'close':
        this.socket.addEventListener('close', (event) => callback(event));
        break;
      case 'error':
        this.socket.addEventListener('error', (error) => callback(error));
        break;
      default:
        this.socket.addEventListener('message', (event) => {
          var data = JSON.parse(event.data.toString());
          if (action == 'any') {
            callback(event);
            console.log('Received:', data);
          } else if (data.action == action) {
            callback(event);
            console.log('Received:', data);
          }
        });
    }
  }

  close() {
    this.socket.close();
  }

  emit(data: any) {
    this.socket.send(data);
  }
}
