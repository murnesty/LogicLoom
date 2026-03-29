/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** ReceiptCalculator.Api base URL — enhanced OCR uses POST /api/vision/document-text (local + prod). */
  readonly VITE_VISION_PROXY_URL?: string
  /** Ko-fi, Buy Me a Coffee, or any support page */
  readonly VITE_SUPPORT_URL?: string
  /** Google AdSense publisher id, e.g. ca-pub-xxxxxxxxxxxxxxxx */
  readonly VITE_ADSENSE_CLIENT?: string
  /** Ad unit slot id from AdSense */
  readonly VITE_ADSENSE_SLOT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
