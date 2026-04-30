// Post-job Google review request via WhatsApp
// Builds a wa.me link with first-name greeting, after-photo URL, and the
// direct GBP review link from NEXT_PUBLIC_GOOGLE_REVIEW_LINK.

export function buildReviewRequestLink(params: {
  clientName: string
  clientPhone?: string
  afterPhotoUrl?: string
  googleReviewLink: string
}): string {
  const firstName = params.clientName.split(' ')[0]
  const photoLine = params.afterPhotoUrl
    ? `\n\nHere are your before & after photos: ${params.afterPhotoUrl}`
    : ''

  const message = `Hi ${firstName},

Just finished up - hope you're happy with the result!${photoLine}

If you've got 60 seconds, a Google review really helps us:
${params.googleReviewLink}

Thanks for having us,
Marcos - Wirral Garden & Property`

  const phone = params.clientPhone?.replace(/[^0-9+]/g, '')
  const formattedPhone = phone?.startsWith('0')
    ? '44' + phone.slice(1)
    : phone?.startsWith('+')
      ? phone.slice(1)
      : phone

  const encoded = encodeURIComponent(message)
  return formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
}
