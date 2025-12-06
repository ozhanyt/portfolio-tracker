import { db } from '@/firebase'
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore'

const COLLECTION_NAME = 'stock_logos'

/**
 * Save a logo URL for a specific stock symbol
 * @param {string} symbol - Stock symbol (e.g., THYAO)
 * @param {string} url - Logo image URL
 */
export async function saveLogoUrl(symbol, url) {
    if (!symbol) return

    try {
        const docRef = doc(db, COLLECTION_NAME, symbol.toUpperCase())
        await setDoc(docRef, {
            url,
            updatedAt: new Date()
        }, { merge: true })
        return true
    } catch (error) {
        console.error('Error saving logo URL:', error)
        throw error
    }
}

/**
 * Get logo URL for a specific stock symbol
 * @param {string} symbol 
 */
export async function getLogoUrl(symbol) {
    if (!symbol) return null

    try {
        const docRef = doc(db, COLLECTION_NAME, symbol.toUpperCase())
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            return docSnap.data().url
        }
        return null
    } catch (error) {
        console.error('Error fetching logo URL:', error)
        return null
    }
}

/**
 * Fetch all logo mappings (for bulk loading)
 * Returns an object: { "THYAO": "url...", "AKBNK": "url..." }
 */
export async function getAllLogos() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME))
        const logoMap = {}

        querySnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.url) {
                logoMap[doc.id] = data.url
            }
        })

        return logoMap
    } catch (error) {
        console.error('Error fetching all logos:', error)
        return {}
    }
}
