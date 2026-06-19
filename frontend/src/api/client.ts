import axios from 'axios'
import { transformKeys } from './transform'

const client = axios.create({
  baseURL: '/api',
})

// Attach JWT from localStorage
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Convert snake_case → camelCase on all responses
client.interceptors.response.use(
  (response) => {
    response.data = transformKeys(response.data)
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client
