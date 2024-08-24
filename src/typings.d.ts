// data structure used in the codebase

type aria2_status = 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';

type option_t = {
  [key: string]: string;
  header: string[];
};

// using gid as the key
type activeDownload_t = {
  [key: string]: activeDownloadItem;
};

interface RPCConfig {
  name: string;
  host: string;
  port: number;
  secret?: string;
  secure?: boolean;
  options?: option_t;
  updateDelay?: number;
}

// properties that can't be fetched with tellStatus
interface activeDownloadItem {
  gid?: string;
  icon?: string;
  startTime?: number;
  url?: string;
  serverName?: string;
}

interface DownloadItem {
  // common value
  gid: string;
  icon: string;
  dirname: string;
  basename: string;
  status: aria2_status;
  url?: string;

  // active/in progress exclusive
  seeder?: boolean;
  uploadSpeed?: number;
  dlSpeed?: number;
  connections?: number;
  completedLength?: number;
  uploadLength?: number;

  // extra info
  pieceLength?: number;
  numPieces?: number;
  numSeeders?: number;
  bitfield?: string;
  filesize?: number;
  serverName?: string;
  startTime?: number;
  finishTime?: number;
  errorMsg?: string;
  infoHash?: string;
  bittorrent?: {
    announceList: any[];
    comment: string;
    creationDate: number;
    mode: 'single' | 'multi';
    info: {
      name: string;
    };
  };
  verifiedLength?: number;
  verifyIntegrityPending?: boolean;
}

// structure stored in the root of local browser storage
interface aria2Storage {
  RPCs: RPCConfig[]; // list of RPC config
  intercept: boolean;
  dlHistory: DownloadItem[]; // saved history
  sendCookies: boolean;
  sendReferer: boolean;
  aria2DecideFilename: boolean;
  progressColor: string; // use it as accent color?
  progressOutlineColor: string;
  lastError: string;
  dirList: string[];
  addPageLastDir: string;
}

// Session storage
interface aria2SessionStorage {
  activeDownload: activeDownload_t; // temporary active download list
}

// Notification or request
interface jsonRPCPayload {
  id?: string;
  jsonrpc: string;
  method: string;
  params: any;
}

// Response
interface jsonRPCResponse {
  id?: string;
  jsonrpc: string;
  result?: any;
  error?: any;
}

// Extension messaging
interface runtimeMSG {
  type: 'poke';
}

type page = Writable<'add' | 'item-detail' | 'main'>;
