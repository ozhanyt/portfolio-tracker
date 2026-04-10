import { db } from '@/firebase'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from 'firebase/firestore'

const REPORTS_COLLECTION = 'reports'

export function subscribeToReports(callback) {
  const q = query(collection(db, REPORTS_COLLECTION), orderBy('dateKey', 'desc'))

  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map((reportDoc) => ({
      id: reportDoc.id,
      ...reportDoc.data(),
    }))
    callback(reports)
  })
}

export async function addReport({ period, reportType, title, summary, dateKey, files }) {
  const reportsRef = collection(db, REPORTS_COLLECTION)
  const reportRef = doc(reportsRef)
  const dateLabel = new Date(`${dateKey}T12:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const formData = new FormData()
  formData.append('period', period)
  formData.append('reportType', reportType)
  formData.append('reportId', reportRef.id)

  files.forEach((file) => {
    formData.append('images[]', file)
  })

  const uploadResponse = await fetch('/api/report-upload.php', {
    method: 'POST',
    body: formData,
  })

  if (!uploadResponse.ok) {
    throw new Error('Rapor görselleri yüklenemedi.')
  }

  const uploadPayload = await uploadResponse.json()
  const uploadedImages = Array.isArray(uploadPayload.images) ? uploadPayload.images : []

  if (!uploadedImages.length) {
    throw new Error('Yüklenen görseller için çıktı alınamadı.')
  }

  await setDoc(reportRef, {
    period,
    reportType,
    title: title.trim(),
    summary: summary.trim(),
    dateKey,
    dateLabel,
    images: uploadedImages,
    createdAt: serverTimestamp(),
  })
}

export async function deleteReport(reportId) {
  await deleteDoc(doc(db, REPORTS_COLLECTION, reportId))
}
