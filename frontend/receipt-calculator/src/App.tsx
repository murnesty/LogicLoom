import { useState, useEffect } from 'react'

// TODO: Update this URL after deploying to Railway
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

interface ApiResponse {
  message: string
  project: string
  timestamp: string
}

function App() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/hello`)
      .then((res) => {
        if (!res.ok) throw new Error('API request failed')
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧾 Receipt Calculator</h1>
      <p>Proof of Concept - Frontend</p>
      <hr />
      
      <h2>API Response:</h2>
      {loading && <p>Loading...</p>}
      {error && (
        <div style={{ color: 'orange', background: '#fff3cd', padding: '1rem', borderRadius: '4px' }}>
          <p><strong>Note:</strong> Could not connect to backend API.</p>
          <p>Error: {error}</p>
          <p>Make sure the backend is running at: {API_URL}</p>
        </div>
      )}
      {data && (
        <div style={{ background: '#d4edda', padding: '1rem', borderRadius: '4px' }}>
          <p><strong>Message:</strong> {data.message}</p>
          <p><strong>Project:</strong> {data.project}</p>
          <p><strong>Timestamp:</strong> {data.timestamp}</p>
        </div>
      )}
      
      <hr />
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        API URL: {API_URL}
      </p>
    </div>
  )
}

export default App
