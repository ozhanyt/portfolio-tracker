import { db, storage } from '@/firebase'
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

const REPORTS_COLLECTION = 'reports'

function slugifyFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

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

  const uploadedImages = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const storageRef = ref(
      storage,
      `reports/${period}/${reportType}/${reportRef.id}/${String(index + 1).padStart(2, '0')}-${slugifyFileName(file.name)}`
    )

    await uploadBytes(storageRef, file)
    const downloadUrl = await getDownloadURL(storageRef)

    uploadedImages.push({
      src: downloadUrl,
      alt: `${title || reportType} görsel ${index + 1}`,
      name: file.name,
    })
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
