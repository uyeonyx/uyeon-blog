/** @type {import("pliny/config").PlinyConfig } */
const siteMetadata = {
  title: "Uyeon's Blog",
  author: 'Lee Uyeon',
  headerTitle: 'uyeon.dev',
  description: 'Engineering principles, system design, and deep focus on what matters',
  language: 'ko-kr',
  theme: 'system', // system, dark or light
  siteUrl: 'https://uyeon.dev',
  siteRepo: 'https://github.com/uyeonyx/uyeon-blog',
  siteLogo: `${process.env.BASE_PATH || ''}/static/images/logo.png`,
  socialBanner: `${process.env.BASE_PATH || ''}/static/images/og-banner.png`,
  email: 'uyeonyx@gmail.com',
  github: 'https://github.com/uyeonyx',
  linkedin: 'https://www.linkedin.com/in/uyeonyx',
  locale: 'ko-KR',
  // set to true if you want a navbar fixed to the top
  stickyNav: false,
  analytics: {
    // If you want to use an analytics provider you have to add it to the
    // content security policy in the `next.config.js` file.
    // supports Plausible, Simple Analytics, Umami, Posthog or Google Analytics.
    umamiAnalytics: {
      umamiWebsiteId: '95c9226d-eaf2-49b9-94f6-1c760237ef58',
      src: 'https://umami.uyeon.dev/script.js',
    },
    // plausibleAnalytics: {
    //   plausibleDataDomain: '', // e.g. tailwind-nextjs-starter-blog.vercel.app
    // If you are hosting your own Plausible.
    //   src: '', // e.g. https://plausible.my-domain.com/js/script.js
    // },
    // simpleAnalytics: {},
    // posthogAnalytics: {
    //   posthogProjectApiKey: '', // e.g. 123e4567-e89b-12d3-a456-426614174000
    // },
    // googleAnalytics: {
    //   googleAnalyticsId: '', // e.g. G-XXXXXXX
    // },
  },
  search: {
    provider: 'kbar', // kbar or algolia
    kbarConfig: {
      searchDocumentsPath: `${process.env.BASE_PATH || ''}/search.json`, // path to load documents to search
    },
    // provider: 'algolia',
    // algoliaConfig: {
    //   // The application ID provided by Algolia
    //   appId: 'R2IYF7ETH7',
    //   // Public API key: it is safe to commit it
    //   apiKey: '599cec31baffa4868cae4e79f180729b',
    //   indexName: 'docsearch',
    // },
  },
}

module.exports = siteMetadata
