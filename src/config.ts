import type {
  SignaturePattern,
  HeaderSignature,
  AnalyticsSignature,
  ServerConfig,
} from './types.js';

/**
 * Default server configuration
 */
export const defaultServerConfig: ServerConfig = {
  port: parseInt(process.env.PORT || '8080', 10),
  host: process.env.HOST || '127.0.0.1',
  timeout: parseInt(process.env.FETCH_TIMEOUT || '10000', 10),
};

/**
 * Header-based detection signatures
 */
export const headerSignatures: HeaderSignature[] = [
  {
    header: 'x-powered-by',
    patterns: [
      { pattern: /express/i, technology: 'Express', category: 'backend-framework' },
      { pattern: /php/i, technology: 'PHP', category: 'runtime' },
      { pattern: /asp\.net/i, technology: 'ASP.NET', category: 'backend-framework' },
      { pattern: /next\.js/i, technology: 'Next.js', category: 'frontend-framework' },
    ],
  },
  {
    header: 'server',
    patterns: [
      { pattern: /nginx/i, technology: 'nginx', category: 'server' },
      { pattern: /apache/i, technology: 'Apache', category: 'server' },
      { pattern: /cloudflare/i, technology: 'Cloudflare', category: 'server' },
      { pattern: /microsoft-iis/i, technology: 'Microsoft IIS', category: 'server' },
    ],
  },
  {
    header: 'x-drupal-cache',
    patterns: [
      { pattern: /.+/, technology: 'Drupal', category: 'cms' },
    ],
  },
  {
    header: 'x-generator',
    patterns: [
      { pattern: /wordpress/i, technology: 'WordPress', category: 'cms' },
      { pattern: /ghost/i, technology: 'Ghost', category: 'cms' },
      { pattern: /drupal/i, technology: 'Drupal', category: 'cms' },
      { pattern: /joomla/i, technology: 'Joomla', category: 'cms' },
    ],
  },
  {
    header: 'x-shopify-stage',
    patterns: [
      { pattern: /.+/, technology: 'Shopify', category: 'ecommerce' },
    ],
  },
];

/**
 * HTML/Script-based detection signatures for frameworks
 */
export const frameworkSignatures: SignaturePattern[] = [
  // React
  {
    name: 'React',
    patterns: [
      /\breact\b/i,
      /\bReactDOM\b/,
      /_reactRootContainer/,
      /data-reactroot/,
      /react\.production\.min\.js/,
      /react-dom/,
    ],
    category: 'frontend-framework',
    versionPattern: /react@(\d+\.\d+\.\d+)/,
  },
  // Vue.js
  {
    name: 'Vue.js',
    patterns: [
      /\bVue\b/,
      /__VUE__/,
      /\bv-if\b/,
      /\bv-for\b/,
      /\bv-model\b/,
      /vue\.runtime/,
      /vue\.global/,
    ],
    category: 'frontend-framework',
    versionPattern: /vue@(\d+\.\d+\.\d+)/,
  },
  // Angular
  {
    name: 'Angular',
    patterns: [
      /ng-version/,
      /angular\.js/,
      /angular\.min\.js/,
      /\bng-app\b/,
      /\bng-controller\b/,
      /@angular\/core/,
    ],
    category: 'frontend-framework',
    versionPattern: /ng-version="(\d+\.\d+\.\d+)"/,
  },
  // Next.js
  {
    name: 'Next.js',
    patterns: [
      /__NEXT_DATA__/,
      /_next\//,
      /next\/dist/,
      /next-route-announcer/,
    ],
    category: 'frontend-framework',
    versionPattern: /"next":"(\d+\.\d+\.\d+)"/,
  },
  // Nuxt
  {
    name: 'Nuxt',
    patterns: [
      /__NUXT__/,
      /\bnuxt\b/i,
      /_nuxt\//,
      /nuxt\.js/,
    ],
    category: 'frontend-framework',
  },
  // jQuery
  {
    name: 'jQuery',
    patterns: [
      /jquery/i,
      /\bjQuery\b/,
      /jquery\.min\.js/,
      /jquery-\d+/,
    ],
    category: 'library',
    versionPattern: /jquery[.-](\d+\.\d+\.\d+)/i,
  },
  // Bootstrap
  {
    name: 'Bootstrap',
    patterns: [
      /bootstrap/i,
      /bootstrap\.min\.js/,
      /bootstrap\.min\.css/,
      /class="[^"]*\b(container|row|col-)/,
    ],
    category: 'css-framework',
    versionPattern: /bootstrap[.-](\d+\.\d+\.\d+)/i,
  },
  // Tailwind CSS
  {
    name: 'Tailwind CSS',
    patterns: [
      /tailwind/i,
      /tailwindcss/,
      /class="[^"]*\b(flex|grid|p-\d|m-\d|text-\w+|bg-\w+)/,
    ],
    category: 'css-framework',
  },
  // WordPress
  {
    name: 'WordPress',
    patterns: [
      /\/wp-content\//,
      /\/wp-includes\//,
      /wp-json/,
      /wordpress/i,
    ],
    category: 'cms',
    versionPattern: /ver=(\d+\.\d+\.?\d*)/,
  },
  // Shopify
  {
    name: 'Shopify',
    patterns: [
      /\bShopify\b/,
      /cdn\.shopify\.com/,
      /shopify-section/,
      /myshopify\.com/,
    ],
    category: 'ecommerce',
  },
  // Wix
  {
    name: 'Wix',
    patterns: [
      /wix-style/,
      /wix-viewer/,
      /static\.wixstatic\.com/,
      /wix\.com/,
    ],
    category: 'cms',
  },
  // Svelte
  {
    name: 'Svelte',
    patterns: [
      /\bsvelte\b/i,
      /svelte-\w+/,
      /__svelte/,
    ],
    category: 'frontend-framework',
  },
  // Gatsby
  {
    name: 'Gatsby',
    patterns: [
      /gatsby/i,
      /___gatsby/,
      /gatsby-image/,
    ],
    category: 'frontend-framework',
  },
  // Remix
  {
    name: 'Remix',
    patterns: [
      /__remixContext/,
      /remix/i,
    ],
    category: 'frontend-framework',
  },
];

