/**
 * WhatsApp Phone Number Normalization Utility
 * Ensures Indian and international mobile numbers are correctly formatted for WhatsApp Business API
 */

/**
 * Normalizes a phone number to WhatsApp destination format (e.g. 91XXXXXXXXXX for India)
 *
 * Rules:
 * 1. Strips all non-digit characters (spaces, dashes, parens, plus signs).
 * 2. If 11 digits starting with '0' (e.g. 09820011223), strips the leading '0' -> 10 digits.
 * 3. If 10 digits (e.g. 9820011223), assumes India (+91) and prefixes '91' -> 919820011223.
 * 4. If 12 digits starting with '91' (e.g. 919820011223), keeps as-is (does not duplicate 91).
 * 5. If 13 digits starting with '091', strips the leading '0' -> 919820011223.
 * 6. Validates final string is between 10 and 15 numeric digits (E.164).
 */
export function normalizeWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  // 1. Remove all non-numeric characters
  let cleaned = phone.replace(/[^0-9]/g, '');

  if (!cleaned || cleaned.length < 10) {
    return null;
  }

  // 2. Handle leading 091 prefix (13 digits: 0919820011223)
  if (cleaned.length === 13 && cleaned.startsWith('091')) {
    cleaned = cleaned.substring(1); // becomes 919820011223
  }

  // 3. Handle single leading 0 (11 digits: 09820011223)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1); // becomes 10 digits: 9820011223
  }

  // 4. Handle 10-digit Indian numbers (starting with 6, 7, 8, 9)
  if (cleaned.length === 10) {
    // Prefix India country code 91
    cleaned = `91${cleaned}`;
  } else if (cleaned.length === 11 && !cleaned.startsWith('91')) {
    // Prefix India country code 91 if omitted
    cleaned = `91${cleaned}`;
  }

  // 5. Final validation: must be 10 to 15 digits
  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return cleaned;
}
