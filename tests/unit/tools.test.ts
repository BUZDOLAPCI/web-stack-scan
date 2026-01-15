import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectFrameworks } from '../../src/tools/frameworks.js';
import { detectAnalytics } from '../../src/tools/analytics.js';
import { fingerprint } from '../../src/tools/fingerprint.js';

describe('detectFrameworks', () => {
  describe('HTML detection', () => {
    it('should detect React from HTML', () => {
      const html = `
        <html>
          <head><title>React App</title></head>
          <body>
            <div id="root" data-reactroot></div>
            <script src="react.production.min.js"></script>
          </body>
        </html>
      `;

      const result = detectFrameworks(html);

      expect(result.ok).toBe(true);
      expect(result.data.detected).toHaveLength(1);
      expect(result.data.detected[0].name).toBe('React');
      expect(result.data.detected[0].category).toBe('frontend-framework');
    });

    it('should detect Vue.js from HTML', () => {
      const html = `
        <html>
          <body>
            <div id="app" v-if="show">
              <span v-for="item in items">{{ item }}</span>
            </div>
            <script src="vue.runtime.min.js"></script>
          </body>
        </html>
      `;

      const result = detectFrameworks(html);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'Vue.js')).toBe(true);
    });

    it('should detect Angular from HTML', () => {
      const html = `
        <html ng-version="17.0.0">
          <body ng-app="myApp">
            <div ng-controller="MainCtrl"></div>
          </body>
        </html>
      `;

      const result = detectFrameworks(html);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'Angular')).toBe(true);
      const angular = result.data.detected.find(t => t.name === 'Angular');
      expect(angular?.version).toBe('17.0.0');
    });

    it('should detect Next.js from __NEXT_DATA__', () => {
      const html = `
        <html>
          <body>
            <script id="__NEXT_DATA__" type="application/json">{"page":"/"}</script>
            <script src="/_next/static/chunks/main.js"></script>
          </body>
        </html>
      `;

      const result = detectFrameworks(html);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'Next.js')).toBe(true);
    });

    it('should detect Nuxt from __NUXT__', () => {
      const html = `
        <html>
          <body>
            <script>window.__NUXT__={}</script>
            <script src="/_nuxt/app.js"></script>
          </body>
        </html>
      `;

      const result = detectFrameworks(html);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'Nuxt')).toBe(true);
    });

    it('should detect jQuery from HTML', () => {
      const html = `
        <html>
          <head>
            <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
          </head>
          <body></body>
        </html>
      `;

      const result = detectFrameworks(html);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'jQuery')).toBe(true);
      const jquery = result.data.detected.find(t => t.name === 'jQuery');
      expect(jquery?.version).toBe('3.6.0');
    });

    it('should detect WordPress from wp-content paths', () => {
      const html = `
        <html>
          <head>
            <link rel="stylesheet" href="/wp-content/themes/theme/style.css">
          </head>
          <body>
            <script src="/wp-includes/js/jquery.js"></script>
          </body>
        </html>
      `;

      const result = detectFrameworks(html);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'WordPress')).toBe(true);
    });

    it('should detect Shopify from HTML', () => {
      const html = `
        <html>
          <head>
            <script src="https://cdn.shopify.com/s/files/1/0001/script.js"></script>
          </head>
          <body class="shopify-section">
            Powered by Shopify
          </body>
        </html>
      `;

      const result = detectFrameworks(html);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'Shopify')).toBe(true);
    });

    it('should detect multiple frameworks', () => {
      const html = `
        <html>
          <head>
            <script src="jquery.min.js"></script>
            <link rel="stylesheet" href="bootstrap.min.css">
          </head>
          <body>
            <div class="container">
              <div class="row">
                <div class="col-md-6"></div>
              </div>
            </div>
          </body>
        </html>
      `;

      const result = detectFrameworks(html);

      expect(result.ok).toBe(true);
      expect(result.data.detected.length).toBeGreaterThanOrEqual(2);
      expect(result.data.detected.some(t => t.name === 'jQuery')).toBe(true);
      expect(result.data.detected.some(t => t.name === 'Bootstrap')).toBe(true);
    });

    it('should handle empty HTML', () => {
      const result = detectFrameworks('');

      expect(result.ok).toBe(true);
      expect(result.data.detected).toHaveLength(0);
      expect(result.meta.warnings).toContain('Empty HTML content provided');
    });
  });

  describe('Header detection', () => {
    it('should detect Express from X-Powered-By header', () => {
      const html = '<html><body></body></html>';
      const headers = { 'X-Powered-By': 'Express' };

      const result = detectFrameworks(html, headers);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'Express')).toBe(true);
      expect(result.data.detected.find(t => t.name === 'Express')?.confidence).toBe('high');
    });

    it('should detect nginx from Server header', () => {
      const html = '<html><body></body></html>';
      const headers = { Server: 'nginx/1.21.0' };

      const result = detectFrameworks(html, headers);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'nginx')).toBe(true);
    });

    it('should detect Cloudflare from Server header', () => {
      const html = '<html><body></body></html>';
      const headers = { Server: 'cloudflare' };

      const result = detectFrameworks(html, headers);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'Cloudflare')).toBe(true);
    });

    it('should detect PHP from X-Powered-By header', () => {
      const html = '<html><body></body></html>';
      const headers = { 'X-Powered-By': 'PHP/8.1.0' };

      const result = detectFrameworks(html, headers);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'PHP')).toBe(true);
    });

    it('should detect WordPress from X-Generator header', () => {
      const html = '<html><body></body></html>';
      const headers = { 'X-Generator': 'WordPress 6.4' };

      const result = detectFrameworks(html, headers);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'WordPress')).toBe(true);
    });

    it('should handle case-insensitive headers', () => {
      const html = '<html><body></body></html>';
      const headers = { 'x-powered-by': 'express' };

      const result = detectFrameworks(html, headers);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'Express')).toBe(true);
    });

    it('should combine HTML and header detection', () => {
      const html = `
        <html>
          <body>
            <div data-reactroot></div>
          </body>
        </html>
      `;
      const headers = { Server: 'nginx' };

      const result = detectFrameworks(html, headers);

      expect(result.ok).toBe(true);
      expect(result.data.detected.some(t => t.name === 'React')).toBe(true);
      expect(result.data.detected.some(t => t.name === 'nginx')).toBe(true);
    });
  });

  describe('Confidence levels', () => {
    it('should have high confidence for multiple pattern matches', () => {
      const html = `
        <html>
          <body>
            <div data-reactroot>
              <div id="__reactRootContainer"></div>
            </div>
            <script src="react.production.min.js"></script>
            <script src="react-dom.production.min.js"></script>
          </body>
        </html>
      `;

      const result = detectFrameworks(html);
      const react = result.data.detected.find(t => t.name === 'React');

      expect(react?.confidence).toBe('high');
    });
  });

  describe('Response envelope', () => {
    it('should return proper response envelope structure', () => {
      const html = '<html><body></body></html>';
      const result = detectFrameworks(html);

      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('retrieved_at');
      expect(result.meta).toHaveProperty('pagination');
      expect(result.meta.pagination).toHaveProperty('next_cursor');
      expect(result.meta).toHaveProperty('warnings');
    });
  });
});