/**
 * Analytics detection signatures
 */
export const analyticsSignatures: AnalyticsSignature[] = [
  // Google Analytics
  {
    name: 'Google Analytics',
    type: 'analytics',
    patterns: [
      /ga\.js/,
      /\bgtag\(/,
      /analytics\.js/,
      /\bUA-\d+-\d+/,
      /google-analytics\.com/,
      /googletagmanager\.com\/gtag/,
    ],
  },
  // Google Tag Manager
  {
    name: 'Google Tag Manager',
    type: 'tracking',
    patterns: [
      /gtm\.js/,
      /\bGTM-[A-Z0-9]+/,
      /googletagmanager\.com\/gtm/,
    ],
  },
  // Facebook Pixel
  {
    name: 'Facebook Pixel',
    type: 'marketing',
    patterns: [
      /\bfbq\(/,
      /facebook\.net\/en_US\/fbevents/,
      /connect\.facebook\.net.*fbevents/,
    ],
  },
  // Hotjar
  {
    name: 'Hotjar',
    type: 'analytics',
    patterns: [
      /hotjar\.com/,
      /_hjSettings/,
      /hj\.q/,
    ],
  },
  // Segment
  {
    name: 'Segment',
    type: 'analytics',
    patterns: [
      /segment\.com/,
      /cdn\.segment\.com/,
      /analytics\.load\(/,
    ],
  },
  // Mixpanel
  {
    name: 'Mixpanel',
    type: 'analytics',
    patterns: [
      /mixpanel/i,
      /cdn\.mxpnl\.com/,
    ],
  },
  // Heap
  {
    name: 'Heap',
    type: 'analytics',
    patterns: [
      /heap-\d+/,
      /heapanalytics\.com/,
    ],
  },
  // Amplitude
  {
    name: 'Amplitude',
    type: 'analytics',
    patterns: [
      /amplitude/i,
      /cdn\.amplitude\.com/,
    ],
  },
  // Intercom
  {
    name: 'Intercom',
    type: 'marketing',
    patterns: [
      /intercom/i,
      /widget\.intercom\.io/,
      /intercomSettings/,
    ],
  },
  // HubSpot
  {
    name: 'HubSpot',
    type: 'marketing',
    patterns: [
      /hubspot/i,
      /hs-scripts\.com/,
      /hbspt\.forms/,
    ],
  },
  // Drift
  {
    name: 'Drift',
    type: 'marketing',
    patterns: [
      /drift\.com/,
      /js\.driftt\.com/,
    ],
  },
  // LinkedIn Insight
  {
    name: 'LinkedIn Insight',
    type: 'marketing',
    patterns: [
      /linkedin\.com\/px/,
      /snap\.licdn\.com/,
      /_linkedin_data_partner_id/,
    ],
  },
  // Twitter Pixel
  {
    name: 'Twitter Pixel',
    type: 'marketing',
    patterns: [
      /static\.ads-twitter\.com/,
      /twq\(/,
    ],
  },
  // Pinterest Tag
  {
    name: 'Pinterest Tag',
    type: 'marketing',
    patterns: [
      /pintrk\(/,
      /ct\.pinterest\.com/,
    ],
  },
  // TikTok Pixel
  {
    name: 'TikTok Pixel',
    type: 'marketing',
    patterns: [
      /analytics\.tiktok\.com/,
      /ttq\.load/,
    ],
  },
];

/**
 * Export all signatures as a config object for easy extension
 */
export const signatureConfig = {
  headers: headerSignatures,
  frameworks: frameworkSignatures,
  analytics: analyticsSignatures,
};
