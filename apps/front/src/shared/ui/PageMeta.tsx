import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'Druzya'
const SITE_URL = 'https://druzya.app'
const DEFAULT_IMAGE = `${SITE_URL}/favicon.svg`

interface PageMetaProps {
  title: string
  description: string
  canonicalPath?: string
  image?: string
}

export function PageMeta({ title, description, canonicalPath = '', image = DEFAULT_IMAGE }: PageMetaProps) {
  const fullTitle = `${title} | ${SITE_NAME}`
  const canonicalUrl = `${SITE_URL}${canonicalPath}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="canonical" href={canonicalUrl} />
    </Helmet>
  )
}