describe('detectAnalytics', () => {
  it('should detect Google Analytics from gtag', () => {
    const html = `
      <html>
        <head>
          <script async src="https://www.googletagmanager.com/gtag/js?id=UA-12345-1"></script>
          <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'UA-12345-1');
          </script>
        </head>
        <body></body>
      </html>
    `;

    const result = detectAnalytics(html);

    expect(result.ok).toBe(true);
    expect(result.data.detected.some(a => a.name === 'Google Analytics')).toBe(true);
    const ga = result.data.detected.find(a => a.name === 'Google Analytics');
    expect(ga?.type).toBe('analytics');
  });

  it('should detect Google Tag Manager', () => {
    const html = `
      <html>
        <head>
          <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-XXXXX');</script>
        </head>
        <body></body>
      </html>
    `;

    const result = detectAnalytics(html);

    expect(result.ok).toBe(true);
    expect(result.data.detected.some(a => a.name === 'Google Tag Manager')).toBe(true);
    const gtm = result.data.detected.find(a => a.name === 'Google Tag Manager');
    expect(gtm?.type).toBe('tracking');
  });

  it('should detect Facebook Pixel', () => {
    const html = `
      <html>
        <head>
          <script>
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1234567890');
            fbq('track', 'PageView');
          </script>
        </head>
        <body></body>
      </html>
    `;

    const result = detectAnalytics(html);

    expect(result.ok).toBe(true);
    expect(result.data.detected.some(a => a.name === 'Facebook Pixel')).toBe(true);
    const fb = result.data.detected.find(a => a.name === 'Facebook Pixel');
    expect(fb?.type).toBe('marketing');
  });

  it('should detect Hotjar', () => {
    const html = `
      <html>
        <head>
          <script>
            (function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:1234567,hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          </script>
        </head>
        <body></body>
      </html>
    `;

    const result = detectAnalytics(html);

    expect(result.ok).toBe(true);
    expect(result.data.detected.some(a => a.name === 'Hotjar')).toBe(true);
  });

  it('should detect Segment', () => {
    const html = `
      <html>
        <head>
          <script>
            !function(){var analytics=window.analytics=window.analytics||[];
            analytics.load("YOUR_WRITE_KEY");
            analytics.page();
            }();
          </script>
          <script src="https://cdn.segment.com/analytics.js/v1/YOUR_WRITE_KEY/analytics.min.js"></script>
        </head>
        <body></body>
      </html>
    `;

    const result = detectAnalytics(html);

    expect(result.ok).toBe(true);
    expect(result.data.detected.some(a => a.name === 'Segment')).toBe(true);
  });

  it('should detect multiple analytics tools', () => {
    const html = `
      <html>
        <head>
          <script>gtag('config', 'UA-12345-1');</script>
          <script>fbq('track', 'PageView');</script>
          <script src="https://static.hotjar.com/c/hotjar-123.js"></script>
        </head>
        <body></body>
      </html>
    `;

    const result = detectAnalytics(html);

    expect(result.ok).toBe(true);
    expect(result.data.detected.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle empty HTML', () => {
    const result = detectAnalytics('');

    expect(result.ok).toBe(true);
    expect(result.data.detected).toHaveLength(0);
    expect(result.meta.warnings).toContain('Empty HTML content provided');
  });

  it('should not duplicate detections', () => {
    const html = `
      <html>
        <head>
          <script>gtag('config', 'UA-12345-1');</script>
          <script>gtag('config', 'UA-67890-1');</script>
          <script src="https://www.google-analytics.com/analytics.js"></script>
        </head>
        <body></body>
      </html>
    `;

    const result = detectAnalytics(html);
    const gaCount = result.data.detected.filter(a => a.name === 'Google Analytics').length;

    expect(gaCount).toBe(1);
  });

  it('should return proper response envelope structure', () => {
    const html = '<html><body></body></html>';
    const result = detectAnalytics(html);

    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('meta');
    expect(result.meta).toHaveProperty('retrieved_at');
    expect(result.meta).toHaveProperty('pagination');
    expect(result.meta).toHaveProperty('warnings');
  });
});

describe('fingerprint', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should fetch URL and detect technologies', async () => {
    const mockHtml = `
      <html>
        <head>
          <script src="react.production.min.js"></script>
          <script>gtag('config', 'UA-12345-1');</script>
        </head>
        <body>
          <div data-reactroot></div>
        </body>
      </html>
    `;

    const mockHeaders = new Headers({
      'Content-Type': 'text/html',
      'X-Powered-By': 'Express',
      'Server': 'nginx',
    });

    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(mockHtml),
      headers: mockHeaders,
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await fingerprint('https://example.com');

    expect(result.ok).toBe(true);
    expect(result.data.url).toBe('https://example.com');
    expect(result.data.technologies.some(t => t.name === 'React')).toBe(true);
    expect(result.data.technologies.some(t => t.name === 'Express')).toBe(true);
    expect(result.data.technologies.some(t => t.name === 'nginx')).toBe(true);
    expect(result.data.analytics.some(a => a.name === 'Google Analytics')).toBe(true);
  });

  it('should add protocol if missing', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve('<html></html>'),
      headers: new Headers(),
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await fingerprint('example.com');

    expect(result.data.url).toBe('https://example.com');
  });

  it('should handle fetch errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const result = await fingerprint('https://example.com');

    expect(result.ok).toBe(false);
    expect(result.meta.warnings.length).toBeGreaterThan(0);
    expect(result.meta.warnings[0]).toContain('Network error');
  });

  it('should handle HTTP errors', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await fingerprint('https://example.com');

    expect(result.ok).toBe(false);
    expect(result.meta.warnings.length).toBeGreaterThan(0);
    expect(result.meta.warnings[0]).toContain('404');
  });

  it('should handle invalid URLs', async () => {
    const result = await fingerprint('not-a-valid-url://test');

    expect(result.ok).toBe(false);
    expect(result.meta.warnings.length).toBeGreaterThan(0);
  });

  it('should handle timeout', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    vi.mocked(fetch).mockRejectedValue(abortError);

    const result = await fingerprint('https://example.com', 100);

    expect(result.ok).toBe(false);
    expect(result.meta.warnings[0]).toContain('timeout');
  });

  it('should return proper response envelope structure', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve('<html></html>'),
      headers: new Headers(),
    };

    vi.mocked(fetch).mockResolvedValue(mockResponse as Response);

    const result = await fingerprint('https://example.com');

    expect(result).toHaveProperty('ok');
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('url');
    expect(result.data).toHaveProperty('technologies');
    expect(result.data).toHaveProperty('analytics');
    expect(result.data).toHaveProperty('headers');
    expect(result).toHaveProperty('meta');
    expect(result.meta).toHaveProperty('source');
    expect(result.meta).toHaveProperty('retrieved_at');
    expect(result.meta).toHaveProperty('pagination');
    expect(result.meta).toHaveProperty('warnings');
  });
});
