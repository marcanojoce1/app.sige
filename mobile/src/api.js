import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'http://localhost:4000/api';

export async function login(usuario, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('usuario', JSON.stringify(data.usuario));
  return data.usuario;
}

export async function logout() {
  await AsyncStorage.multiRemove(['token', 'usuario']);
}

export async function apiFetch(path, options = {}) {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de conexión');
  return data;
}
