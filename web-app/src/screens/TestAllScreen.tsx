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

  const addResult = (result: TestResult) => {
    setResults((prev) => [...prev, result]);
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    setSummary({ passed: 0, failed: 0, total: 0 });

    let passed = 0;
    let failed = 0;
    let token = '';
    let userId = 0;
    let customerId = 0;
    let productId = 0;
    let saleId = 0;
    let teamId = 0;
    let quoteId = 0;

    const test = async (testName: string, testFn: () => Promise<any>) => {
      try {
        const result = await testFn();
        const testResult: TestResult = {
          test: testName,
          status: 'success',
          message: result.message,
          data: result.data,
        };
        addResult(testResult);
        passed++;
        return result.returnValue;
      } catch (error: any) {
        const testResult: TestResult = {
          test: testName,
          status: 'failed',
          message: `✗ Error: ${error.response?.data?.error || error.message}`,
        };
        addResult(testResult);
        failed++;
        return null;
      }
    };

    // ========== AUTH TESTS ==========

    const authResult = await test('POST /api/auth/register', async () => {
      const response = await authService.register({
        email: `test${Date.now()}@simplix.com`,
        password: 'test123',
        name: 'Test User',
        role: 'user'
      });
      return {
        message: `✓ User registered with ID: ${response.data.user.id}`,
        data: response.data,
        returnValue: { token: response.data.token, userId: response.data.user.id }
      };
    });

    if (authResult) {
      token = authResult.token;
      userId = authResult.userId;
    }

    await test('POST /api/auth/login', async () => {
      const response = await authService.login({
        email: 'admin@simplix.com',
        password: 'admin123'
      });
      return {
        message: `✓ Logged in as ${response.data.user.name}`,
        data: response.data,
      };
    });

    if (token) {
      await test('GET /api/auth/me', async () => {
        const response = await authService.me(token);
        return {
          message: `✓ Retrieved user: ${response.data.name}`,
          data: response.data,
        };
      });
    }

    // ========== CUSTOMER TESTS ==========

    await test('GET /api/customers', async () => {
      const response = await customerService.getAll();
      return {
        message: `✓ Retrieved ${response.data.length} customers`,
        data: response.data,
      };
    });

    const customerResult = await test('POST /api/customers', async () => {
      const response = await customerService.create({
        name: 'Test Customer ' + Date.now(),
        email: `test${Date.now()}@test.com`,
        phone: '0600000000',
        company: 'Test Company',
      });
      return {
        message: `✓ Created customer ID: ${response.data.id}`,
        data: response.data,
        returnValue: response.data.id
      };
    });

    if (customerResult) customerId = customerResult;

    if (customerId) {
      await test('GET /api/customers/:id', async () => {
        const response = await customerService.getById(customerId);
        return {
          message: `✓ Retrieved customer ID: ${customerId}`,
          data: response.data,
        };
      });

      await test('PUT /api/customers/:id', async () => {
        const response = await customerService.update(customerId, {
          name: 'Updated Customer',
          email: `updated${Date.now()}@test.com`,
          phone: '0611111111',
          company: 'Updated Company',
        });
        return {
          message: `✓ Updated customer ID: ${customerId}`,
          data: response.data,
        };
      });
    }

    // ========== PRODUCT TESTS ==========

    await test('GET /api/products', async () => {
      const response = await productService.getAll();
      return {
        message: `✓ Retrieved ${response.data.length} products`,
        data: response.data,
      };
    });

    const productResult = await test('POST /api/products', async () => {
      const response = await productService.create({
        name: 'Test Product ' + Date.now(),
        description: 'Test product',
        price: 99.99,
        stock: 10,
      });
      return {
        message: `✓ Created product ID: ${response.data.id}`,
        data: response.data,
        returnValue: response.data.id
      };
    });

    if (productResult) productId = productResult;

    if (productId) {
      await test('GET /api/products/:id', async () => {
        const response = await productService.getById(productId);
        return {
          message: `✓ Retrieved product ID: ${productId}`,
          data: response.data,
        };
      });

      await test('PUT /api/products/:id', async () => {
        const response = await productService.update(productId, {
          name: 'Updated Product',
          description: 'Updated description',
          price: 149.99,
          stock: 20,
        });
        return {
          message: `✓ Updated product ID: ${productId}`,
          data: response.data,
        };
      });
    }

    // ========== SALES TESTS ==========

    await test('GET /api/sales', async () => {
      const response = await saleService.getAll();
      return {
        message: `✓ Retrieved ${response.data.length} sales`,
        data: response.data,
      };
    });

    if (customerId && productId) {
      const saleResult = await test('POST /api/sales', async () => {
        const response = await saleService.create({
          customer_id: customerId,
          product_id: productId,
          quantity: 2,
          total_amount: 299.98,
          status: 'completed',
        });
        return {
          message: `✓ Created sale ID: ${response.data.id}`,
          data: response.data,
          returnValue: response.data.id
        };
      });

      if (saleResult) saleId = saleResult;

      if (saleId) {
        await test('GET /api/sales/:id', async () => {
          const response = await saleService.getById(saleId);
          return {
            message: `✓ Retrieved sale ID: ${saleId}`,
            data: response.data,
          };
        });

        await test('PUT /api/sales/:id', async () => {
          const response = await saleService.update(saleId, {
            customer_id: customerId,
            product_id: productId,
            quantity: 3,
            total_amount: 449.97,
            status: 'completed',
          });
          return {
            message: `✓ Updated sale ID: ${saleId}`,
            data: response.data,
          };
        });
      }
    }

    // ========== TEAM TESTS ==========

    if (userId) {
      const teamResult = await test('POST /api/teams', async () => {
        const response = await teamService.create({
          name: 'Test Team ' + Date.now(),
          description: 'Test team',
          owner_id: userId
        });
        return {
          message: `✓ Created team ID: ${response.data.id}`,
          data: response.data,
          returnValue: response.data.id
        };
      });

      if (teamResult) teamId = teamResult;
    }

    await test('GET /api/teams', async () => {
      const response = await teamService.getAll();
      return {
        message: `✓ Retrieved ${response.data.length} teams`,
        data: response.data,
      };
    });

    if (teamId) {
      await test('GET /api/teams/:id', async () => {
        const response = await teamService.getById(teamId);
        return {
          message: `✓ Retrieved team with ${response.data.members?.length || 0} members`,
          data: response.data,
        };
      });

      await test('PUT /api/teams/:id', async () => {
        const response = await teamService.update(teamId, {
          name: 'Updated Team',
          description: 'Updated description',
        });
        return {
          message: `✓ Updated team ID: ${teamId}`,
          data: response.data,
        };
      });

      // Team member tests
      if (userId) {
        await test('POST /api/teams/:id/members', async () => {
          const response = await teamService.addMember(teamId, {
            user_id: userId,
            role: 'developer'
          });
          return {
            message: `✓ Added member to team ID: ${teamId}`,
            data: response.data,
          };
        });

        await test('PUT /api/teams/:id/members/:memberId', async () => {
          const response = await teamService.updateMemberRole(teamId, userId, 'admin');
          return {
            message: `✓ Updated member role in team ID: ${teamId}`,
            data: response.data,
          };
        });

        await test('DELETE /api/teams/:id/members/:memberId', async () => {
          const response = await teamService.removeMember(teamId, userId);
          return {
            message: `✓ Removed member from team ID: ${teamId}`,
            data: response.data,
          };
        });
      }
    }

    // ========== QUOTE TESTS ==========

    if (customerId && productId && userId) {
      const quoteResult = await test('POST /api/quotes', async () => {
        const response = await quoteService.create({
          customer_id: customerId,
          user_id: userId,
          title: 'Test Quote ' + Date.now(),
          description: 'Automated test quote',
          items: [
            {
              product_id: productId,
              description: 'Test Product',
              quantity: 2,
              unit_price: 149.99,
              total_price: 299.98
            }
          ],
          tax_rate: 0.20,
          status: 'draft'
        });
        return {
          message: `✓ Created quote ID: ${response.data.id}`,
          data: response.data,
          returnValue: response.data.id
        };
      });

      if (quoteResult) quoteId = quoteResult;
    }

    await test('GET /api/quotes', async () => {
      const response = await quoteService.getAll();
      return {
        message: `✓ Retrieved ${response.data.length} quotes`,
        data: response.data,
      };
    });

    if (quoteId) {
      await test('GET /api/quotes/:id', async () => {
        const response = await quoteService.getById(quoteId);
        return {
          message: `✓ Retrieved quote with ${response.data.items?.length || 0} items`,
          data: response.data,
        };
      });

      await test('PATCH /api/quotes/:id/status', async () => {
        const response = await quoteService.updateStatus(quoteId, 'sent');
        return {
          message: `✓ Updated quote status to 'sent'`,
          data: response.data,
        };
      });

      await test('PUT /api/quotes/:id', async () => {
        const response = await quoteService.update(quoteId, {
          title: 'Updated Quote',
          description: 'Updated description',
          status: 'accepted',
          items: [
            {
              product_id: productId,
              description: 'Updated Product',
              quantity: 3,
              unit_price: 149.99,
              total_price: 449.97
            }
          ],
          tax_rate: 0.20
        });
        return {
          message: `✓ Updated quote ID: ${quoteId}`,
          data: response.data,
        };
      });
    }

    // ========== DELETE TESTS ==========

    if (saleId) {
      await test('DELETE /api/sales/:id', async () => {
        const response = await saleService.delete(saleId);
        return {
          message: `✓ Deleted sale ID: ${saleId}`,
          data: response.data,
        };
      });
    }

    if (quoteId) {
      await test('DELETE /api/quotes/:id', async () => {
        const response = await quoteService.delete(quoteId);
        return {
          message: `✓ Deleted quote ID: ${quoteId}`,
          data: response.data,
        };
      });
    }

    if (teamId) {
      await test('DELETE /api/teams/:id', async () => {
        const response = await teamService.delete(teamId);
        return {
          message: `✓ Deleted team ID: ${teamId}`,
          data: response.data,
        };
      });
    }

    if (productId) {
      await test('DELETE /api/products/:id', async () => {
        const response = await productService.delete(productId);
        return {
          message: `✓ Deleted product ID: ${productId}`,
          data: response.data,
        };
      });
    }

    if (customerId) {
      await test('DELETE /api/customers/:id', async () => {
        const response = await customerService.delete(customerId);
        return {
          message: `✓ Deleted customer ID: ${customerId}`,
          data: response.data,
        };
      });
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
        <Text style={styles.title}>API Test Suite v3.0</Text>
        <Text style={styles.subtitle}>Complete CRUD testing for all endpoints</Text>
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
            <Text style={styles.buttonText}>Run All Tests (30+)</Text>
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
