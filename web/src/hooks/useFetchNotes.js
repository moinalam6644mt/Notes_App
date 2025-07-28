import { useEffect, useState } from "react"

export const useFetchNotes = () => {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch("https://68852bc3f52d34140f694e84.mockapi.io/api/v1/notes/notes")
        const data = await res.json()
        setNotes(data)
      } catch (err) {
        console.error("Error fetching notes:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotes()
  }, [])

  return { notes, loading }
}
