import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { login } from '../api';

export default function LoginScreen({ navigation }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    setCargando(true);
    try {
      const user = await login(usuario, password);
      // Igual que TallerOS: cada rol ve un Home distinto
      if (user.rol === 'docente') navigation.replace('HomeDocente');
      else if (user.rol === 'representante') navigation.replace('HomeRepresentante');
      else if (user.rol === 'estudiante') navigation.replace('HomeEstudiante');
      else navigation.replace('HomeDocente'); // fallback
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>SIGE Venezuela</Text>
      <Text style={styles.subtitulo}>Sistema Integral de Gestión Escolar</Text>

      <TextInput
        style={styles.input}
        placeholder="Usuario"
        value={usuario}
        onChangeText={setUsuario}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.boton} onPress={handleLogin} disabled={cargando}>
        {cargando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Ingresar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#0F2537' },
  titulo: { fontSize: 26, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitulo: { fontSize: 13, color: '#9FB0C2', textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  boton: { backgroundColor: '#C98A22', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  error: { color: '#F3A6A6', marginBottom: 10, fontSize: 12.5 },
});
