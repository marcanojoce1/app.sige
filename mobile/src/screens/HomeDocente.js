import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { logout } from '../api';

const MODULOS = [
  { label: 'Mis secciones', icon: '📚' },
  { label: 'Tomar asistencia (QR)', icon: '✅' },
  { label: 'Instrumentos de evaluación', icon: '📝' },
  { label: 'Evaluar estudiantes', icon: '🎯' },
  { label: 'Planificación', icon: '🗂️' },
  { label: 'Mensajes a representantes', icon: '💬' },
  { label: 'Calendario escolar', icon: '📅' },
];

export default function HomeDocente({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.titulo}>Panel del Docente</Text>
      {MODULOS.map((m) => (
        <TouchableOpacity key={m.label} style={styles.item}>
          <Text style={styles.icon}>{m.icon}</Text>
          <Text style={styles.itemTexto}>{m.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.salir} onPress={async () => { await logout(); navigation.replace('Login'); }}>
        <Text style={styles.salirTexto}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F4EF' },
  titulo: { fontSize: 20, fontWeight: '700', color: '#0F2537', marginBottom: 18 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E1DED4' },
  icon: { fontSize: 18, marginRight: 12 },
  itemTexto: { fontSize: 14.5, color: '#20242B', fontWeight: '600' },
  salir: { marginTop: 20, alignItems: 'center', padding: 12 },
  salirTexto: { color: '#A32D2D', fontWeight: '600' },
});
