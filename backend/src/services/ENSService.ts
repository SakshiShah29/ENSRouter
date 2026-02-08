import { ethers } from 'ethers';
import { ENSTextRecords } from '../types';

export class ENSService {
  private provider: ethers.JsonRpcProvider;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Resolve ENS name to address and fetch text records
   */
  async resolveENS(ensName: string): Promise<{
    address: string;
    textRecords: ENSTextRecords;
  } | null> {
    try {
      // Check cache first
      const cached = this.cache.get(ensName);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      // Normalize ENS name
      const normalizedName = ensName.toLowerCase().trim();
      
      // Resolve address
      const address = await this.provider.resolveName(normalizedName);
      if (!address) {
        console.error(`ENS name not found: ${normalizedName}`);
        return null;
      }

      // Fetch text records
      const resolver = await this.provider.getResolver(normalizedName);
      const textRecords: ENSTextRecords = {};

      if (resolver) {
        // Fetch common text records
        const keys = ['description', 'url', 'avatar', 'com.twitter', 'com.github', 'org.telegram'];
        
        await Promise.all(
          keys.map(async (key) => {
            try {
              const value = await resolver.getText(key);
              if (value) {
                // Map com.telegram to telegram for easier access
                const mappedKey = key === 'org.telegram' ? 'telegram' : key.replace('com.', '');
                textRecords[mappedKey] = value;
              }
            } catch (err) {
              // Ignore errors for individual text records
            }
          })
        );
      }

      const result = { address, textRecords };
      
      // Cache result
      this.cache.set(ensName, { data: result, timestamp: Date.now() });
      
      return result;
    } catch (error) {
      console.error('Error resolving ENS:', error);
      return null;
    }
  }

  /**
   * Lookup reverse ENS (address to name)
   */
  async lookupAddress(address: string): Promise<string | null> {
    try {
      const ensName = await this.provider.lookupAddress(address);
      return ensName;
    } catch (error) {
      console.error('Error looking up address:', error);
      return null;
    }
  }

  /**
   * Clear cache for specific ENS or all
   */
  clearCache(ensName?: string): void {
    if (ensName) {
      this.cache.delete(ensName);
    } else {
      this.cache.clear();
    }
  }
}

export default ENSService;