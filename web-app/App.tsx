import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LogMonitor from './src/components/LogMonitor';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// App Screens
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PipelineScreen from './src/screens/PipelineScreen';
import TasksScreen from './src/screens/TasksScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import CustomersScreen from './src/screens/CustomersScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import SalesScreen from './src/screens/SalesScreen';
import SuppliersScreen from './src/screens/SuppliersScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import PilotageScreen from './src/screens/PilotageScreen';
import TemplatesScreen from './src/screens/TemplatesScreen';
import TestAllScreen from './src/screens/TestAllScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';

import { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#007AFF',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 17,
          },
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // App Stack - Home as main hub
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ 
                title: 'Simplix CRM',
                headerShown: false 
              }}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ 
                title: 'Tableau de Bord',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Pipeline"
              component={PipelineScreen}
              options={{ 
                title: 'Pipeline des Ventes',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Tasks"
              component={TasksScreen}
              options={{ 
                title: 'Tâches',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Contacts"
              component={ContactsScreen}
              options={{ 
                title: 'Contacts',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
              options={{ 
                title: 'Analytics & Rapports',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Invoices"
              component={InvoicesScreen}
              options={{ 
                title: 'Facturation',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Customers"
              component={CustomersScreen}
              options={{ 
                title: 'Base Clients',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Products"
              component={ProductsScreen}
              options={{ 
                title: 'Catalogue Produits',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Sales"
              component={SalesScreen}
              options={{ 
                title: 'Historique des Ventes',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Suppliers"
              component={SuppliersScreen}
              options={{ 
                title: 'Fournisseurs',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Expenses"
              component={ExpensesScreen}
              options={{
                title: 'Dépenses',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Pilotage"
              component={PilotageScreen}
              options={{
                title: 'Pilotage',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="Templates"
              component={TemplatesScreen}
              options={{
                title: 'Templates de Factures',
                headerShown: true,
                headerStyle: { backgroundColor: '#F2F2F7' },
              }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ 
                title: 'Changer le mot de passe',
                headerShown: true,
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="TestAll"
              component={TestAllScreen}
              options={{ 
                title: 'Tests API',
                headerShown: true,
                presentation: 'modal',
              }}
            />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
      <LogMonitor />
    </AuthProvider>
  );
}
