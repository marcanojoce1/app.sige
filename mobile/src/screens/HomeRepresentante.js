import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { apiFetch, logout } from '../api';

const MODULOS = [
  { label: 'Notas y evaluaciones', icon: '📝' },
  { label: 'Boletines', icon: '📄' },
  { label: 'Asistencia', icon: '✅' },
  { label: 'Estado de cuenta / pagos', icon: '💰' },
  { label: 'Calendario escolar', icon: '📅' },
  { label: 'Mensajes con docentes', icon: '💬' },
];

export default function HomeRepresentante({ navigation }) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiFetch('/documentos/mis-documentos')
      .then(setDocumentos)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.titulo}>Panel del Representante</Text>

      {MODULOS.map((m) => (
        <TouchableOpacity key={m.label} style={styles.item}>
          <Text style={styles.icon}>{m.icon}</Text>
          <Text style={styles.itemTexto}>{m.label}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.subtitulo}>Mis constancias y certificados</Text>
      {cargando && <ActivityIndicator />}
      {!cargando && documentos.length === 0 && (
        <Text style={styles.vacio}>Aún no tienes documentos emitidos.</Text>
      )}
      {documentos.map((d) => (
        <View key={d.id} style={styles.docCard}>
          <Text style={styles.docTipo}>{d.tipo.replace('_', ' ')}</Text>
          <Text style={styles.docCodigo}>Código: {d.codigo_validacion}</Text>
          <TouchableOpacity style={styles.descargar}>
            <Text style={styles.descargarTexto}>Descargar PDF</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.salir}
        onPress={async () => { await logout(); navigation.replace('Login'); }}
      >
        <Text style={styles.salirTexto}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F4EF' },
  titulo: { fontSize: 20, fontWeight: '700', color: '#0F2537', marginBottom: 18 },
  subtitulo: { fontSize: 14, fontWeight: '700', color: '#0F2537', marginTop: 16, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E1DED4' },
  icon: { fontSize: 18, marginRight: 12 },
  itemTexto: { fontSize: 14.5, color: '#20242B', fontWeight: '600' },
  vacio: { color: '#8A8F99', fontSize: 12.5 },
  docCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E1DED4' },
  docTipo: { fontWeight: '700', color: '#0F2537', marginBottom: 4, textTransform: 'capitalize' },
  docCodigo: { color: '#8A8F99', fontSize: 12, marginBottom: 8 },
  descargar: { backgroundColor: '#C98A22', borderRadius: 6, padding: 8, alignItems: 'center' },
  descargarTexto: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  salir: { marginTop: 20, alignItems: 'center', padding: 12 },
  salirTexto: { color: '#A32D2D', fontWeight: '600' },
});
