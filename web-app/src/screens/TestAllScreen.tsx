import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { customerService, productService, saleService, authService, teamService, quoteService } from '../services/api';

interface TestResult {
  test: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
  data?: any;
}

export default function TestAllScreen() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState({ passed: 0, failed: 0, total: 0 });
  const [authToken, setAuthToken] = useState<string>('');

  const addResult = (result: TestResult) => {
    setResults((prev) => [...prev, result]);
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    setSummary({ passed: 0, failed: 0, total: 0 });

    const testResults: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let token = '';
    let userId = 0;
    let teamId = 0;
    let quoteId = 0;

    // ========== AUTH TESTS ==========

    // Test 1: Register new user
    try {
      const response = await authService.register({
        email: `test${Date.now()}@simplix.com`,
        password: 'test123',
        name: 'Test User',
        role: 'user'
      });
      token = response.data.token;
      userId = response.data.user.id;
      setAuthToken(token);
      const result: TestResult = {
        test: 'POST /api/auth/register',
        status: 'success',
        message: `✓ User registered with ID: ${userId}`,
        data: response.data,
      };
      testResults.push(result);
      addResult(result);
      passed++;
    } catch (error: any) {
      const result: TestResult = {
        test: 'POST /api/auth/register',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 2: Login
    try {
      const response = await authService.login({
        email: 'admin@simplix.com',
        password: 'admin123'
      });
      const result: TestResult = {
        test: 'POST /api/auth/login',
        status: 'success',
        message: `✓ Logged in as ${response.data.user.name}`,
        data: response.data,
      };
      testResults.push(result);
      addResult(result);
      passed++;
    } catch (error: any) {
      const result: TestResult = {
        test: 'POST /api/auth/login',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 3: Get current user
    if (token) {
      try {
        const response = await authService.me(token);
        const result: TestResult = {
          test: 'GET /api/auth/me',
          status: 'success',
          message: `✓ Retrieved user: ${response.data.name}`,
          data: response.data,
        };
        testResults.push(result);
        addResult(result);
        passed++;
      } catch (error: any) {
        const result: TestResult = {
          test: 'GET /api/auth/me',
          status: 'failed',
          message: `✗ Error: ${error.response?.data?.error || error.message}`,
        };
        testResults.push(result);
        addResult(result);
        failed++;
      }
    }

    // ========== CUSTOMER TESTS ==========

    // Test 4: GET all customers
    try {
      const response = await customerService.getAll();
      const result: TestResult = {
        test: 'GET /api/customers',
        status: 'success',
        message: `✓ Retrieved ${response.data.length} customers`,
        data: response.data,
      };
      testResults.push(result);
      addResult(result);
      passed++;
    } catch (error: any) {
      const result: TestResult = {
        test: 'GET /api/customers',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 5: CREATE customer
    try {
      const newCustomer = {
        name: 'Test Customer ' + Date.now(),
        email: `test${Date.now()}@test.com`,
        phone: '0600000000',
        company: 'Test Company',
        address: 'Test Address',
      };
      const response = await customerService.create(newCustomer);
      const result: TestResult = {
        test: 'POST /api/customers',
        status: 'success',
        message: `✓ Created customer ID: ${response.data.id}`,
        data: response.data,
      };
      testResults.push(result);
      addResult(result);
      passed++;
    } catch (error: any) {
      const result: TestResult = {
        test: 'POST /api/customers',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // ========== PRODUCT TESTS ==========

    // Test 6: GET all products
    try {
      const response = await productService.getAll();
      const result: TestResult = {
        test: 'GET /api/products',
        status: 'success',
        message: `✓ Retrieved ${response.data.length} products`,
        data: response.data,
      };
      testResults.push(result);
      addResult(result);
      passed++;
    } catch (error: any) {
      const result: TestResult = {
        test: 'GET /api/products',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 7: CREATE product
    try {
      const newProduct = {
        name: 'Test Product ' + Date.now(),
        description: 'Test product for automated testing',
        price: 99.99,
        stock: 10,
      };
      const response = await productService.create(newProduct);
      const result: TestResult = {
        test: 'POST /api/products',
        status: 'success',
        message: `✓ Created product ID: ${response.data.id}`,
        data: response.data,
      };
      testResults.push(result);
      addResult(result);
      passed++;
    } catch (error: any) {
      const result: TestResult = {
        test: 'POST /api/products',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // ========== SALES TESTS ==========

    // Test 8: GET all sales
    try {
      const response = await saleService.getAll();
      const result: TestResult = {
        test: 'GET /api/sales',
        status: 'success',
        message: `✓ Retrieved ${response.data.length} sales`,
        data: response.data,
      };
      testResults.push(result);
      addResult(result);
      passed++;
    } catch (error: any) {
      const result: TestResult = {
        test: 'GET /api/sales',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // ========== TEAM TESTS ==========

    // Test 9: CREATE team
    if (userId) {
      try {
        const response = await teamService.create({
          name: 'Test Team ' + Date.now(),
          description: 'Test team created by automated test',
          owner_id: userId
        });
        teamId = response.data.id;
        const result: TestResult = {
          test: 'POST /api/teams',
          status: 'success',
          message: `✓ Created team ID: ${teamId}`,
          data: response.data,
        };
        testResults.push(result);
        addResult(result);
        passed++;
      } catch (error: any) {
        const result: TestResult = {
          test: 'POST /api/teams',
          status: 'failed',
          message: `✗ Error: ${error.response?.data?.error || error.message}`,
        };
        testResults.push(result);
        addResult(result);
        failed++;
      }
    }

    // Test 10: GET all teams
    try {
      const response = await teamService.getAll();
      const result: TestResult = {
        test: 'GET /api/teams',
        status: 'success',
        message: `✓ Retrieved ${response.data.length} teams`,
        data: response.data,
      };
      testResults.push(result);
      addResult(result);
      passed++;
    } catch (error: any) {
      const result: TestResult = {
        test: 'GET /api/teams',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 11: GET team by ID
    if (teamId) {
      try {
        const response = await teamService.getById(teamId);
        const result: TestResult = {
          test: 'GET /api/teams/:id',
          status: 'success',
          message: `✓ Retrieved team with ${response.data.members?.length || 0} members`,
          data: response.data,
        };
        testResults.push(result);
        addResult(result);
        passed++;
      } catch (error: any) {
        const result: TestResult = {
          test: 'GET /api/teams/:id',
          status: 'failed',
          message: `✗ Error: ${error.response?.data?.error || error.message}`,
        };
        testResults.push(result);
        addResult(result);
        failed++;
      }
    }

    // ========== QUOTE TESTS ==========

    // Test 12: CREATE quote
    try {
      const customersResponse = await customerService.getAll();
      const productsResponse = await productService.getAll();

      if (customersResponse.data.length > 0 && productsResponse.data.length > 0 && userId) {
        const newQuote = {
          customer_id: customersResponse.data[0].id!,
          user_id: userId,
          title: 'Test Quote ' + Date.now(),
          description: 'Automated test quote',
          items: [
            {
              product_id: productsResponse.data[0].id,
              description: productsResponse.data[0].name,
              quantity: 2,
              unit_price: productsResponse.data[0].price,
              total_price: productsResponse.data[0].price * 2
            }
          ],
          tax_rate: 0.20,
          status: 'draft'
        };
        const response = await quoteService.create(newQuote);
        quoteId = response.data.id;
        const result: TestResult = {
          test: 'POST /api/quotes',
          status: 'success',
          message: `✓ Created quote ID: ${quoteId}`,
          data: response.data,
        };
        testResults.push(result);
        addResult(result);
        passed++;
      } else {
        const result: TestResult = {
          test: 'POST /api/quotes',
          status: 'failed',
          message: '✗ No customers, products, or user available',
        };
        testResults.push(result);
        addResult(result);
        failed++;
      }
    } catch (error: any) {
      const result: TestResult = {
        test: 'POST /api/quotes',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 13: GET all quotes
    try {
      const response = await quoteService.getAll();
      const result: TestResult = {
        test: 'GET /api/quotes',
        status: 'success',
        message: `✓ Retrieved ${response.data.length} quotes`,
        data: response.data,
      };
      testResults.push(result);
      addResult(result);
      passed++;
    } catch (error: any) {
      const result: TestResult = {
        test: 'GET /api/quotes',
        status: 'failed',
        message: `✗ Error: ${error.response?.data?.error || error.message}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 14: GET quote by ID
    if (quoteId) {
      try {
        const response = await quoteService.getById(quoteId);
        const result: TestResult = {
          test: 'GET /api/quotes/:id',
          status: 'success',
          message: `✓ Retrieved quote with ${response.data.items?.length || 0} items`,
          data: response.data,
        };
        testResults.push(result);
        addResult(result);
        passed++;
      } catch (error: any) {
        const result: TestResult = {
          test: 'GET /api/quotes/:id',
          status: 'failed',
          message: `✗ Error: ${error.response?.data?.error || error.message}`,
        };
        testResults.push(result);
        addResult(result);
        failed++;
      }
    }

    // Test 15: UPDATE quote status
    if (quoteId) {
      try {
        const response = await quoteService.updateStatus(quoteId, 'sent');
        const result: TestResult = {
          test: 'PATCH /api/quotes/:id/status',
          status: 'success',
          message: `✓ Updated quote status to 'sent'`,
          data: response.data,
        };
        testResults.push(result);
        addResult(result);
        passed++;
      } catch (error: any) {
        const result: TestResult = {
          test: 'PATCH /api/quotes/:id/status',
          status: 'failed',
          message: `✗ Error: ${error.response?.data?.error || error.message}`,
        };
        testResults.push(result);
        addResult(result);
        failed++;
      }
    }

    const total = passed + failed;
    setSummary({ passed, failed, total });
    setTesting(false);

    Alert.alert(
      'Tests Completed',
      `Passed: ${passed}/${total}\nFailed: ${failed}/${total}`,
      [{ text: 'OK' }]
    );
  };

  const clearResults = () => {
    setResults([]);
    setSummary({ passed: 0, failed: 0, total: 0 });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>API Test Suite v2.0</Text>
        <Text style={styles.subtitle}>Test all endpoints including Auth, Teams & Quotes</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.runButton]}
          onPress={runAllTests}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Run All Tests (15)</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
          disabled={testing}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {summary.total > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            Total: {summary.total} | Passed: {summary.passed} | Failed: {summary.failed}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(summary.passed / summary.total) * 100}%`,
                  backgroundColor: summary.failed === 0 ? '#4CAF50' : '#FFA726',
                },
              ]}
            />
          </View>
        </View>
      )}

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <View
            key={index}
            style={[
              styles.resultCard,
              result.status === 'success' ? styles.successCard : styles.failedCard,
            ]}
          >
            <View style={styles.resultHeader}>
              <Text
                style={[
                  styles.resultStatus,
                  result.status === 'success' ? styles.successText : styles.failedText,
                ]}
              >
                {result.status === 'success' ? '✓' : '✗'}
              </Text>
              <Text style={styles.resultTest}>{result.test}</Text>
            </View>
            <Text style={styles.resultMessage}>{result.message}</Text>
            {result.data && (
              <Text style={styles.resultData} numberOfLines={2}>
                {JSON.stringify(result.data, null, 2).substring(0, 100)}...
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  runButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  successCard: {
    backgroundColor: '#fff',
    borderLeftColor: '#4CAF50',
  },
  failedCard: {
    backgroundColor: '#fff',
    borderLeftColor: '#F44336',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultStatus: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  successText: {
    color: '#4CAF50',
  },
  failedText: {
    color: '#F44336',
  },
  resultTest: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultData: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});
