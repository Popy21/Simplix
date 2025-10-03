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
import { customerService, productService, saleService } from '../services/api';

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

    // Test 1: GET all customers
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
    } catch (error) {
      const result: TestResult = {
        test: 'GET /api/customers',
        status: 'failed',
        message: `✗ Error: ${error}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 2: CREATE customer
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
    } catch (error) {
      const result: TestResult = {
        test: 'POST /api/customers',
        status: 'failed',
        message: `✗ Error: ${error}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 3: GET all products
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
    } catch (error) {
      const result: TestResult = {
        test: 'GET /api/products',
        status: 'failed',
        message: `✗ Error: ${error}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 4: CREATE product
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
    } catch (error) {
      const result: TestResult = {
        test: 'POST /api/products',
        status: 'failed',
        message: `✗ Error: ${error}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 5: GET all sales
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
    } catch (error) {
      const result: TestResult = {
        test: 'GET /api/sales',
        status: 'failed',
        message: `✗ Error: ${error}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 6: CREATE sale (requires existing customer and product)
    try {
      const customersResponse = await customerService.getAll();
      const productsResponse = await productService.getAll();

      if (customersResponse.data.length > 0 && productsResponse.data.length > 0) {
        const newSale = {
          customer_id: customersResponse.data[0].id!,
          product_id: productsResponse.data[0].id!,
          quantity: 1,
          total_amount: productsResponse.data[0].price,
          status: 'pending',
          notes: 'Test sale created at ' + new Date().toISOString(),
        };
        const response = await saleService.create(newSale);
        const result: TestResult = {
          test: 'POST /api/sales',
          status: 'success',
          message: `✓ Created sale ID: ${response.data.id}`,
          data: response.data,
        };
        testResults.push(result);
        addResult(result);
        passed++;
      } else {
        const result: TestResult = {
          test: 'POST /api/sales',
          status: 'failed',
          message: '✗ No customers or products available',
        };
        testResults.push(result);
        addResult(result);
        failed++;
      }
    } catch (error) {
      const result: TestResult = {
        test: 'POST /api/sales',
        status: 'failed',
        message: `✗ Error: ${error}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 7: UPDATE customer (get first customer and update)
    try {
      const customersResponse = await customerService.getAll();
      if (customersResponse.data.length > 0) {
        const customer = customersResponse.data[0];
        const updatedCustomer = {
          ...customer,
          name: customer.name + ' (Updated)',
        };
        const response = await customerService.update(customer.id!, updatedCustomer);
        const result: TestResult = {
          test: 'PUT /api/customers/:id',
          status: 'success',
          message: `✓ Updated customer ID: ${customer.id}`,
          data: response.data,
        };
        testResults.push(result);
        addResult(result);
        passed++;
      } else {
        const result: TestResult = {
          test: 'PUT /api/customers/:id',
          status: 'failed',
          message: '✗ No customers available to update',
        };
        testResults.push(result);
        addResult(result);
        failed++;
      }
    } catch (error) {
      const result: TestResult = {
        test: 'PUT /api/customers/:id',
        status: 'failed',
        message: `✗ Error: ${error}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
    }

    // Test 8: GET single customer
    try {
      const customersResponse = await customerService.getAll();
      if (customersResponse.data.length > 0) {
        const customerId = customersResponse.data[0].id!;
        const response = await customerService.getById(customerId);
        const result: TestResult = {
          test: 'GET /api/customers/:id',
          status: 'success',
          message: `✓ Retrieved customer ID: ${customerId}`,
          data: response.data,
        };
        testResults.push(result);
        addResult(result);
        passed++;
      } else {
        const result: TestResult = {
          test: 'GET /api/customers/:id',
          status: 'failed',
          message: '✗ No customers available',
        };
        testResults.push(result);
        addResult(result);
        failed++;
      }
    } catch (error) {
      const result: TestResult = {
        test: 'GET /api/customers/:id',
        status: 'failed',
        message: `✗ Error: ${error}`,
      };
      testResults.push(result);
      addResult(result);
      failed++;
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
        <Text style={styles.title}>API Test Suite</Text>
        <Text style={styles.subtitle}>Test all endpoints automatically</Text>
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
            <Text style={styles.buttonText}>Run All Tests</Text>
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
