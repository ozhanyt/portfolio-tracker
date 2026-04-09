const DIRECT_SHEET_API_URL = import.meta.env.VITE_SHEET_API_URL
const HOSTING_PROXY_PATH = '/api/sheet-proxy.php'

function isCustomHostedDomain(hostname) {
  return hostname === 'fontahmin.com.tr' || hostname === 'www.fontahmin.com.tr'
}

export function getSheetApiUrl() {
  if (typeof window !== 'undefined' && isCustomHostedDomain(window.location.hostname)) {
    return HOSTING_PROXY_PATH
  }

  return DIRECT_SHEET_API_URL || HOSTING_PROXY_PATH
}
