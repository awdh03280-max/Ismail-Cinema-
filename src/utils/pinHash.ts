/**
 * PIN hashing utility — uses expo-crypto (SHA-256) with a fixed app salt
 * so PINs are never stored in plaintext in AsyncStorage.
 *
 * The salt is public and baked in; this is sufficient for parental-control
 * use cases where the threat model is casual inspection of device storage,
 * not targeted cryptanalysis.
 */
import * as Crypto from 'expo-crypto';

const SALT = 'ismail_cinema_family_mode_v1';

/**
 * Returns a hex-encoded SHA-256 digest of `salt + pin`.
 * Async because SubtleCrypto (web) is asynchronous.
 */
export const hashPin = async (pin: string): Promise<string> => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    SALT + pin
  );
  return digest;
};
