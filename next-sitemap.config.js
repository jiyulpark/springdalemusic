/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://springdalemusic.vercel.app',
  generateRobotsTxt: true, // robots.txt 파일도 자동 생성
  sitemapSize: 7000,
  changefreq: 'daily',
  priority: 0.7,
  exclude: ['/admin/*'], // 관리자 페이지는 제외
  robotsTxtOptions: {
    additionalSitemaps: [],
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/*']
      }
    ]
  }
} 