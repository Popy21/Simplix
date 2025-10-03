import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  analyticsService,
  searchService,
  bulkService,
  reportsService,
  customerService,
  productService,
} from '../services/api';

interface TestResult {
  test: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
  data?: any;
}

export default function TestV3Screen() {
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

    // ========== ANALYTICS TESTS ==========

    await test('GET /api/analytics/dashboard', async () => {
      const response = await analyticsService.getDashboard();
      return {
        message: `✓ Dashboard: ${response.data.totalCustomers} customers, ${response.data.totalSales} sales, $${response.data.totalRevenue}`,
        data: response.data,
      };
    });

    await test('GET /api/analytics/sales-by-period', async () => {
      const response = await analyticsService.getSalesByPeriod('month');
      return {
        message: `✓ Retrieved ${response.data.length} sales periods`,
        data: response.data,
      };
    });

    await test('GET /api/analytics/top-customers', async () => {
      const response = await analyticsService.getTopCustomers(5);
      return {
        message: `✓ Retrieved top ${response.data.length} customers`,
        data: response.data,
      };
    });

    await test('GET /api/analytics/top-products', async () => {
      const response = await analyticsService.getTopProducts(5);
      return {
        message: `✓ Retrieved top ${response.data.length} products`,
        data: response.data,
      };
    });

    await test('GET /api/analytics/quotes-conversion', async () => {
      const response = await analyticsService.getQuotesConversion();
      return {
        message: `✓ Retrieved quotes conversion by ${response.data.length} statuses`,
        data: response.data,
      };
    });

    await test('GET /api/analytics/recent-activity', async () => {
      const response = await analyticsService.getRecentActivity(10);
      return {
        message: `✓ Retrieved ${response.data.length} recent activities`,
        data: response.data,
      };
    });

    await test('GET /api/analytics/low-stock', async () => {
      const response = await analyticsService.getLowStock(10);
      return {
        message: `✓ Found ${response.data.length} low stock products`,
        data: response.data,
      };
    });

    // ========== SEARCH TESTS ==========

    await test('GET /api/search (global)', async () => {
      const response = await searchService.global('test');
      const totalResults =
        response.data.customers.length +
        response.data.products.length +
        response.data.quotes.length +
        response.data.users.length;
      return {
        message: `✓ Global search found ${totalResults} total results`,
        data: response.data,
      };
    });

    await test('GET /api/search/customers', async () => {
      const response = await searchService.customers({ q: 'test' });
      return {
        message: `✓ Found ${response.data.length} customers`,
        data: response.data,
      };
    });

    await test('GET /api/search/products', async () => {
      const response = await searchService.products({ inStock: true });
      return {
        message: `✓ Found ${response.data.length} products in stock`,
        data: response.data,
      };
    });

    await test('GET /api/search/sales', async () => {
      const response = await searchService.sales({ status: 'completed' });
      return {
        message: `✓ Found ${response.data.length} completed sales`,
        data: response.data,
      };
    });

    await test('GET /api/search/quotes', async () => {
      const response = await searchService.quotes({ status: 'draft' });
      return {
        message: `✓ Found ${response.data.length} draft quotes`,
        data: response.data,
      };
    });

    // ========== BULK OPERATIONS TESTS ==========

    // Create test data for bulk operations
    let createdCustomerIds: number[] = [];
    let createdProductIds: number[] = [];

    const bulkCustomersResult = await test('POST /api/bulk/customers', async () => {
      const response = await bulkService.createCustomers([
        {
          name: 'Bulk Customer 1 ' + Date.now(),
          email: `bulk1${Date.now()}@test.com`,
          phone: '0600000001',
          company: 'Bulk Test Company 1',
        },
        {
          name: 'Bulk Customer 2 ' + Date.now(),
          email: `bulk2${Date.now()}@test.com`,
          phone: '0600000002',
          company: 'Bulk Test Company 2',
        },
        {
          name: 'Bulk Customer 3 ' + Date.now(),
          email: `bulk3${Date.now()}@test.com`,
          phone: '0600000003',
          company: 'Bulk Test Company 3',
        },
      ]);
      return {
        message: `✓ Created ${response.data.customers.length} customers in bulk`,
        data: response.data,
        returnValue: response.data.customers.map((c: any) => c.id),
      };
    });

    if (bulkCustomersResult) {
      createdCustomerIds = bulkCustomersResult;
    }

    const bulkProductsResult = await test('POST /api/bulk/products', async () => {
      const response = await bulkService.createProducts([
        {
          name: 'Bulk Product 1 ' + Date.now(),
          description: 'Test product 1',
          price: 99.99,
          stock: 100,
        },
        {
          name: 'Bulk Product 2 ' + Date.now(),
          description: 'Test product 2',
          price: 149.99,
          stock: 50,
        },
        {
          name: 'Bulk Product 3 ' + Date.now(),
          description: 'Test product 3',
          price: 199.99,
          stock: 25,
        },
      ]);
      return {
        message: `✓ Created ${response.data.products.length} products in bulk`,
        data: response.data,
        returnValue: response.data.products.map((p: any) => p.id),
      };
    });

    if (bulkProductsResult) {
      createdProductIds = bulkProductsResult;
    }

    if (createdProductIds.length > 0) {
      await test('PATCH /api/bulk/products/stock', async () => {
        const updates = createdProductIds.map((id, index) => ({
          id,
          stock: (index + 1) * 50,
        }));
        const response = await bulkService.updateProductStock(updates);
        return {
          message: `✓ Updated stock for ${response.data.updates.length} products`,
          data: response.data,
        };
      });
    }

    if (createdCustomerIds.length > 0) {
      await test('DELETE /api/bulk/customers', async () => {
        const response = await bulkService.deleteCustomers(createdCustomerIds);
        return {
          message: `✓ Deleted ${response.data.deletedCount} customers in bulk`,
          data: response.data,
        };
      });
    }

    if (createdProductIds.length > 0) {
      await test('DELETE /api/bulk/products', async () => {
        const response = await bulkService.deleteProducts(createdProductIds);
        return {
          message: `✓ Deleted ${response.data.deletedCount} products in bulk`,
          data: response.data,
        };
      });
    }

    // ========== REPORTS TESTS ==========

    await test('GET /api/reports/sales', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-12-31';
      const response = await reportsService.sales({ startDate, endDate, groupBy: 'month' });
      return {
        message: `✓ Generated sales report with ${response.data.length} periods`,
        data: response.data,
      };
    });

    await test('GET /api/reports/customers', async () => {
      const response = await reportsService.customers();
      return {
        message: `✓ Generated customer report for ${response.data.length} customers`,
        data: response.data,
      };
    });

    await test('GET /api/reports/products', async () => {
      const response = await reportsService.products();
      return {
        message: `✓ Generated product performance report for ${response.data.length} products`,
        data: response.data,
      };
    });

    await test('GET /api/reports/quotes', async () => {
      const response = await reportsService.quotes();
      return {
        message: `✓ Generated quotes report with ${response.data.length} quotes`,
        data: response.data,
      };
    });

    await test('GET /api/reports/teams', async () => {
      const response = await reportsService.teams();
      return {
        message: `✓ Generated team performance report for ${response.data.length} teams`,
        data: response.data,
      };
    });

    await test('GET /api/reports/users', async () => {
      const response = await reportsService.users();
      return {
        message: `✓ Generated user performance report for ${response.data.length} users`,
        data: response.data,
      };
    });

    await test('GET /api/reports/revenue', async () => {
      const response = await reportsService.revenue({ groupBy: 'month' });
      return {
        message: `✓ Generated revenue report with ${response.data.length} periods`,
        data: response.data,
      };
    });

    await test('GET /api/reports/inventory', async () => {
      const response = await reportsService.inventory();
      return {
        message: `✓ Generated inventory report for ${response.data.length} products`,
        data: response.data,
      };
    });

    // Final summary
    const total = passed + failed;
    setSummary({ passed, failed, total });
    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>API v3.0 Test Suite</Text>
        <Text style={styles.subtitle}>
          Analytics, Search, Bulk Operations & Reports
        </Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{summary.total}</Text>
        </View>
        <View style={[styles.summaryItem, styles.successItem]}>
          <Text style={styles.summaryLabel}>Passed</Text>
          <Text style={[styles.summaryValue, styles.successText]}>{summary.passed}</Text>
        </View>
        <View style={[styles.summaryItem, styles.errorItem]}>
          <Text style={styles.summaryLabel}>Failed</Text>
          <Text style={[styles.summaryValue, styles.errorText]}>{summary.failed}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={runAllTests}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Run All V3.0 Tests</Text>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <View
            key={index}
            style={[
              styles.resultItem,
              result.status === 'success' ? styles.successResult : styles.errorResult,
            ]}
          >
            <Text style={styles.testName}>{result.test}</Text>
            <Text
              style={[
                styles.testMessage,
                result.status === 'success' ? styles.successText : styles.errorText,
              ]}
            >
              {result.message}
            </Text>
            {result.data && (
              <Text style={styles.testData} numberOfLines={2}>
                {JSON.stringify(result.data, null, 2).substring(0, 200)}...
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
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    alignItems: 'center',
  },
  successItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    paddingLeft: 15,
  },
  errorItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#f44336',
    paddingLeft: 15,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#f44336',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    flex: 1,
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  successResult: {
    borderLeftColor: '#4CAF50',
  },
  errorResult: {
    borderLeftColor: '#f44336',
  },
  testName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  testMessage: {
    fontSize: 13,
    marginBottom: 5,
  },
  testData: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
});
