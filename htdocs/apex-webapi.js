class SendBuffer {
  static #totalsequence = 1; // 0x00000001 ~ 0xffffffff
  #buffer;
  constructor(eventtype) {
    this.#buffer = (new Uint8Array([eventtype, 1, ApexWebAPI.WEBAPI_DATA_UINT32, 0, 0, 0, 0])).buffer;
    const view = new DataView(this.#buffer);
    view.setUint32(3, SendBuffer.#totalsequence & 0xffffffff, true);
    SendBuffer.#totalsequence = ((SendBuffer.#totalsequence + 1) & 0xffffffff);
    if (SendBuffer.#totalsequence == 0) SendBuffer.#totalsequence = 1;
  }

  // copy version
  // TODO: if CEF version up, use ArrayBuffer.resize().
  #resize(newsize) {
    const u8array = new Uint8Array(newsize);
    u8array.set(new Uint8Array(this.#buffer));
    this.#buffer = u8array.buffer;
  }

  #countup() {
    const view = new DataView(this.#buffer);
    view.setUint8(1, view.getUint8(1) + 1);
  }

  #settype(offset, datatype) {
    const view = new DataView(this.#buffer);
    view.setUint8(offset, datatype);
  }

  append(datatype, data, encoder = null) {
    const len = this.#buffer.byteLength;
    switch (datatype) {
      case ApexWebAPI.WEBAPI_DATA_BOOL: {
          if (typeof(data) !== "boolean") return false;
          const newlen = len + 1 + 1;
          this.#resize(newlen);
          this.#countup();
          this.#settype(len, ApexWebAPI.WEBAPI_DATA_BOOL);
          const view = new DataView(this.#buffer);
          view.setUint8(len + 1, data ? 1 : 0);
          break;
        }
      case ApexWebAPI.WEBAPI_DATA_UINT8: {
        if (typeof(data) !== "number") return false;
        const newlen = len + 1 + 1;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_UINT8);
        const view = new DataView(this.#buffer);
        view.setUint8(len + 1, data & 0xff);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_UINT16: {
        if (typeof(data) !== "number") return false;
        const newlen = len + 1 + 2;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_UINT16);
        const view = new DataView(this.#buffer);
        view.setUint16(len + 1, data & 0xffff, true);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_UINT32: {
        if (typeof(data) !== "number") return false;
        const newlen = len + 1 + 4;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_UINT32);
        const view = new DataView(this.#buffer);
        view.setUint32(len + 1, data & 0xffffffff, true);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_UINT64: {
        if (typeof(data) === "number") data = BigInt(data);
        if (typeof(data) !== "bigint") return false;
        const newlen = len + 1 + 8;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_UINT64);
        const view = new DataView(this.#buffer);
        view.setBigUint64(len + 1, data & 0xffffffffffffffffn, true);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_INT8: {
        if (typeof(data) !== "number") return false;
        const newlen = len + 1 + 1;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_INT8);
        const view = new DataView(this.#buffer);
        view.setInt8(len + 1, data);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_INT16: {
        if (typeof(data) !== "number") return false;
        const newlen = len + 1 + 2;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_INT16);
        const view = new DataView(this.#buffer);
        view.setInt16(len + 1, data, true);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_INT32: {
        if (typeof(data) !== "number") return false;
        const newlen = len + 1 + 4;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_INT32);
        const view = new DataView(this.#buffer);
        view.setInt32(len + 1, data, true);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_INT64: {
        if (typeof(data) === "number") data = BigInt(data);
        if (typeof(data) !== "bigint") return false;
        const newlen = len + 1 + 8;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_INT64);
        const view = new DataView(this.#buffer);
        view.setBigInt64(len + 1, data, true);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_FLOAT32: {
        if (typeof(data) !== "number") return false;
        const newlen = len + 1 + 4;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_FLOAT32);
        const view = new DataView(this.#buffer);
        view.setFloat32(len + 1, data, true);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_FLOAT64: {
        if (typeof(data) !== "number") return false;
        const newlen = len + 1 + 8;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_FLOAT64);
        const view = new DataView(this.#buffer);
        view.setFloat64(len + 1, data, true);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_STRING: {
        if (typeof(data) != "string") return false;
        const s = encoder.encode(data);
        if (s.length > 0xff) return false;
        const newlen = len + 1 + 1 + s.byteLength;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_STRING);
        const view = new DataView(this.#buffer);
        view.setUint8(len + 1, s.byteLength);
        new Uint8Array(this.#buffer).set(s, len + 2);
        break;
      }
      case ApexWebAPI.WEBAPI_DATA_JSON: {
        if (typeof(data) != 'object') return false;
        if (Object.prototype.toString.call(data) != '[object Object]') return false;
        const s = encoder.encode(JSON.stringify(data));
        if (s.byteLength > 0x00ffffff) return false;
        const newlen = len + 1 + 4 + s.byteLength;
        this.#resize(newlen);
        this.#countup();
        this.#settype(len, ApexWebAPI.WEBAPI_DATA_JSON);
        const view = new DataView(this.#buffer);
        view.setUint32(len + 1, s.byteLength, true);
        new Uint8Array(this.#buffer).set(s, len + 5);
        break;
      }
      default:
        break;
    }
    return true;
  }

  sequence() {
    return (new DataView(this.#buffer)).getUint32(3, true);
  }

  get() {
    return this.#buffer;
  }
}

class Game {
  state = "";
  teams = [];
  observers = [];
  map = "";
  playlistname = "";
  playlistdesc = "";
  datacenter = "";
  aimassiston = false;
  anonymousmode = false;
  serverid = "";
  kills = [];
  playerindex = {};
  start = 0;
  end = 0;
  constructor() {
  }
}

export class ApexWebAPI extends EventTarget {
  // 定数系
  static WEBAPI_EVENT_OBSERVERSWITCHED = 0x01;
  static WEBAPI_EVENT_MATCHSETUP_MAP = 0x02;
  static WEBAPI_EVENT_MATCHSETUP_PLAYLIST = 0x03;
  static WEBAPI_EVENT_MATCHSETUP_DATACENTER = 0x04;
  static WEBAPI_EVENT_MATCHSETUP_AIMASSISTON = 0x05;
  static WEBAPI_EVENT_MATCHSETUP_ANONYMOUSMODE = 0x06;
  static WEBAPI_EVENT_MATCHSETUP_SERVERID = 0x07;
  static WEBAPI_EVENT_GAMESTATECHANGED = 0x08;
  static WEBAPI_EVENT_MATCHSTATEEND_WINNERDETERMINED = 0x09; // WinnerDetermined
  static WEBAPI_EVENT_INIT_CAMERA = 0x0a;

  static WEBAPI_EVENT_PLAYERCONNECTED = 0x10;
  static WEBAPI_EVENT_PLAYERDISCONNECTED = 0x11;
  static WEBAPI_EVENT_PLAYERABILITYUSED = 0x12;
  static WEBAPI_EVENT_SQUADELIMINATED = 0x13;

  static WEBAPI_EVENT_CLEAR_LIVEDATA = 0x14;
  static WEBAPI_EVENT_SAVE_RESULT = 0x15;
  static WEBAPI_EVENT_RINGINFO = 0x16;
  static WEBAPI_EVENT_PLAYERULTIMATECHARGED = 0x17;

  static WEBAPI_EVENT_TEAM_NAME = 0x20;
  static WEBAPI_EVENT_TEAM_PLACEMENT = 0x21;
  static WEBAPI_EVENT_TEAM_RESPAWN = 0x22;

  static WEBAPI_EVENT_PLAYER_ID = 0x30;
  static WEBAPI_EVENT_PLAYER_NAME = 0x31;
  static WEBAPI_EVENT_PLAYER_HP = 0x32;
  static WEBAPI_EVENT_PLAYER_SHIELD = 0x33;
  static WEBAPI_EVENT_PLAYER_POS = 0x34;
  static WEBAPI_EVENT_PLAYER_STATE = 0x35;
  static WEBAPI_EVENT_PLAYER_STATS = 0x36;
  static WEBAPI_EVENT_PLAYER_DAMAGE = 0x37;
  static WEBAPI_EVENT_PLAYER_CHARACTER = 0x38;
  static WEBAPI_EVENT_PLAYER_ITEMS = 0x39;
  static WEBAPI_EVENT_PLAYER_KILLED = 0x3a;
  static WEBAPI_EVENT_PLAYER_KILLED_COUNT = 0x3b;
  static WEBAPI_EVENT_PLAYER_LEVEL = 0x3c;
  static WEBAPI_EVENT_PLAYER_PERK = 0x3d;
  static WEBAPI_EVENT_PLAYER_WEAPON = 0x3e;
  static WEBAPI_EVENT_EXTENDED = 0x3f;

  static WEBAPI_EVENT_LOBBYPLAYER = 0x40;
  static WEBAPI_EVENT_CUSTOMMATCH_SETTINGS = 0x41;
  static WEBAPI_EVENT_LOBBYENUM_START = 0x42;
  static WEBAPI_EVENT_LOBBYENUM_END = 0x43;
  static WEBAPI_EVENT_LOBBYTEAM = 0x44;

  static WEBAPI_SEND_CUSTOMMATCH_SENDCHAT = 0x50;
  static WEBAPI_SEND_CUSTOMMATCH_CREATELOBBY = 0x51;
  static WEBAPI_SEND_CUSTOMMATCH_GETLOBBYPLAYERS = 0x52;
  static WEBAPI_SEND_CUSTOMMATCH_SETSETTINGS = 0x53;
  static WEBAPI_SEND_CHANGECAMERA = 0x54;
  static WEBAPI_SEND_CUSTOMMATCH_SETTEAMNAME = 0x55;
  static WEBAPI_SEND_PAUSETOGGLE = 0x56;
  static WEBAPI_SEND_CUSTOMMATCH_GETSETTINGS = 0x57;
  static WEBAPI_SEND_CUSTOMMATCH_SETSPAWNPOINT = 0x58;

  static WEBAPI_LIVEDATA_GET_GAME = 0x60;
  static WEBAPI_LIVEDATA_GET_TEAMS = 0x61;
  static WEBAPI_LIVEDATA_GET_TEAM_PLAYERS = 0x62;
  static WEBAPI_LIVEDATA_GET_OBSERVERS_CAMERA = 0x63;

  static WEBAPI_LOCALDATA_SET_OBSERVER = 0x70;
  static WEBAPI_LOCALDATA_GET_OBSERVER = 0x71;
  static WEBAPI_LOCALDATA_GET_OBSERVERS = 0x72;
  static WEBAPI_LOCALDATA_GET_TOURNAMENT_IDS = 0x73;
  static WEBAPI_LOCALDATA_SET_TOURNAMENT_NAME = 0x74;
  static WEBAPI_LOCALDATA_RENAME_TOURNAMENT_NAME = 0x75;
  static WEBAPI_LOCALDATA_SET_TOURNAMENT_PARAMS = 0x76;
  static WEBAPI_LOCALDATA_GET_TOURNAMENT_PARAMS = 0x77;
  static WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULT = 0x78;
  static WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULTS = 0x79;
  static WEBAPI_LOCALDATA_SET_TEAM_PARAMS = 0x7a;
  static WEBAPI_LOCALDATA_GET_TEAM_PARAMS = 0x7b;
  static WEBAPI_LOCALDATA_SET_PLAYER_PARAMS = 0x7c;
  static WEBAPI_LOCALDATA_GET_PLAYER_PARAMS = 0x7d;
  static WEBAPI_LOCALDATA_GET_PLAYERS = 0x7e;
  static WEBAPI_LOCALDATA_GET_CURRENT_TOURNAMENT = 0x7f;
  static WEBAPI_LOCALDATA_SET_TOURNAMENT_RESULT = 0x80;
  static WEBAPI_LOCALDATA_SET_LIVEAPI_CONFIG = 0x81;
  static WEBAPI_LOCALDATA_GET_LIVEAPI_CONFIG = 0x82;

  static WEBAPI_EVENT_TEAMBANNER_STATE = 0xc0;
  static WEBAPI_EVENT_MAP_STATE = 0xc1;

  static WEBAPI_EVENT_LIVEAPI_SOCKET_STATS = 0xd0;
  static WEBAPI_HTTP_GET_STATS_FROM_CODE = 0xd1;
  static WEBAPI_MANUAL_POSTMATCH = 0xd2;

  static WEBAPI_BROADCAST_OBJECT = 0xf0;

  static WEBAPI_DATA_BOOL = 0x00;
  static WEBAPI_DATA_UINT8 = 0x01;
  static WEBAPI_DATA_UINT16 = 0x02;
  static WEBAPI_DATA_UINT32 = 0x03;
  static WEBAPI_DATA_UINT64 = 0x04;
  static WEBAPI_DATA_INT8 = 0x05;
  static WEBAPI_DATA_INT16 = 0x06;
  static WEBAPI_DATA_INT32 = 0x07;
  static WEBAPI_DATA_INT64 = 0x08;
  static WEBAPI_DATA_FLOAT32 = 0x10;
  static WEBAPI_DATA_FLOAT64 = 0x11;
  static WEBAPI_DATA_STRING = 0x20;
  static WEBAPI_DATA_JSON = 0x30;

  static WEBAPI_PLAYER_STATE_ALIVE = 0x00;
  static WEBAPI_PLAYER_STATE_DOWN = 0x01;
  static WEBAPI_PLAYER_STATE_KILLED = 0x02;
  static WEBAPI_PLAYER_STATE_COLLECTED = 0x03;

  static WEBAPI_ITEM_SYRINGE = 0x10;
  static WEBAPI_ITEM_MEDKIT = 0x11;
  static WEBAPI_ITEM_SHIELDCELL = 0x12;
  static WEBAPI_ITEM_SHIELDBATTERY = 0x13;
  static WEBAPI_ITEM_PHOENIXKIT = 0x14;
  static WEBAPI_ITEM_ULTIMATEACCELERANT = 0x15;
  static WEBAPI_ITEM_THERMITEGRENADE = 0x30;
  static WEBAPI_ITEM_FRAGGRENADE = 0x31;
  static WEBAPI_ITEM_ARCSTAR = 0x32;
  static WEBAPI_ITEM_BODYSHIELD = 0x35;
  static WEBAPI_ITEM_BACKPACK = 0x40;
  static WEBAPI_ITEM_KNOCKDOWNSHIELD = 0x50;
  static WEBAPI_ITEM_MOBILERESPAWNBEACON = 0x60;
  static WEBAPI_ITEM_HEATSHIELD = 0x61;
  static WEBAPI_ITEM_EVACTOWER = 0x62;
  static WEBAPI_ITEM_SHIELDCCORE = 0x70;

  static WEBAPI_EXTENDED_KILL = 0x00;
  static WEBAPI_EXTENDED_KNOCKDOWN = 0x01;
  static WEBAPI_EXTENDED_DAMAGE = 0x02;
  static WEBAPI_EXTENDED_REVIVE = 0x03;
  static WEBAPI_EXTENDED_COLLECTED = 0x04;
  static WEBAPI_EXTENDED_RESPAWN = 0x05;

  #uri;
  #socket;
  #decoder;
  #encoder;
  #game;

  constructor(uri) {
    super();

    this.#uri = uri;
    this.#socket = null;
    this.#decoder = new TextDecoder();
    this.#encoder = new TextEncoder();

    this.#game = new Game();

    this.#setupSockets();
  }

  #setupSockets() {
    if (this.#socket != null) {
      this.#socket.close();
    }
    this.#socket = new WebSocket(this.#uri);
    this.#socket.binaryType = "arraybuffer";

    this.#socket.addEventListener("message", (event) => {
      if (event.data instanceof ArrayBuffer) {
        // バイナリーフレーム
        // データ種類
        const view = new DataView(event.data);
        const data_type = view.getUint8(0);
        const data_count = view.getUint8(1);
        const data_array = event.data.slice(2);
        if (!this.#procData(data_type, data_count, data_array)) {
          console.log('proc_data failed. data_type=0x' + data_type.toString(16));
          console.log('data_count=' + data_count);
          console.log(event.data);
        }
      } else {
        // テキストフレーム
        console.log('text frame received.');
        console.log(event.data);
      }
    });

    this.#socket.addEventListener("open", (event) => {
      this.#game = new Game();
      this.dispatchEvent(new CustomEvent('open', {
        detail: {
          origin: event,
          socket: this.#socket,
          game: this.#game
        }
      }));
    });

    this.#socket.addEventListener("close", (event) => {
      this.dispatchEvent(new CustomEvent('close', {
        detail: {
          origin: event,
          socket: this.#socket
        }
      }));
    });

    this.#socket.addEventListener("error", (event) => {
      this.dispatchEvent(new CustomEvent('error', {
        detail: {
          origin: event,
          socket: this.#socket
        }
      }));
    });
  }

  #parseData(count, data) {
    const data_array = [];
    let offset = 0;
    for (let i = 0; i < count; ++i) {
      // データ型
      const view = new DataView(data);
      const data_type = view.getUint8(offset);
      ++offset;
      switch (data_type) {
        case ApexWebAPI.WEBAPI_DATA_BOOL:
          data_array.push(view.getUint8(offset) > 0 ? true : false);
          offset += 1;
          break;
        case ApexWebAPI.WEBAPI_DATA_UINT8:
          data_array.push(view.getUint8(offset));
          offset += 1;
          break;
        case ApexWebAPI.WEBAPI_DATA_UINT16:
          data_array.push(view.getUint16(offset, true));
          offset += 2;
          break;
        case ApexWebAPI.WEBAPI_DATA_UINT32:
          data_array.push(view.getUint32(offset, true));
          offset += 4;
          break;
        case ApexWebAPI.WEBAPI_DATA_UINT64: {
          const b = view.getBigUint64(offset, true);
          if (b <= Number.MAX_SAFE_INTEGER) {
            data_array.push(Number(b));
          } else {
            data_array.push(b);
          }
          offset += 8;
          break;
        }
        case ApexWebAPI.WEBAPI_DATA_INT8:
          data_array.push(view.getInt8(offset));
          offset += 1;
          break;
        case ApexWebAPI.WEBAPI_DATA_INT16:
          data_array.push(view.getInt16(offset, true));
          offset += 2;
          break;
        case ApexWebAPI.WEBAPI_DATA_INT32:
          data_array.push(view.getInt32(offset, true));
          offset += 4;
          break;
        case ApexWebAPI.WEBAPI_DATA_INT64: {
          const b = view.getBigInt64(offset, true);
          if (MIN_SAFE_INTEGER <= b && b <= Number.MAX_SAFE_INTEGER) {
            data_array.push(Number(b));
          } else {
            data_array.push(b);
          }
          offset += 8;
          break;
        }
        case ApexWebAPI.WEBAPI_DATA_FLOAT32:
          data_array.push(view.getFloat32(offset, true));
          offset += 4;
          break;
        case ApexWebAPI.WEBAPI_DATA_FLOAT64:
          data_array.push(view.getFloat64(offset, true));
          offset += 8;
          break;
        case ApexWebAPI.WEBAPI_DATA_STRING:
          {
            const len = view.getUint8(offset);
            ++offset;
            const strbin = data.slice(offset, offset + len);
            const str = this.#decoder.decode(strbin);
            data_array.push(str);
            offset += len;
          }
          break;
        case ApexWebAPI.WEBAPI_DATA_JSON:
          {
            const len = view.getUint32(offset, true);
            offset += 4;
            const capedlen = (len & 0xffffff); // 16777216(16MB)
            if (len == capedlen) {
              const strbin = data.slice(offset, offset + len);
              const str = this.#decoder.decode(strbin);
              try {
                const json = JSON.parse(str);
                data_array.push(json);
              } catch (e) {
                console.error("failed to parse ApexWebAPI.WEBAPI_DATA_JSON");
                console.error(e);
              }
              offset += len;
            }
          }
          break;
      }
    }
    
    if (data.byteLength != offset) {
      console.log("data length is not match: length=%d, offset=%d", data.byteLength, offset);
      return null;
    }

    return data_array;
  }

  #procTeamID(teamid) {
    return {
      unassined: (teamid == 0),
      observer: (teamid == 1),
      id: (teamid >= 2 ? teamid - 2: 0) 
    };
  }

  #procEventLobbyPlayer(arr) {
    const teamid = this.#procTeamID(arr[0]);
    const hash = arr[1];
    const name = arr[2];
    const hardware = arr[3];
    this.dispatchEvent(new CustomEvent('lobbyplayer', {
      detail: {
        teamid: teamid.id,
        unassined: teamid.unassined,
        observer: teamid.observer,
        hash: hash,
        name: name,
        hardware: hardware
      }
    }));
    return true;
  }

  #procEventLobbyTeam(arr) {
    const teamid = this.#procTeamID(arr[0]);
    const name = arr[1];
    const spawnpoint = arr[2];
    this.dispatchEvent(new CustomEvent('lobbyteam', {
      detail: {
        teamid: teamid.id,
        unassined: teamid.unassined,
        observer: teamid.observer,
        name: name,
        spawnpoint: spawnpoint
      }
    }));
    return true;
  }

  #procEventCustomMatchSettings(arr) {
    this.dispatchEvent(new CustomEvent('custommatchsettings', {
      detail: {
        playlistname: arr[0],
        adminchat: arr[1],
        teamrename: arr[2],
        selfassign: arr[3],
        aimassist: arr[4],
        anonmode: arr[5]
      }
    }));
    return true;
  }

  #procEventObserverSwitched(arr) {
    const oteamid = arr[0];
    const osquadindex = arr[1];
    const tteamid = arr[2];
    const tsquadindex = arr[3];
    const own = arr[4];
    if (oteamid != 1) return false;
    if (tteamid < 2) return false;
    if (tteamid - 2 >= this.#game.teams.length) return false;
    if (tsquadindex >= this.#game.teams[tteamid - 2].players.length) return false;
    if (osquadindex >= this.#game.observers.length) return false;
    this.dispatchEvent(new CustomEvent('observerswitch', {
      detail: {
        observer: this.#game.observers[osquadindex],
        player: this.#game.teams[tteamid - 2].players[tsquadindex],
        team: this.#game.teams[tteamid - 2],
        own: own
      }
    }));
    return true;
  }

  #procEventInitCamera(arr) {
    this.dispatchEvent(new CustomEvent('initcamera', {
      detail: {
        teamid: (arr[0] - 2),
        playerid: arr[1],
      }
    }));
    return true;
  }

  #procEventClearLiveData() {
    this.#game = new Game();
    this.start = Date.now();
    this.dispatchEvent(new CustomEvent('clearlivedata', {detail: {game: this.#game}}));
    return true;
  }
  
  #procEventGameStateChanged(arr) {
    this.#game.state = arr[0];
    this.dispatchEvent(new CustomEvent('gamestatechange', {detail: {game: this.#game}}));
    return true;
  }

  #procEventMatchStateEndWinnerDetermined(arr) {
    if (arr[0] < 2) return false;
    this.#procTeam(arr[0], {placement: 1});
    this.dispatchEvent(new CustomEvent('winnerdetermine', {
      detail: {
        game: this.#game,
        team: this.#game.teams[arr[0] - 2]
      }
    }));
    return true;
  }
  
  #procEventPlayerConnected(arr) {
    if (arr[0] == 0) return false;
    this.#procPlayer(arr[0], arr[1], { connected: true, canreconnect: false });
    if (arr[0] >= 2) {
      // プレイヤーのみイベントを飛ばす
      this.dispatchEvent(new CustomEvent('playerconnected', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }
  
  #procEventPlayerDisconnected(arr) {
    if (arr[0] == 0) return false;
    this.#procPlayer(arr[0], arr[1], { connected: false, canreconnect: arr[2] });
    if (arr[0] >= 2) {
      // プレイヤーのみイベントを飛ばす
      this.dispatchEvent(new CustomEvent('playerdisconnected', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerKilled(arr) {
    if (arr[0] < 2) return false;
    if (arr[2] < 2) return false;
    this.#procPlayerKilled(arr[0] - 2, arr[1], arr[2] - 2, arr[3]);
    return true;
  }

  #procEventPlayerKilledCount(arr) {
    if (arr[0] == 0) return false;
    this.#procPlayer(arr[0], arr[1], { killed: arr[2] });
    this.dispatchEvent(new CustomEvent('playerkilledcount', {
      detail: {
        player: this.#game.teams[arr[0] - 2].players[arr[1]],
        team: this.#game.teams[arr[0] - 2]
      }
    }));
    return true;
  }

  #procEventPlayerID(arr) {
    this.#procPlayer(arr[0], arr[1], { hash: arr[2] });
    if (arr[0] >= 2) {
      this.dispatchEvent(new CustomEvent('playerhash', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerName(arr) {
    this.#procPlayer(arr[0], arr[1], { name: arr[2] });
    if (arr[0] >= 2) {
      this.dispatchEvent(new CustomEvent('playername', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerHP(arr) {
    this.#procPlayer(arr[0], arr[1], { hp: arr[2], hp_max: arr[3] });
    if (arr[0] >= 2) {
      this.dispatchEvent(new CustomEvent('playerhp', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerShield(arr) {
    this.#procPlayer(arr[0], arr[1], { shield: arr[2], shield_max: arr[3] });
    if (arr[0] >= 2) {
      this.dispatchEvent(new CustomEvent('playershield', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerPosition(arr) {
    this.#procPlayer(arr[0], arr[1], { x: arr[2], y: arr[3], angle: arr[4] });
    if (arr[0] >= 2) {
      this.dispatchEvent(new CustomEvent('playerposition', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerState(arr) {
    this.#procPlayer(arr[0], arr[1], { state: arr[2] });
    if (arr[0] >= 2) {
      const team = this.#game.teams[arr[0] - 2];
      const player = this.#game.teams[arr[0] - 2].players[arr[1]];
      const state = player.state;
      switch (state) {
        case ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE:
          this.dispatchEvent(new CustomEvent('statealive', {detail: {player: player, team: team}}));
          break;
        case ApexWebAPI.WEBAPI_PLAYER_STATE_DOWN:
          this.dispatchEvent(new CustomEvent('statedown', {detail: {player: player, team: team}}));
          break;
        case ApexWebAPI.WEBAPI_PLAYER_STATE_KILLED:
          this.dispatchEvent(new CustomEvent('statekilled', {detail: {player: player, team: team}}));
          break;
        case ApexWebAPI.WEBAPI_PLAYER_STATE_COLLECTED:
          this.dispatchEvent(new CustomEvent('statecollected', {detail: {player: player, team: team}}));
          break;
      }
    }
    return true;
  }

  #procEventPlayerStats(arr) {
    this.#procPlayer(arr[0], arr[1], { kills: arr[2], assists: arr[3], knockdowns: arr[4], revives: arr[5], respawns: arr[6] });
    if (arr[0] >= 2) {
      this.dispatchEvent(new CustomEvent('playerstats', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerLevel(arr) {
    this.#procPlayer(arr[0], arr[1], { level: arr[2] });
    if (arr[0] >= 2) {
      this.dispatchEvent(new CustomEvent('playerlevel', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerPerk(arr) {
    if (arr[0] >= 2) {
      const teamid = arr[0] - 2;
      this.#procPlayerPerk(teamid, arr[1], arr[2], arr[3]);
      this.dispatchEvent(new CustomEvent('playerperk', {
        detail: {
          level: arr[2],
          player: this.#game.teams[teamid].players[arr[1]],
          team: this.#game.teams[teamid]
        }
      }));
    }
    return true;
  }

  #procEventPlayerWeapon(arr) {
    if (arr[0] >= 2) {
      const teamid = arr[0] - 2;
      this.#procPlayerWeapon(teamid, arr[1], arr[2]);
      this.dispatchEvent(new CustomEvent('playerweapon', {
        detail: {
          player: this.#game.teams[teamid].players[arr[1]],
          team: this.#game.teams[teamid]
        }
      }));
    }
    return true;
  }

  #procEventPlayerUltimateCharged(arr) {
    if (arr[0] >= 2) {
      const teamid = arr[0] - 2;
      this.dispatchEvent(new CustomEvent('playerultimatecharged', {
        detail: {
          player: this.#game.teams[teamid].players[arr[1]],
          team: this.#game.teams[teamid],
          linkedentry: arr[2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerDamage(arr) {
    this.#procPlayer(arr[0], arr[1], { damage_dealt: arr[2], damage_taken: arr[3] });
    if (arr[0] >= 2) {
      this.dispatchEvent(new CustomEvent('playerdamage', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerCharacter(arr) {
    this.#procPlayer(arr[0], arr[1], { character: arr[2] });
    if (arr[0] >= 2) {
      this.dispatchEvent(new CustomEvent('playercharacter', {
        detail: {
          player: this.#game.teams[arr[0] - 2].players[arr[1]],
          team: this.#game.teams[arr[0] - 2]
        }
      }));
    }
    return true;
  }

  #procEventPlayerItems(arr) {
    if (arr[0] >= 2) {
      const teamid = arr[0] - 2;
      const itemid = this.#itemidToString(arr[2]);
      this.#procPlayerItem(teamid, arr[1], itemid, arr[3]);
      this.dispatchEvent(new CustomEvent('playeritem', {
        detail: {
          item: itemid,
          player: this.#game.teams[teamid].players[arr[1]],
          team: this.#game.teams[teamid]
        }
      }));
    }
    return true;
  }

  #procEventSquadEliminated(arr) {
    if (arr[0] >= 2) {
      const teamid = arr[0] - 2;
      this.#procTeam(teamid, {placement: arr[1], eliminated: true});
      this.dispatchEvent(new CustomEvent('squadeliminate', {detail: {team: this.#game.teams[teamid]}}));
    }
    return true;
  }

  #procEventTeamName(arr) {
    if (arr[0] >= 2) {
      const teamid = arr[0] - 2;
      this.#procTeam(teamid, {name: arr[1]});
      this.dispatchEvent(new CustomEvent('teamname', {detail: {team: this.#game.teams[teamid]}}));
    }
    return true;
  }

  #procEventTeamPlacement(arr) {
    if (arr[0] >= 2) {
      const teamid = arr[0] - 2;
      this.#procTeam(teamid, {placement: arr[1]});
      this.dispatchEvent(new CustomEvent('teamplacement', {detail: {team: this.#game.teams[teamid]}}));
    }
    return true;
  }

  #procEventTeamRespawn(arr) {
    if (arr[0] >= 2) {
      const teamid = arr[0] - 2;
      const targets = [];
      const targetsize = arr[2];
      for (let i = 0; i < targetsize && (i + 3) < arr.length; ++i) {
        const squadindex = arr[3 + i];
        targets.push(this.#game.teams[teamid].players[squadindex]);
      }
      this.dispatchEvent(new CustomEvent('teamrespawn', {
        detail: {
          player: this.#game.teams[teamid].players[arr[1]],
          team: this.#game.teams[teamid],
          targets: targets
        }
      }));
    }
    return true;
  }

  #procLocalDataGetObservers(count, arr) {
    if ((count % 3) != 1) return false;
    const observers = [];
    for (let i = 1; i < count; i += 3) {
      observers.push({hash: arr[i + 0], name: arr[i + 1], own: arr[i + 2]});
    }
    this.dispatchEvent(new CustomEvent('getobservers', {detail: {sequence: arr[0], observers: observers}}));
    return true;
  }

  #procEventExtended(arr) {
    const len = arr.length;
    switch (arr[0]) {
      case ApexWebAPI.WEBAPI_EXTENDED_KILL:
        if (len == 6) {
          if (arr[1] < 2) break;
          if (arr[3] < 2) break;
          const player_teamid = arr[1] - 2;
          const victim_teamid = arr[3] - 2;
          const player = this.#game.teams[player_teamid].players[arr[2]];
          const victim = this.#game.teams[victim_teamid].players[arr[4]];
          const weapon = arr[5];
          this.dispatchEvent(new CustomEvent('infokill', { detail: { player: player, victim: victim, weapon: weapon } }));
        }
        break;
      case ApexWebAPI.WEBAPI_EXTENDED_KNOCKDOWN:
        if (len == 6) {
          if (arr[1] < 2) break;
          if (arr[3] < 2) break;
          const player_teamid = arr[1] - 2;
          const victim_teamid = arr[3] - 2;
          const player = this.#game.teams[player_teamid].players[arr[2]];
          const victim = this.#game.teams[victim_teamid].players[arr[4]];
          const weapon = arr[5];
          this.dispatchEvent(new CustomEvent('infoknockdown', { detail: { player: player, victim: victim, weapon: weapon } }));
        }
        break;
      case ApexWebAPI.WEBAPI_EXTENDED_DAMAGE:
        if (len == 7) {
          if (arr[1] < 2) break;
          if (arr[3] < 2) break;
          const player_teamid = arr[1] - 2;
          const victim_teamid = arr[3] - 2;
          const player = this.#game.teams[player_teamid].players[arr[2]];
          const victim = this.#game.teams[victim_teamid].players[arr[4]];
          const weapon = arr[5];
          const damage = arr[6];
          this.dispatchEvent(new CustomEvent('infodamage', { detail: { player: player, victim: victim, weapon: weapon, damage: damage } }));
        }
        break;
      case ApexWebAPI.WEBAPI_EXTENDED_REVIVE:
        if (len == 4) {
          if (arr[1] < 2) break;
          const teamid = arr[1] - 2;
          const team = this.#game.teams[teamid];
          const player = team.players[arr[2]];
          const revived = team.players[arr[3]];
          this.dispatchEvent(new CustomEvent('inforevive', { detail: { team: team, player: player, revived: revived } }));
        }
        break;
      case ApexWebAPI.WEBAPI_EXTENDED_COLLECTED:
        if (len == 4) {
          if (arr[1] < 2) break;
          const teamid = arr[1] - 2;
          const team = this.#game.teams[teamid];
          const player = team.players[arr[2]];
          const collected = team.players[arr[3]];
          this.dispatchEvent(new CustomEvent('infocollected', { detail: { team: team, player: player, collected: collected } }));
        }
        break;
      case ApexWebAPI.WEBAPI_EXTENDED_RESPAWN:
        if (len == 4) {
          if (arr[1] < 2) break;
          const teamid = arr[1] - 2;
          const team = this.#game.teams[teamid];
          const player = team.players[arr[2]];
          const respawned = team.players[arr[3]];
          this.dispatchEvent(new CustomEvent('inforespawn', { detail: { team: team, player: player, respawned: respawned } }));
        }
        break;
    }
    return true;
  }

  #procData(type, count, data) {
    const data_array = this.#parseData(count, data);
    if (data_array == null) return;
    
    switch (type) {
      case ApexWebAPI.WEBAPI_EVENT_LOBBYPLAYER:
        if (count != 4) return false;
        return this.#procEventLobbyPlayer(data_array);
      case ApexWebAPI.WEBAPI_EVENT_LOBBYENUM_START:
        if (count != 0) return false;
        this.dispatchEvent(new CustomEvent('lobbyenumstart', { detail: {} }));
        break;
      case ApexWebAPI.WEBAPI_EVENT_LOBBYENUM_END:
        if (count != 0) return false;
        this.dispatchEvent(new CustomEvent('lobbyenumend', { detail: {} }));
        break;
      case ApexWebAPI.WEBAPI_EVENT_LOBBYTEAM:
        if (count != 3) return false;
        return this.#procEventLobbyTeam(data_array);
      case ApexWebAPI.WEBAPI_EVENT_CUSTOMMATCH_SETTINGS:
        if (count != 6) return false;
        return this.#procEventCustomMatchSettings(data_array);
      case ApexWebAPI.WEBAPI_EVENT_OBSERVERSWITCHED:
        if (count != 5) return false;
        return this.#procEventObserverSwitched(data_array);
      case ApexWebAPI.WEBAPI_EVENT_INIT_CAMERA:
        if (count != 2) return false;
        return this.#procEventInitCamera(data_array);
      case ApexWebAPI.WEBAPI_EVENT_CLEAR_LIVEDATA:
        return this.#procEventClearLiveData();
      case ApexWebAPI.WEBAPI_EVENT_MATCHSETUP_MAP:
        if (count != 1) return false;
        this.#game.map = data_array[0];
        break;
      case ApexWebAPI.WEBAPI_EVENT_MATCHSETUP_PLAYLIST:
        if (count != 2) return false;
        this.#game.playlistname = data_array[0];
        this.#game.playlistdesc = data_array[1];
        break;
      case ApexWebAPI.WEBAPI_EVENT_MATCHSETUP_DATACENTER:
        if (count != 1) return false;
        this.#game.datacenter = data_array[0];
        break;
      case ApexWebAPI.WEBAPI_EVENT_MATCHSETUP_AIMASSISTON:
        if (count != 1) return false;
        this.#game.aimassiston = data_array[0];
        break;
      case ApexWebAPI.WEBAPI_EVENT_MATCHSETUP_ANONYMOUSMODE:
        if (count != 1) return false;
        this.#game.anonymousmode = data_array[0];
        break;
      case ApexWebAPI.WEBAPI_EVENT_MATCHSETUP_SERVERID:
        if (count != 1) return false;
        this.#game.serverid = data_array[0];
        this.dispatchEvent(new CustomEvent('matchsetup', {detail: {game: this.#game}})); // 一連のMATCHSETUP系の最後
        break;
      case ApexWebAPI.WEBAPI_EVENT_GAMESTATECHANGED:
        if (count != 1) return false;
        return this.#procEventGameStateChanged(data_array);
      case ApexWebAPI.WEBAPI_EVENT_MATCHSTATEEND_WINNERDETERMINED:
        if (count != 1) return false;
        return this.#procEventMatchStateEndWinnerDetermined(data_array);
      case ApexWebAPI.WEBAPI_EVENT_SAVE_RESULT:
        if (count != 3) return false;
        this.#game.end = Date.now();
        this.dispatchEvent(new CustomEvent('saveresult', {detail: {id: data_array[0], gameid: data_array[1], result: data_array[2]}}));
        break;
      case ApexWebAPI.WEBAPI_EVENT_RINGINFO:
        if (count != 6) return false;
        this.dispatchEvent(new CustomEvent('ringinfo', {detail: {timestamp: data_array[0], x: data_array[1], y: data_array[2], current: data_array[3], end: data_array[4], duration: data_array[5]}}));
        break;
      case ApexWebAPI.WEBAPI_EVENT_PLAYERCONNECTED:
        if (count != 2) return false;
        return this.#procEventPlayerConnected(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYERDISCONNECTED:
        if (count != 3) return false;
        return this.#procEventPlayerDisconnected(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_KILLED:
        if (count != 4) return false;
        return this.#procEventPlayerKilled(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_KILLED_COUNT:
        if (count != 3) return false;
        return this.#procEventPlayerKilledCount(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_ID:
        if (count != 3) return false;
        return this.#procEventPlayerID(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_NAME:
        if (count != 3) return false;
        return this.#procEventPlayerName(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_HP:
        if (count != 4) return false;
        return this.#procEventPlayerHP(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_SHIELD:
        if (count != 4) return false;
        return this.#procEventPlayerShield(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_POS:
        if (count != 5) return false;
        return this.#procEventPlayerPosition(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_STATE:
        if (count != 3) return false;
        return this.#procEventPlayerState(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_STATS:
        if (count != 7) return false;
        return this.#procEventPlayerStats(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_LEVEL:
        if (count != 3) return false;
        return this.#procEventPlayerLevel(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_PERK:
        if (count != 4) return false;
        return this.#procEventPlayerPerk(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_WEAPON:
        if (count != 3) return false;
        return this.#procEventPlayerWeapon(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYERULTIMATECHARGED:
        if (count != 3) return false;
        return this.#procEventPlayerUltimateCharged(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_DAMAGE:
        if (count != 4) return false;
        return this.#procEventPlayerDamage(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_CHARACTER:
        if (count != 3) return false;
        return this.#procEventPlayerCharacter(data_array);
      case ApexWebAPI.WEBAPI_EVENT_PLAYER_ITEMS:
        if (count != 4) return false;
        return this.#procEventPlayerItems(data_array);
      case ApexWebAPI.WEBAPI_EVENT_SQUADELIMINATED:
        if (count != 2) return false;
        return this.#procEventSquadEliminated(data_array);
      case ApexWebAPI.WEBAPI_EVENT_TEAM_NAME:
        if (count != 2) return false;
        return this.#procEventTeamName(data_array);
      case ApexWebAPI.WEBAPI_EVENT_TEAM_PLACEMENT:
        if (count != 2) return false;
        return this.#procEventTeamPlacement(data_array);
      case ApexWebAPI.WEBAPI_EVENT_TEAM_RESPAWN:
        if (count < 3) return false;
        return this.#procEventTeamRespawn(data_array);
      case ApexWebAPI.WEBAPI_EVENT_TEAMBANNER_STATE:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('teambannerstate', {detail: {state: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_EVENT_EXTENDED:
        if (count < 1) return false;
        return this.#procEventExtended(data_array);
      case ApexWebAPI.WEBAPI_EVENT_MAP_STATE:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('mapstate', {detail: {state: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_EVENT_LIVEAPI_SOCKET_STATS:
        if (count != 3) return false;
        this.dispatchEvent(new CustomEvent('liveapisocketstats', {detail: {conn: data_array[0], recv: data_array[1], send: data_array[2]}}));
        break;
      case ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_SENDCHAT:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('sendchat', {detail: {sequence: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_SETSETTINGS:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('setsettings', {detail: {sequence: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_GETSETTINGS:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('getsettings', {detail: {sequence: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_GETLOBBYPLAYERS:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('getlobbyplayers', {detail: {sequence: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_SEND_CHANGECAMERA:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('changecamera', {detail: {sequence: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_SEND_PAUSETOGGLE:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('pausetoggle', {detail: {sequence: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_SETTEAMNAME:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('setteamname', {detail: {sequence: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_SETSPAWNPOINT:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('setspawnpoint', {detail: {sequence: data_array[0]}}));
        break;
      case ApexWebAPI.WEBAPI_LIVEDATA_GET_GAME:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('getgame', {detail: {sequence: data_array[0], game: this.#game}}));
        break;
      case ApexWebAPI.WEBAPI_LIVEDATA_GET_TEAMS:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('getteams', {detail: {sequence: data_array[0], teams: this.#game.teams}}));
        break;
      case ApexWebAPI.WEBAPI_LIVEDATA_GET_TEAM_PLAYERS:
        if (count != 2) return false;
        this.dispatchEvent(new CustomEvent('getteamplayers', {detail: {sequence: data_array[0], team: this.#game.teams[data_array[1]]}}));
        break;
      case ApexWebAPI.WEBAPI_LIVEDATA_GET_OBSERVERS_CAMERA:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('getobserverscamera', {detail: {sequence: data_array[0], observers: this.#game.observers}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_SET_OBSERVER:
        if (count != 2) return false;
        this.dispatchEvent(new CustomEvent('setobserver', {detail: {sequence: data_array[0], hash: data_array[1]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_OBSERVER:
        if (count != 2) return false;
        this.dispatchEvent(new CustomEvent('getobserver', {detail: {sequence: data_array[0], hash: data_array[1]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_OBSERVERS:
        return this.#procLocalDataGetObservers(count, data_array);
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_TOURNAMENT_IDS:
        if (count != 2) return false;
        this.dispatchEvent(new CustomEvent('gettournamentids', {detail: {sequence: data_array[0], ids: data_array[1]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_SET_TOURNAMENT_NAME:
        if (count != 3) return false;
        this.dispatchEvent(new CustomEvent('settournamentname', {detail: {sequence: data_array[0], id: data_array[1], name: data_array[2]}}));
        this.#refreshTeamParams();
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_RENAME_TOURNAMENT_NAME:
        if (count != 4) return false;
        this.dispatchEvent(new CustomEvent('renametournamentname', {detail: {sequence: data_array[0], id: data_array[1], name: data_array[2], result: data_array[3]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_SET_TOURNAMENT_PARAMS:
        if (count != 4) return false;
        this.dispatchEvent(new CustomEvent('settournamentparams', {detail: {sequence: data_array[0], id: data_array[1], result: data_array[2], params: data_array[3]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_TOURNAMENT_PARAMS:
        if (count != 3) return false;
        this.dispatchEvent(new CustomEvent('gettournamentparams', {detail: {sequence: data_array[0], id: data_array[1], params: data_array[2]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_SET_TOURNAMENT_RESULT:
        if (count != 5) return false;
        this.dispatchEvent(new CustomEvent('settournamentresult', {detail: {sequence: data_array[0], id: data_array[1], gameid: data_array[2], setresult: data_array[3], result: data_array[4] }}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULT:
        if (count != 4) return false;
        this.dispatchEvent(new CustomEvent('gettournamentresult', {detail: {sequence: data_array[0], id: data_array[1], gameid: data_array[2], result: data_array[3]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULTS:
        if (count != 3) return false;
        this.dispatchEvent(new CustomEvent('gettournamentresults', {detail: {sequence: data_array[0], id: data_array[1], results: data_array[2]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_CURRENT_TOURNAMENT:
        if (count != 4) return false;
        this.dispatchEvent(new CustomEvent('getcurrenttournament', {detail: {sequence: data_array[0], id: data_array[1], name: data_array[2], count: data_array[3]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_SET_TEAM_PARAMS:
        if (count != 5) return false;
        this.dispatchEvent(new CustomEvent('setteamparams', {detail: {sequence: data_array[0], id: data_array[1], teamid: data_array[2], result: data_array[3], params: data_array[4]}}));
        if (data_array[2] < this.#game.teams.length && data_array[3] == true) {
          this.#game.teams[data_array[2]].params = data_array[4];
        }
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_TEAM_PARAMS:
        if (count != 4) return false;
        this.dispatchEvent(new CustomEvent('getteamparams', {detail: {sequence: data_array[0], id: data_array[1], teamid: data_array[2], params: data_array[3]}}));
        if (data_array[2] < this.#game.teams.length) {
          this.#game.teams[data_array[2]].params = data_array[3];
        }
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_SET_PLAYER_PARAMS:
        if (count != 4) return false;
        this.dispatchEvent(new CustomEvent('setplayerparams', {detail: {sequence: data_array[0], hash: data_array[1], result: data_array[2], params: data_array[3]}}));
        if (data_array[1] in this.#game.playerindex && data_array[2] == true) {
          this.#game.playerindex[data_array[1]].params = data_array[3];
        }
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_PLAYER_PARAMS:
        if (count != 3) return false;
        this.dispatchEvent(new CustomEvent('getplayerparams', {detail: {sequence: data_array[0], hash: data_array[1], params: data_array[2]}}));
        if (data_array[1] in this.#game.playerindex) {
          this.#game.playerindex[data_array[1]].params = data_array[2];
        }
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_PLAYERS:
        if (count != 2) return false;
        this.dispatchEvent(new CustomEvent('getplayers', {detail: {sequence: data_array[0], players: data_array[1]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_SET_LIVEAPI_CONFIG:
        if (count != 3) return false;
        this.dispatchEvent(new CustomEvent('setliveapiconfig', {detail: {sequence: data_array[0], result: data_array[1], config: data_array[2]}}));
        break;
      case ApexWebAPI.WEBAPI_LOCALDATA_GET_LIVEAPI_CONFIG:
        if (count != 2) return false;
        this.dispatchEvent(new CustomEvent('getliveapiconfig', {detail: {sequence: data_array[0], config: data_array[1]}}));
        break;
      case ApexWebAPI.WEBAPI_BROADCAST_OBJECT:
        if (count != 2) return false;
        this.dispatchEvent(new CustomEvent('broadcastobject', {detail: {sequence: data_array[0], data: data_array[1]}}));
        break;
      case ApexWebAPI.WEBAPI_HTTP_GET_STATS_FROM_CODE:
        if (count != 4) return false;
        this.dispatchEvent(new CustomEvent('getstatsfromcode', {detail: {sequence: data_array[0], statscode: data_array[1], statuscode: data_array[2], stats: data_array[3]}}));
        break;
      case ApexWebAPI.WEBAPI_MANUAL_POSTMATCH:
        if (count != 1) return false;
        this.dispatchEvent(new CustomEvent('manualpostmatch', {detail: {sequence: data_array[0]}}));
        break;
    }
    return true;
  }

  #initTeamObject(id) {
    return {
      id: id,
      players: [],
      placement: 0xff,
      kills: 0,
      eliminated: false
    };
  }

  #initPlayerObject(id, teamid) {
    return {
      id: id,
      teamid: teamid,
      character: "",
      items: {
        "syringe": 2,
        "medkit": 0,
        "shieldcell": 2,
        "shieldbattery": 0,
        "phoenixkit": 0,
        "ultimateaccelerant": 0,
        "thermitgrenade": 0,
        "fraggrenade": 0,
        "arcstar": 0,
        "bodyshield": 1,
        "backpack": 0,
        "knockdownshield": 1,
        "mobilerespawnbeacon": 0,
        "heatshield": 0,
        "evactower": 0,
        "shieldcore": 1,
      },
      perks: {},
      kills: 0,
      killed: 0,
      assists: 0,
      damage_dealt: 0,
      damage_taken: 0,
      hp: 0,
      hp_max: 0,
      shield: 0,
      shield_max: 0,
      revives: 0,
      respawns: 0,
      connected: true,
      canreconnect: false,
      x: 0,
      y: 0,
      angle: 0,
      state: ApexWebAPI.WEBAPI_PLAYER_STATE_ALIVE,
      weapon: ""
    };
  }

  #countTeamKills(team) {
    let kills = 0;
    for (const player of team.players) {
      kills += player.kills;
    }
    return kills;
  }

  #procPlayer(teamid, squadindex, params) {
    if (teamid == 0) return; // 何もしない
    if (teamid == 1) { // オブザーバー処理
      const observers = this.#game.observers;
      while (squadindex >= observers.length) observers.push({id: observers.length});
      const observer = observers[squadindex];
      for (const [k, v] of Object.entries(params)) {
        observer[k] = v;
      }
      return;
    }

    teamid = teamid - 2;
    if (teamid < 0 || 100 < teamid) return; // MAX 100
    if (squadindex < 0 || 100 < squadindex) return; // MAX 100
    while (teamid >= this.#game.teams.length) this.#game.teams.push(this.#initTeamObject(this.#game.teams.length));
    const team = this.#game.teams[teamid];
    while (squadindex >= team.players.length) team.players.push(this.#initPlayerObject(team.players.length, teamid));
    const player = team.players[squadindex];
    for (const [k, v] of Object.entries(params)) {
      player[k] = v;

      if (k == "kills") {
        team.kills = this.#countTeamKills(team);
      }

      // 初回だけparamsを取得する
      if (k == "hash") {
        if (!(v in this.#game.playerindex)) {
          this.#game.playerindex[v] = player;
        }
        if (typeof v == "string" && v != "") {
          if (!('params' in player)) {
            player.params = {};
            this.getPlayerParams(v).then(() => {});
          }
        }
      }
    }
  }

  #itemidToString(itemid) {
    switch(itemid)
    {
    case ApexWebAPI.WEBAPI_ITEM_SYRINGE:
      return "syringe";
    case ApexWebAPI.WEBAPI_ITEM_MEDKIT:
      return "medkit";
    case ApexWebAPI.WEBAPI_ITEM_SHIELDCELL:
      return "shieldcell";
    case ApexWebAPI.WEBAPI_ITEM_SHIELDBATTERY:
      return "shieldbattery";
    case ApexWebAPI.WEBAPI_ITEM_PHOENIXKIT:
      return "phoenixkit";
    case ApexWebAPI.WEBAPI_ITEM_ULTIMATEACCELERANT:
      return "ultimateaccelerant";
    case ApexWebAPI.WEBAPI_ITEM_THERMITEGRENADE:
      return "thermitgrenade";
    case ApexWebAPI.WEBAPI_ITEM_FRAGGRENADE:
      return "fraggrenade";
    case ApexWebAPI.WEBAPI_ITEM_ARCSTAR:
      return "arcstar";
    case ApexWebAPI.WEBAPI_ITEM_BODYSHIELD:
      return "bodyshield";
    case ApexWebAPI.WEBAPI_ITEM_BACKPACK:
      return "backpack";
    case ApexWebAPI.WEBAPI_ITEM_KNOCKDOWNSHIELD:
      return "knockdownshield";
    case ApexWebAPI.WEBAPI_ITEM_MOBILERESPAWNBEACON:
      return "mobilerespawnbeacon";
    case ApexWebAPI.WEBAPI_ITEM_HEATSHIELD:
      return "heatshield";
    case ApexWebAPI.WEBAPI_ITEM_EVACTOWER:
      return "evactower";
    case ApexWebAPI.WEBAPI_ITEM_SHIELDCCORE:
      return "shieldcore";
    }
    return "";
  }

  #procPlayerPerk(teamid, squadindex, level, perk) {
    if (teamid >= this.#game.teams.length) return;
    if (squadindex >= this.#game.teams[teamid].players.length) return;
    const player = this.#game.teams[teamid].players[squadindex];
    player.perks[level] = perk;
  }

  #procPlayerWeapon(teamid, squadindex, weapon) {
    if (teamid >= this.#game.teams.length) return;
    if (squadindex >= this.#game.teams[teamid].players.length) return;
    const player = this.#game.teams[teamid].players[squadindex];
    player.weapon = weapon;
  }

  #procPlayerItem(teamid, squadindex, itemid, quantity) {
    if (teamid >= this.#game.teams.length) return;
    if (squadindex >= this.#game.teams[teamid].players.length) return;
    const player = this.#game.teams[teamid].players[squadindex];
    player.items[itemid] = quantity;
  }

  #procTeam(teamid, params) {
    if (teamid < 0 || 100 < teamid) return; // MAX 100
    while (teamid >= this.#game.teams.length) this.#game.teams.push(this.#initTeamObject(this.#game.teams.length));
    const team = this.#game.teams[teamid];
    for (const [k, v] of Object.entries(params)) {
      team[k] = v;

      // 初回だけparamsを取得する
      if (k == "name") {
        if (!('params' in team)) {
          team.params = {};
          this.getTeamParams(teamid).then(() => {});
        }
      }
    }
  }

  #procPlayerKilled(v_teamid, v_squadindex, a_teamid, a_squadindex) {
    const victim = this.#game.teams[v_teamid].players[v_squadindex];
    const attacker = this.#game.teams[a_teamid].players[a_squadindex];
    this.#game.kills.push({
      victim: victim,
      attacker: attacker
    });
  }

  #refreshTeamParams() {
    return new Promise((resolve, reject) => {
      const jobs = [];
      for (let i = 0; i < this.#game.teams.length; ++i) {
        const team = this.#game.teams[i];
        if (team.players.length == 0) continue;
        jobs.push(this.getTeamParams(i));
      }
      Promise.all(jobs).then(() => { resolve(this.#game.teams); }, reject);
    });
  }
  
  forceReconnect() {
    this.#setupSockets();
  }

  /* get */
  #getEventSequence(event) {
    if ('detail' in event) {
      if ('sequence' in event.detail) {
        return event.detail.sequence;
      }
    }
    return null;
  }

  #sendAndReceiveReply(buffer, eventname, precheck = true, timeout = 1000) {
    return new Promise((resolve, reject) => {
      if (precheck == false) return reject('precheck failed');
      if (this.#socket.readyState != 1) return reject('socket.readyState is not 1');

      // リプライ確認用
      const sequence = buffer.sequence();

      // 1秒以上かかる場合は失敗
      const timerid = setTimeout(() => {
        this.removeEventListener(eventname, handler);
        reject('request timeout');
      }, timeout);

      // 結果の受信
      const handler = (event) => {
        const received_sequence = this.#getEventSequence(event);
        if (received_sequence == sequence) {
          resolve(event);
          this.removeEventListener(eventname, handler);
          clearTimeout(timerid);
        }
      };

      // 受信設定
      this.addEventListener(eventname, handler);

      // データ送信
      this.#socket.send(buffer.get());
    });
  }

  getGame() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LIVEDATA_GET_GAME);
    return this.#sendAndReceiveReply(buffer, "getgame");
  }

  getTeams() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LIVEDATA_GET_TEAMS);
    return this.#sendAndReceiveReply(buffer, "getteams");
  }

  getTeamPlayers(teamid) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LIVEDATA_GET_TEAM_PLAYERS);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_UINT8, teamid + 2)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "getteamplayers", precheck);
  }

  getObserversCamera() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LIVEDATA_GET_OBSERVERS_CAMERA);
    return this.#sendAndReceiveReply(buffer, "getobserverscamera");
  }

  getAll() {
    return new Promise((resolve, reject) => {
      this.getGame().then(() => {
        this.getTeams().then(() => {
          const jobs = [];
          for (let i = 0; i < this.#game.teams.length; ++i) {
            const team = this.#game.teams[i];
            if (team.players.length == 0) continue;
            jobs.push(this.getTeamPlayers(i));
          }
          Promise.all(jobs).then(() => {
            this.getObserversCamera().then(() => {
              resolve(this.#game);
            }, reject);
          }, reject);
        }, reject);
      }, reject)
    });
  }

  sendCreateMatch() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_CREATELOBBY);
    return this.#sendAndReceiveReply(buffer, "creatematch");
  }

  sendGetLobbyPlayers() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_GETLOBBYPLAYERS);
    return this.#sendAndReceiveReply(buffer, "getlobbyplayers");
  }

  sendGetSettings() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_GETSETTINGS);
    return this.#sendAndReceiveReply(buffer, "getsettings");
  }

  sendSetSettings(playlistname, adminchat, teamrename, selfassign, aimassist, anonmode) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_SETSETTINGS);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, playlistname, this.#encoder)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_BOOL, adminchat)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_BOOL, teamrename)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_BOOL, selfassign)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_BOOL, aimassist)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_BOOL, anonmode)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "setsettings", precheck);
  }

  /**
   * ゲーム内のチーム名を設定する
   * @param {number} teamid チームID(0～)
   * @param {string} teamname チーム名
   * @returns {Promise<CustomEvent>}
   */
  sendSetTeamName(teamid, teamname) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_SETTEAMNAME);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_UINT8, teamid + 2)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, teamname, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "setteamname", precheck);
  }

  /**
   * ゲーム内のチームのスポーンポイントを設定する
   * @param {number} teamid チームID(0～)
   * @param {number} spawnpoint チーム名
   * @returns {Promise<CustomEvent>}
   */
  sendSetSpawnPoint(teamid, spawnpoint) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_SETSPAWNPOINT);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_UINT8, teamid + 2)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_UINT8, spawnpoint)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "setspawnpoint", precheck);
  }

  sendChat(str) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_SEND_CUSTOMMATCH_SENDCHAT);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, str, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "sendchat", precheck);
  }

  /**
   * ゲームの進行・停止を切り替える
   * @param {number} pretimer 動作させるまでにかかる時間(0.0～)
   * @returns {Promise<CustomEvent>}
   */
  pauseToggle(pretimer) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_SEND_PAUSETOGGLE);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_FLOAT32, pretimer)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "pausetoggle", precheck);
  }
  
  changeCamera(name) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_SEND_CHANGECAMERA);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, name, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "changecamera", precheck);
  }

  setObserver(hash) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_SET_OBSERVER);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, hash, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "setobserver", precheck);
  }

  getObserver() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_OBSERVER);
    return this.#sendAndReceiveReply(buffer, "getobserver");
  }

  getObservers() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_OBSERVERS);
    return this.#sendAndReceiveReply(buffer, "getobservers");
  }

  getTournamentIDs() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_TOURNAMENT_IDS);
    return this.#sendAndReceiveReply(buffer, "gettournamentids");
  }

  setTournamentName(name) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_SET_TOURNAMENT_NAME);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, name, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "settournamentname", precheck);
  }

  renameTournamentName(id, name) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_RENAME_TOURNAMENT_NAME);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, id, this.#encoder)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, name, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "renametournamentname", precheck);
  }

  setTournamentParams(params) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_SET_TOURNAMENT_PARAMS);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_JSON, params, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "settournamentparams", precheck);
  }

  getTournamentParams() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_TOURNAMENT_PARAMS);
    return this.#sendAndReceiveReply(buffer, "gettournamentparams");
  }

  setTournamentResult(gameid, result) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_SET_TOURNAMENT_RESULT);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_UINT8, gameid)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_JSON, result, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "settournamentresult", precheck);
  }

  getTournamentResult(gameid) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULT);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_UINT8, gameid)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "gettournamentresult", precheck);
  }

  getTournamentResults() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_TOURNAMENT_RESULTS);
    return this.#sendAndReceiveReply(buffer, "gettournamentresults");
  }

  getCurrentTournament() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_CURRENT_TOURNAMENT);
    return this.#sendAndReceiveReply(buffer, "getcurrenttournament");
  }

  setTeamParams(teamid, params) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_SET_TEAM_PARAMS);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_UINT8, teamid)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_JSON, params, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "setteamparams", precheck);
  }
  
  getTeamParams(teamid) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_TEAM_PARAMS);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_UINT8, teamid)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "getteamparams", precheck);
  }

  setPlayerParams(hash, params) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_SET_PLAYER_PARAMS);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, hash, this.#encoder)) precheck = false;
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_JSON, params, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "setplayerparams", precheck);
  }

  getPlayerParams(hash) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_PLAYER_PARAMS);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, hash, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "getplayerparams", precheck);
  }

  getPlayers() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_PLAYERS);
    return this.#sendAndReceiveReply(buffer, "getplayers");
  }

  setLiveAPIConfig(config) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_SET_LIVEAPI_CONFIG);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_JSON, config, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "setliveapiconfig", precheck);
  }

  getLiveAPIConfig() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_LOCALDATA_GET_LIVEAPI_CONFIG);
    return this.#sendAndReceiveReply(buffer, "getliveapiconfig");
  }

  broadcastObject(data) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_BROADCAST_OBJECT);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_JSON, data, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "broadcastobject");
  }

  getStatsFromCode(code) {
    let precheck = true;
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_HTTP_GET_STATS_FROM_CODE);
    if (!buffer.append(ApexWebAPI.WEBAPI_DATA_STRING, code, this.#encoder)) precheck = false;
    return this.#sendAndReceiveReply(buffer, "getstatsfromcode", precheck, 10000); // timeout = 10s
  }

  manualPostMatch() {
    const buffer = new SendBuffer(ApexWebAPI.WEBAPI_MANUAL_POSTMATCH);
    return this.#sendAndReceiveReply(buffer, "manualpostmatch");
  }

  isConnected() {
    return this.#socket.readyState == 1;
  }

}
