// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'FileSwift - Universal File Converter',
      meta: [
        { name: 'description', content: 'Convert your files quickly and easily with FileSwift' },
      ],
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap' },
      ],
    },
  },

  compatibilityDate: '2025-03-02',
});