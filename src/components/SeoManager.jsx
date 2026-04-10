import { useEffect } from 'react'

function upsertMeta(selector, attributes) {
  if (typeof document === 'undefined') return

  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })
}

function upsertLink(rel, href) {
  if (typeof document === 'undefined') return

  let element = document.head.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

function upsertJsonLd(id, payload) {
  if (typeof document === 'undefined') return

  let element = document.head.querySelector(`#${id}`)
  if (!element) {
    element = document.createElement('script')
    element.type = 'application/ld+json'
    element.id = id
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(payload)
}

export function SeoManager({ title, description, canonicalPath, type = 'website', noIndex = false, jsonLd }) {
  useEffect(() => {
    if (typeof document === 'undefined') return

    const canonicalUrl = `https://fontahmin.com.tr${canonicalPath}`
    document.title = title

    upsertMeta('meta[name="description"]', { name: 'description', content: description })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: noIndex ? 'noindex,nofollow' : 'index,follow' })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'fontahmin.com.tr' })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description })
    upsertLink('canonical', canonicalUrl)

    if (jsonLd) {
      upsertJsonLd('seo-jsonld', jsonLd)
    }
  }, [title, description, canonicalPath, type, noIndex, jsonLd])

  return null
}
