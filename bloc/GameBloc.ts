import { Subject, Observable } from 'rxjs';
import { SocketWrapper } from '../shared/SocketWrapper';
import { EventAction, GameData, Player } from '../shared/interfaces';

export class GameBloc {
  private socket: SocketWrapper;
  private gameData: GameData = {} as GameData;
  private playerData: Player = {} as Player;
  private _gameStream: Subject<GameData | any> = new Subject<GameData | any>();
  private _playerStream: Subject<Player> = new Subject<Player>();
  private _errorStream: Subject<Error> = new Subject<Error>();
  private _connectionStream: Subject<boolean> = new Subject<boolean>();

  constructor(socket: SocketWrapper) {
    this.socket = socket;
    this.socket.on('any', (event: any) => {
      const data = JSON.parse(event.data.toString());
      if (data.error || data.data.error) {
        this._errorStream.next(data);
        return;
      }
    });
    this.socket.on('game_data', (event: any) => {
      const data = JSON.parse(event.data.toString());
      this.gameData = data.data as GameData;
      this._gameStream.next(this.gameData);
    });
    this.socket.on('host', (event: any) => {
      const data = JSON.parse(event.data.toString());
      this.playerData = data.data.player as Player;
      this.gameData = data.data.game as GameData;
      this._playerStream.next(this.playerData);
      this._gameStream.next(this.gameData);
    });
    this.socket.on('join', (event: any) => {
      const data = JSON.parse(event.data.toString());
      this.playerData = data.data as Player;
      this._playerStream.next(this.playerData);
    });
    this.socket.on('open', () => {
      this._connectionStream.next(true);
    });
    this.socket.on('close', () => {
      this._connectionStream.next(false);
    });
  }

  get gameStream(): Observable<GameData> {
    return this._gameStream.asObservable();
  }

  get connectionStream(): Observable<boolean> {
    return this._connectionStream.asObservable();
  }

  get errorStream(): Observable<Error> {
    return this._errorStream.asObservable();
  }

  get playerStream(): Observable<Player> {
    return this._playerStream.asObservable();
  }

  closeConnection() {
    this.socket.close();
  }

  sendEvent(event: EventAction) {
    this.socket.emit(JSON.stringify(event));
  }
}
