import { db } from '../firebase'
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore'

const FUNDS_COLLECTION = 'funds'

// Subscribe to all funds (Real-time)
export function subscribeToFunds(callback) {
    const q = collection(db, FUNDS_COLLECTION)
    return onSnapshot(q, (snapshot) => {
        const funds = []
        snapshot.forEach((doc) => {
            funds.push({ id: doc.id, ...doc.data() })
        })
        // Sort by order field (ascending)
        funds.sort((a, b) => (a.order || 0) - (b.order || 0))
        callback(funds)
    })
}

// Add a new fund
export async function addFund(code, name) {
    const fundRef = doc(db, FUNDS_COLLECTION, code)
    await setDoc(fundRef, {
        code,
        name,
        holdings: [],
        multiplier: 1, // Default multiplier
        order: Date.now(), // Add to end by default
        createdAt: serverTimestamp()
    })
}

// Delete a fund
export async function deleteFund(fundId) {
    await deleteDoc(doc(db, FUNDS_COLLECTION, fundId))
}

// Subscribe to a specific fund (Real-time)
export function subscribeToFund(fundId, callback) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    return onSnapshot(fundRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() })
        } else {
            callback(null)
        }
    })
}

// Update fund holdings
export async function updateFundHoldings(fundId, holdings) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    await updateDoc(fundRef, {
        holdings
    })
}

// Update fund multiplier
export async function updateFundMultiplier(fundId, multiplier) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    await updateDoc(fundRef, {
        multiplier
    })
}

// Update fund PPF rate
export async function updateFundPpfRate(fundId, ppfRate) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    await updateDoc(fundRef, {
        ppfRate
    })
}

// Update fund PPF weight
export async function updateFundPpfWeight(fundId, ppfWeight) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    await updateDoc(fundRef, {
        ppfWeight
    })
}

// Update fund GYF rate
export async function updateFundGyfRate(fundId, gyfRate) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    await updateDoc(fundRef, {
        gyfRate
    })
}

// Update fund VIOP rate
export async function updateFundViopRate(fundId, viopRate) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    await updateDoc(fundRef, {
        viopRate
    })
}

// Update fund VIOP weight
export async function updateFundViopWeight(fundId, viopWeight) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    await updateDoc(fundRef, {
        viopWeight
    })
}

// Update fund VIOP leverage
export async function updateFundViopLeverage(fundId, viopLeverage) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    await updateDoc(fundRef, {
        viopLeverage
    })
}

// Update fund name
export async function updateFundName(fundId, name) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    await updateDoc(fundRef, {
        name
    })
}

// Update fund totals (Calculated values) and optionally holdings
export async function updateFundTotals(fundId, totals, holdings = null) {
    const fundRef = doc(db, FUNDS_COLLECTION, fundId)
    const updateData = {
        totalValue: totals.totalValue,
        totalProfit: totals.totalProfit,
        returnRate: totals.returnRate,
        lastUpdated: serverTimestamp()
    }

    if (holdings) {
        updateData.holdings = holdings
    }

    await updateDoc(fundRef, updateData)
}

// Update funds order (Batch update)
export async function updateFundsOrder(funds) {
    const batch = writeBatch(db)
    funds.forEach((fund, index) => {
        const fundRef = doc(db, FUNDS_COLLECTION, fund.id)
        batch.update(fundRef, { order: index })
    })
    await batch.commit()
}

// Helper to migrate local storage data (One-time use)
export async function migrateLocalStorageToFirestore() {
    try {
        // TLY
        const tlyData = localStorage.getItem('portfolio_TLY')
        if (tlyData) {
            await addFund('TLY', 'TLY - TERA PORTFÖY HİSSE SENEDİ FONU')
            await updateFundHoldings('TLY', JSON.parse(tlyData))
        }

        // DFI
        const dfiData = localStorage.getItem('portfolio_DFI')
        if (dfiData) {
            await addFund('DFI', 'DFI - ATLAS PORTFÖY BİRİNCİ HİSSE SENEDİ SERBEST FON')
            await updateFundHoldings('DFI', JSON.parse(dfiData))
            await updateFundMultiplier('DFI', 0.6349)
        }

        console.log('Migration completed')
    } catch (error) {
        console.error('Migration failed:', error)
    }
}
