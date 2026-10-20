import { SITE } from '@/lib/util';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/write'],
    },
    sitemap: SITE + '/sitemap.xml',
  };
}
