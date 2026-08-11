import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './src/screens/Login';
import HomeDocente from './src/screens/HomeDocente';
import HomeRepresentante from './src/screens/HomeRepresentante';
import HomeEstudiante from './src/screens/HomeEstudiante';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="HomeDocente" component={HomeDocente} />
        <Stack.Screen name="HomeRepresentante" component={HomeRepresentante} />
        <Stack.Screen name="HomeEstudiante" component={HomeEstudiante} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
