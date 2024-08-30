export class SocketWrapper {
  private SOCKET_URL = 'wss://h9qktxoj4a.execute-api.sa-east-1.amazonaws.com/dev';
  public socket: WebSocket;

  constructor() {
    this.socket = new WebSocket(this.SOCKET_URL);
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

  connect() {
    this.socket = new WebSocket(this.SOCKET_URL);
  }

  emit(data: any) {
    console.log('Sended:', JSON.parse(data));
    this.socket.send(data);
  }
}
