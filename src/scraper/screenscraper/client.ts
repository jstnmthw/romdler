import type { ScreenScraperCredentials } from '../types.js';
import type {
  SSResponse,
  SSMedia,
  GameLookupResult,
  LookupParams,
} from './types.js';

const API_BASE_URL = 'https://api.screenscraper.fr/api2';
const SOFTWARE_NAME = 'romdler';

/** Retry configuration */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/** Rate limiter to prevent exceeding API limits */
class RateLimiter {
  private lastRequestTime = 0;
  private minDelayMs: number;

  constructor(minDelayMs: number) {
    this.minDelayMs = minDelayMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const waitTime = Math.max(0, this.minDelayMs - elapsed);

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

/** ScreenScraper API client */
export class ScreenScraperClient {
  private credentials: ScreenScraperCredentials;
  private rateLimiter: RateLimiter;
  private userAgent: string;

  constructor(
    credentials: ScreenScraperCredentials,
    rateLimitMs: number,
    userAgent: string
  ) {
    this.credentials = credentials;
    this.rateLimiter = new RateLimiter(rateLimitMs);
    this.userAgent = userAgent;
  }

  /**
   * Look up game information by ROM details
   */
  async lookupGame(params: LookupParams): Promise<GameLookupResult | null> {
    const url = this.buildLookupUrl(params);

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      await this.rateLimiter.wait();

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
          },
        });

        // Handle specific status codes
        if (response.status === 404) {
          return null; // Game not found
        }

        if (response.status === 429) {
          // Rate limited - wait longer and retry
          const delay = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt + 2),
            RETRY_CONFIG.maxDelayMs
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid ScreenScraper credentials');
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as SSResponse;
        return this.parseGameResponse(data);
      } catch (err) {
        const error = err as Error;

        // Don't retry auth errors
        if (error.message.includes('credentials')) {
          throw error;
        }

        // Last attempt - throw the error
        if (attempt === RETRY_CONFIG.maxRetries) {
          throw new Error(`Failed after ${RETRY_CONFIG.maxRetries + 1} attempts: ${error.message}`);
        }

        // Calculate backoff delay
        const delay = Math.min(
          RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
          RETRY_CONFIG.maxDelayMs
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return null;
  }

  /**
   * Build the API URL for game lookup
   */
  private buildLookupUrl(params: LookupParams): string {
    const searchParams = new URLSearchParams({
      devid: this.credentials.devId,
      devpassword: this.credentials.devPassword,
      softname: SOFTWARE_NAME,
      ssid: this.credentials.userId,
      sspassword: this.credentials.userPassword,
      output: 'json',
      crc: params.crc,
      systemeid: params.systemId.toString(),
      romtype: 'rom',
      romnom: params.romName,
      romtaille: params.romSize.toString(),
    });

    return `${API_BASE_URL}/jeuInfos.php?${searchParams.toString()}`;
  }

  /**
   * Parse the API response into a simpler structure.
   * Complexity note: Simple null-safe data extraction from nested API response.
   * Complexity from optional chaining on fixed schema. No planned extensibility.
   */
  // eslint-disable-next-line complexity
  private parseGameResponse(data: SSResponse): GameLookupResult | null {
    const game = data.response?.jeu;

    if (!game) {
      return null;
    }

    // Get game name (prefer US region, fallback to first available)
    let gameName = game.id;
    if (game.noms && game.noms.length > 0) {
      const usName = game.noms.find((n) => n.region === 'us');
      const worName = game.noms.find((n) => n.region === 'wor');
      gameName = usName?.text ?? worName?.text ?? game.noms[0]?.text ?? game.id;
    }

    return {
      gameId: game.id,
      gameName,
      medias: game.medias ?? [],
    };
  }
}

/**
 * Select the best media URL based on type and region preferences
 */
export function selectMediaUrl(
  medias: SSMedia[],
  preferredType: string,
  regionPriority: string[]
): string | null {
  // Filter by media type
  const typeMatches = medias.filter((m) => m.type === preferredType);

  if (typeMatches.length === 0) {
    return null;
  }

  // Try each region in priority order
  for (const region of regionPriority) {
    const match = typeMatches.find((m) => m.region === region);
    if (match !== undefined && match.url !== undefined && match.url !== '') {
      return match.url;
    }
  }

  // Fallback to first available with a URL
  const fallback = typeMatches.find((m) => m.url !== undefined && m.url !== '');
  return fallback?.url ?? null;
}

/**
 * Get available media types from a game lookup result
 */
export function getAvailableMediaTypes(medias: SSMedia[]): string[] {
  const types = new Set<string>();
  for (const media of medias) {
    if (media.type) {
      types.add(media.type);
    }
  }
  return Array.from(types).sort();
}
