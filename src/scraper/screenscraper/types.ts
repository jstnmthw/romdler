/** ScreenScraper API media entry */
export interface SSMedia {
  type: string;
  parent?: string;
  url: string;
  region?: string;
  crc?: string;
  md5?: string;
  sha1?: string;
  size?: number;
  format?: string;
}

/** ScreenScraper API game name entry */
export interface SSName {
  region: string;
  text: string;
}

/** ScreenScraper API ROM entry */
export interface SSRom {
  id?: string;
  romfilename?: string;
  romsize?: string;
  romcrc?: string;
  romnumsupport?: string;
  romregions?: string;
}

/** ScreenScraper API game info */
export interface SSGame {
  id: string;
  romid?: string;
  notgame?: string;
  noms?: SSName[];
  synopsis?: SSName[];
  medias?: SSMedia[];
  roms?: SSRom[];
}

/** ScreenScraper API response wrapper */
export interface SSResponse {
  header?: {
    APIversion?: string;
    dateTime?: string;
    commandRequested?: string;
    success?: string;
    error?: string;
  };
  response?: {
    serveurs?: {
      cpu1?: string;
      cpu2?: string;
      threadsalimentation?: string;
      nbscrapeurs?: string;
    };
    ssuser?: {
      id?: string;
      numid?: string;
      niveau?: string;
      contribution?: string;
      uploadsysteme?: string;
      uploadinfos?: string;
      romasso?: string;
      uploadmedia?: string;
      maxthreads?: string;
      maxdownloadspeed?: string;
      requeststoday?: string;
      requestskotoday?: string;
      maxrequestspermin?: string;
      maxrequestsperday?: string;
      maxrequestskoperday?: string;
      visites?: string;
      datedernierevisite?: string;
      favregion?: string;
    };
    jeu?: SSGame;
  };
}

/** Parsed game lookup result */
export interface GameLookupResult {
  gameId: string;
  gameName: string;
  medias: SSMedia[];
}

/** ScreenScraper API error response */
export interface SSError {
  error: string;
  message: string;
  statusCode: number;
}

/** API request parameters */
export interface LookupParams {
  crc: string;
  systemId: number;
  romName: string;
  romSize: number;
}
