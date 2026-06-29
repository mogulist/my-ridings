import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/private/', '/admin/'], // 예시: 비공개 경로
    },
    sitemap: 'https://kfondo.cc/sitemap.xml',
  };
}
