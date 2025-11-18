import { API_URL } from '../config/api';

/**
 * Converts a relative URL or path to an absolute URL
 * @param url - The URL or path to convert
 * @returns The absolute URL
 */
export function toAbsoluteUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // For uploads paths, prepend the base URL without /api
  // API_URL is like 'https://simplix.drive.paraweb.fr/api'
  // url is like '/uploads/image-xxx.png'
  // Result should be 'https://simplix.drive.paraweb.fr/uploads/image-xxx.png'
  const baseUrl = API_URL.replace(/\/api$/, ''); // Remove trailing /api if present
  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
}
