import { useState } from 'react'
import { Share2, Check, Loader2 } from 'lucide-react'
import { XIcon } from './icons/XIcon'

/**
 * Tüm fonların getirilerini X (Twitter)'da paylaşmak için buton
 * Sadece admin kullanıcılara görünür
 */
export function ShareOnTwitterButton({ funds, updateTime }) {
    const [isSharing, setIsSharing] = useState(false)
    const [copied, setCopied] = useState(false)

    const generateTweetText = () => {
        if (!funds || funds.length === 0) {
            return null
        }

        // Use updateTime from props (Google Sheets) or fallback to current time
        let timeStr = ''
        if (updateTime) {
            // updateTime could be "14:35" or full date string
            timeStr = updateTime
        } else {
            const now = new Date()
            timeStr = now.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
            })
        }

        const now = new Date()
        const dateStr = now.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit'
        })

        // Header
        let tweet = `📊 Fon Getirileri (${dateStr} ${timeStr})\n\n`

        // Use funds in their original order (as passed from Overview)
        funds.forEach(fund => {
            const returnRate = fund.returnRate || 0
            let emoji = '🟡' // neutral
            let sign = ''

            if (returnRate > 0.01) {
                emoji = '🟢'
                sign = '+'
            } else if (returnRate < -0.01) {
                emoji = '🔴'
                sign = ''
            }

            const formattedRate = returnRate.toFixed(2).replace('.', ',')
            tweet += `${emoji} #${fund.code} ${sign}%${formattedRate}\n`
        })

        // Footer hashtags (added #mavitik #bist100)
        tweet += `\n#borsa #yatırım #fon #mavitik #bist100`

        return tweet
    }

    const handleShareOnTwitter = () => {
        setIsSharing(true)

        const tweetText = generateTweetText()
        if (!tweetText) {
            alert('Paylaşılacak fon verisi bulunamadı!')
            setIsSharing(false)
            return
        }

        // Open Twitter intent URL
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
        window.open(twitterUrl, '_blank', 'width=550,height=420')

        setIsSharing(false)
    }

    const handleCopyToClipboard = async () => {
        const tweetText = generateTweetText()
        if (!tweetText) {
            alert('Kopyalanacak fon verisi bulunamadı!')
            return
        }

        try {
            await navigator.clipboard.writeText(tweetText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Clipboard error:', err)
            alert('Kopyalama başarısız oldu')
        }
    }

    return (
        <div className="flex items-center gap-2">
            {/* Copy Button */}
            <button
                onClick={handleCopyToClipboard}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                title="Tweet Metnini Kopyala"
            >
                {copied ? (
                    <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="hidden sm:inline">Kopyalandı!</span>
                    </>
                ) : (
                    <>
                        <Share2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Kopyala</span>
                    </>
                )}
            </button>

            {/* Share on Twitter Button */}
            <button
                onClick={handleShareOnTwitter}
                disabled={isSharing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                title="X'te Paylaş"
            >
                {isSharing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <XIcon className="h-4 w-4 fill-current" />
                )}
                <span className="hidden sm:inline">X'te Paylaş</span>
            </button>
        </div>
    )
}
