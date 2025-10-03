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
  customerService,
  productService,
  saleService,
  authService,
  teamService,
  quoteService,
  analyticsService,
  searchService,
  bulkService,
  reportsService,
} from '../services/api';

interface TestResult {
  test: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
  data?: any;
  category?: string;
}

export default function TestAllScreen() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState({ passed: 0, failed: 0, total: 0 });
  const [categoryStats, setCategoryStats] = useState<Record<string, { passed: number; failed: number }>>({});

  const addResult = (result: TestResult) => {
    setResults((prev) => [...prev, result]);
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    setSummary({ passed: 0, failed: 0, total: 0 });
    setCategoryStats({});

    let passed = 0;
    let failed = 0;
    const catStats: Record<string, { passed: number; failed: number }> = {};

    let token = '';
    let userId = 0;
    let userId2 = 0;
    let customerId = 0;
    let productId = 0;
    let saleId = 0;
    let teamId = 0;
    let quoteId = 0;

    const test = async (testName: string, testFn: () => Promise<any>, category: string = 'Other') => {
      try {
        const result = await testFn();
        const testResult: TestResult = {
          test: testName,
          status: 'success',
          message: result.message,
          data: result.data,
          category,
        };
        addResult(testResult);
        passed++;
        if (!catStats[category]) catStats[category] = { passed: 0, failed: 0 };
        catStats[category].passed++;
        return result.returnValue;
      } catch (error: any) {
        const testResult: TestResult = {
          test: testName,
          status: 'failed',
          message: `✗ Error: ${error.response?.data?.error || error.message}`,
          category,
        };
        addResult(testResult);
        failed++;
        if (!catStats[category]) catStats[category] = { passed: 0, failed: 0 };
        catStats[category].failed++;
        return null;
      }
    };

    // ========== AUTH TESTS ==========

    const authResult = await test(
      'POST /api/auth/register',
      async () => {
        const response = await authService.register({
          email: `test${Date.now()}@simplix.com`,
          password: 'test123',
          name: 'Test User',
          role: 'user',
        });
        return {
          message: `✓ User registered with ID: ${response.data.user.id}`,
          data: response.data,
          returnValue: { token: response.data.token, userId: response.data.user.id },
        };
      },
      'Authentication'
    );

    if (authResult) {
      token = authResult.token;
      userId = authResult.userId;
    }

    await test(
      'POST /api/auth/login',
      async () => {
        const response = await authService.login({
          email: 'admin@simplix.com',
          password: 'admin123',
        });
        return {
          message: `✓ Logged in as ${response.data.user.name}`,
          data: response.data,
        };
      },
      'Authentication'
    );

    if (token) {
      await test(
        'GET /api/auth/me',
        async () => {
          const response = await authService.me(token);
          return {
            message: `✓ Retrieved user: ${response.data.name}`,
            data: response.data,
          };
        },
        'Authentication'
      );
    }

    const authResult2 = await test(
      'POST /api/auth/register (User 2)',
      async () => {
        const response = await authService.register({
          email: `test2${Date.now()}@simplix.com`,
          password: 'test123',
          name: 'Test User 2',
          role: 'user',
        });
        return {
          message: `✓ User 2 registered with ID: ${response.data.user.id}`,
          data: response.data,
          returnValue: response.data.user.id,
        };
      },
      'Authentication'
    );

    if (authResult2) {
      userId2 = authResult2;
    }

    // ========== CUSTOMER TESTS ==========

    await test(
      'GET /api/customers',
      async () => {
        const response = await customerService.getAll();
        return {
          message: `✓ Retrieved ${response.data.length} customers`,
          data: response.data,
        };
      },
      'Customers'
    );

    const customerResult = await test(
      'POST /api/customers',
      async () => {
        const response = await customerService.create({
          name: 'Test Customer ' + Date.now(),
          email: `test${Date.now()}@test.com`,
          phone: '0600000000',
          company: 'Test Company',
        });
        return {
          message: `✓ Created customer ID: ${response.data.id}`,
          data: response.data,
          returnValue: response.data.id,
        };
      },
      'Customers'
    );

    if (customerResult) customerId = customerResult;

    if (customerId) {
      await test(
        'GET /api/customers/:id',
        async () => {
          const response = await customerService.getById(customerId);
          return {
            message: `✓ Retrieved customer ID: ${customerId}`,
            data: response.data,
          };
        },
        'Customers'
      );

      await test(
        'PUT /api/customers/:id',
        async () => {
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
        },
        'Customers'
      );
    }

    // ========== PRODUCT TESTS ==========

    await test(
      'GET /api/products',
      async () => {
        const response = await productService.getAll();
        return {
          message: `✓ Retrieved ${response.data.length} products`,
          data: response.data,
        };
      },
      'Products'
    );

    const productResult = await test(
      'POST /api/products',
      async () => {
        const response = await productService.create({
          name: 'Test Product ' + Date.now(),
          description: 'Test description',
          price: 149.99,
          stock: 100,
        });
        return {
          message: `✓ Created product ID: ${response.data.id}`,
          data: response.data,
          returnValue: response.data.id,
        };
      },
      'Products'
    );

    if (productResult) productId = productResult;

    if (productId) {
      await test(
        'GET /api/products/:id',
        async () => {
          const response = await productService.getById(productId);
          return {
            message: `✓ Retrieved product ID: ${productId}`,
            data: response.data,
          };
        },
        'Products'
      );

      await test(
        'PUT /api/products/:id',
        async () => {
          const response = await productService.update(productId, {
            name: 'Updated Product',
            description: 'Updated description',
            price: 199.99,
            stock: 75,
          });
          return {
            message: `✓ Updated product ID: ${productId}`,
            data: response.data,
          };
        },
        'Products'
      );
    }

    // ========== SALES TESTS ==========

    await test(
      'GET /api/sales',
      async () => {
        const response = await saleService.getAll();
        return {
          message: `✓ Retrieved ${response.data.length} sales`,
          data: response.data,
        };
      },
      'Sales'
    );

    if (customerId && productId) {
      const saleResult = await test(
        'POST /api/sales',
        async () => {
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
            returnValue: response.data.id,
          };
        },
        'Sales'
      );

      if (saleResult) saleId = saleResult;

      if (saleId) {
        await test(
          'GET /api/sales/:id',
          async () => {
            const response = await saleService.getById(saleId);
            return {
              message: `✓ Retrieved sale ID: ${saleId}`,
              data: response.data,
            };
          },
          'Sales'
        );

        await test(
          'PUT /api/sales/:id',
          async () => {
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
          },
          'Sales'
        );
      }
    }

    // ========== TEAM TESTS ==========

    if (userId) {
      const teamResult = await test(
        'POST /api/teams',
        async () => {
          const response = await teamService.create({
            name: 'Test Team ' + Date.now(),
            description: 'Test team',
            owner_id: userId,
          });
          return {
            message: `✓ Created team ID: ${response.data.id}`,
            data: response.data,
            returnValue: response.data.id,
          };
        },
        'Teams'
      );

      if (teamResult) teamId = teamResult;
    }

    await test(
      'GET /api/teams',
      async () => {
        const response = await teamService.getAll();
        return {
          message: `✓ Retrieved ${response.data.length} teams`,
          data: response.data,
        };
      },
      'Teams'
    );

    if (teamId) {
      await test(
        'GET /api/teams/:id',
        async () => {
          const response = await teamService.getById(teamId);
          return {
            message: `✓ Retrieved team with ${response.data.members?.length || 0} members`,
            data: response.data,
          };
        },
        'Teams'
      );

      await test(
        'PUT /api/teams/:id',
        async () => {
          const response = await teamService.update(teamId, {
            name: 'Updated Team',
            description: 'Updated description',
          });
          return {
            message: `✓ Updated team ID: ${teamId}`,
            data: response.data,
          };
        },
        'Teams'
      );

      if (userId2) {
        let memberId = 0;

        const memberResult = await test(
          'POST /api/teams/:id/members',
          async () => {
            const response = await teamService.addMember(teamId, {
              user_id: userId2,
              role: 'developer',
            });
            return {
              message: `✓ Added member (user ${userId2}) to team ID: ${teamId}`,
              data: response.data,
              returnValue: response.data.id,
            };
          },
          'Teams'
        );

        if (memberResult) memberId = memberResult;

        if (memberId) {
          await test(
            'PUT /api/teams/:id/members/:memberId',
            async () => {
              const response = await teamService.updateMemberRole(teamId, memberId, 'admin');
              return {
                message: `✓ Updated member role in team ID: ${teamId}`,
                data: response.data,
              };
            },
            'Teams'
          );

          await test(
            'DELETE /api/teams/:id/members/:memberId',
            async () => {
              const response = await teamService.removeMember(teamId, memberId);
              return {
                message: `✓ Removed member from team ID: ${teamId}`,
                data: response.data,
              };
            },
            'Teams'
          );
        }
      }
    }

    // ========== QUOTE TESTS ==========

    if (customerId && productId && userId) {
      const quoteResult = await test(
        'POST /api/quotes',
        async () => {
          const response = await quoteService.create({
            customer_id: customerId,
            user_id: userId,
            title: 'Test Quote ' + Date.now(),
            description: 'Automated test quote',
            items: [
              {
                product_id: productId,
                description: 'Test product',
                quantity: 2,
                unit_price: 500.0,
                total_price: 1000.0,
              },
            ],
            tax_rate: 0.2,
            status: 'draft',
          });
          return {
            message: `✓ Created quote ID: ${response.data.id}`,
            data: response.data,
            returnValue: response.data.id,
          };
        },
        'Quotes'
      );

      if (quoteResult) quoteId = quoteResult;
    }

    await test(
      'GET /api/quotes',
      async () => {
        const response = await quoteService.getAll();
        return {
          message: `✓ Retrieved ${response.data.length} quotes`,
          data: response.data,
        };
      },
      'Quotes'
    );

    if (quoteId) {
      await test(
        'GET /api/quotes/:id',
        async () => {
          const response = await quoteService.getById(quoteId);
          return {
            message: `✓ Retrieved quote with ${response.data.items?.length || 0} items`,
            data: response.data,
          };
        },
        'Quotes'
      );

      await test(
        'PUT /api/quotes/:id',
        async () => {
          const response = await quoteService.update(quoteId, {
            title: 'Updated Quote',
            description: 'Updated description',
            items: [
              {
                product_id: productId,
                description: 'Updated product',
                quantity: 3,
                unit_price: 500.0,
                total_price: 1500.0,
              },
            ],
            tax_rate: 0.2,
            status: 'sent',
          });
          return {
            message: `✓ Updated quote ID: ${quoteId}`,
            data: response.data,
          };
        },
        'Quotes'
      );

      await test(
        'PATCH /api/quotes/:id/status',
        async () => {
          const response = await quoteService.updateStatus(quoteId, 'accepted');
          return {
            message: `✓ Updated quote status to accepted`,
            data: response.data,
          };
        },
        'Quotes'
      );
    }

    // ========== ANALYTICS TESTS ==========

    await test(
      'GET /api/analytics/dashboard',
      async () => {
        const response = await analyticsService.getDashboard();
        return {
          message: `✓ Dashboard: ${response.data.totalCustomers} customers, ${response.data.totalSales} sales, $${response.data.totalRevenue}`,
          data: response.data,
        };
      },
      'Analytics'
    );

    await test(
      'GET /api/analytics/sales-by-period',
      async () => {
        const response = await analyticsService.getSalesByPeriod('month');
        return {
          message: `✓ Retrieved ${response.data.length} sales periods`,
          data: response.data,
        };
      },
      'Analytics'
    );

    await test(
      'GET /api/analytics/top-customers',
      async () => {
        const response = await analyticsService.getTopCustomers(5);
        return {
          message: `✓ Retrieved top ${response.data.length} customers`,
          data: response.data,
        };
      },
      'Analytics'
    );

    await test(
      'GET /api/analytics/top-products',
      async () => {
        const response = await analyticsService.getTopProducts(5);
        return {
          message: `✓ Retrieved top ${response.data.length} products`,
          data: response.data,
        };
      },
      'Analytics'
    );

    await test(
      'GET /api/analytics/quotes-conversion',
      async () => {
        const response = await analyticsService.getQuotesConversion();
        return {
          message: `✓ Retrieved quotes conversion by ${response.data.length} statuses`,
          data: response.data,
        };
      },
      'Analytics'
    );

    await test(
      'GET /api/analytics/recent-activity',
      async () => {
        const response = await analyticsService.getRecentActivity(10);
        return {
          message: `✓ Retrieved ${response.data.length} recent activities`,
          data: response.data,
        };
      },
      'Analytics'
    );

    await test(
      'GET /api/analytics/low-stock',
      async () => {
        const response = await analyticsService.getLowStock(10);
        return {
          message: `✓ Found ${response.data.length} low stock products`,
          data: response.data,
        };
      },
      'Analytics'
    );

    // ========== SEARCH TESTS ==========

    await test(
      'GET /api/search (global)',
      async () => {
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
      },
      'Search'
    );

    await test(
      'GET /api/search/customers',
      async () => {
        const response = await searchService.customers({ q: 'test' });
        return {
          message: `✓ Found ${response.data.length} customers`,
          data: response.data,
        };
      },
      'Search'
    );

    await test(
      'GET /api/search/products',
      async () => {
        const response = await searchService.products({ inStock: true });
        return {
          message: `✓ Found ${response.data.length} products in stock`,
          data: response.data,
        };
      },
      'Search'
    );

    await test(
      'GET /api/search/sales',
      async () => {
        const response = await searchService.sales({ status: 'completed' });
        return {
          message: `✓ Found ${response.data.length} completed sales`,
          data: response.data,
        };
      },
      'Search'
    );

    await test(
      'GET /api/search/quotes',
      async () => {
        const response = await searchService.quotes({ status: 'draft' });
        return {
          message: `✓ Found ${response.data.length} draft quotes`,
          data: response.data,
        };
      },
      'Search'
    );

    // ========== BULK OPERATIONS TESTS ==========

    let createdCustomerIds: number[] = [];
    let createdProductIds: number[] = [];

    const bulkCustomersResult = await test(
      'POST /api/bulk/customers',
      async () => {
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
      },
      'Bulk Operations'
    );

    if (bulkCustomersResult) {
      createdCustomerIds = bulkCustomersResult;
    }

    const bulkProductsResult = await test(
      'POST /api/bulk/products',
      async () => {
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
      },
      'Bulk Operations'
    );

    if (bulkProductsResult) {
      createdProductIds = bulkProductsResult;
    }

    if (createdProductIds.length > 0) {
      await test(
        'PATCH /api/bulk/products/stock',
        async () => {
          const updates = createdProductIds.map((id, index) => ({
            id,
            stock: (index + 1) * 50,
          }));
          const response = await bulkService.updateProductStock(updates);
          return {
            message: `✓ Updated stock for ${response.data.updates.length} products`,
            data: response.data,
          };
        },
        'Bulk Operations'
      );
    }

    if (createdCustomerIds.length > 0) {
      await test(
        'DELETE /api/bulk/customers',
        async () => {
          const response = await bulkService.deleteCustomers(createdCustomerIds);
          return {
            message: `✓ Deleted ${response.data.deletedCount} customers in bulk`,
            data: response.data,
          };
        },
        'Bulk Operations'
      );
    }

    if (createdProductIds.length > 0) {
      await test(
        'DELETE /api/bulk/products',
        async () => {
          const response = await bulkService.deleteProducts(createdProductIds);
          return {
            message: `✓ Deleted ${response.data.deletedCount} products in bulk`,
            data: response.data,
          };
        },
        'Bulk Operations'
      );
    }

    // ========== REPORTS TESTS ==========

    await test(
      'GET /api/reports/sales',
      async () => {
        const startDate = '2025-01-01';
        const endDate = '2025-12-31';
        const response = await reportsService.sales({ startDate, endDate, groupBy: 'month' });
        return {
          message: `✓ Generated sales report with ${response.data.length} periods`,
          data: response.data,
        };
      },
      'Reports'
    );

    await test(
      'GET /api/reports/customers',
      async () => {
        const response = await reportsService.customers();
        return {
          message: `✓ Generated customer report for ${response.data.length} customers`,
          data: response.data,
        };
      },
      'Reports'
    );

    await test(
      'GET /api/reports/products',
      async () => {
        const response = await reportsService.products();
        return {
          message: `✓ Generated product performance report for ${response.data.length} products`,
          data: response.data,
        };
      },
      'Reports'
    );

    await test(
      'GET /api/reports/quotes',
      async () => {
        const response = await reportsService.quotes();
        return {
          message: `✓ Generated quotes report with ${response.data.length} quotes`,
          data: response.data,
        };
      },
      'Reports'
    );

    await test(
      'GET /api/reports/teams',
      async () => {
        const response = await reportsService.teams();
        return {
          message: `✓ Generated team performance report for ${response.data.length} teams`,
          data: response.data,
        };
      },
      'Reports'
    );

    await test(
      'GET /api/reports/users',
      async () => {
        const response = await reportsService.users();
        return {
          message: `✓ Generated user performance report for ${response.data.length} users`,
          data: response.data,
        };
      },
      'Reports'
    );

    await test(
      'GET /api/reports/revenue',
      async () => {
        const response = await reportsService.revenue({ groupBy: 'month' });
        return {
          message: `✓ Generated revenue report with ${response.data.length} periods`,
          data: response.data,
        };
      },
      'Reports'
    );

    await test(
      'GET /api/reports/inventory',
      async () => {
        const response = await reportsService.inventory();
        return {
          message: `✓ Generated inventory report for ${response.data.length} products`,
          data: response.data,
        };
      },
      'Reports'
    );

    // ========== CLEANUP TESTS (DELETE) ==========

    if (quoteId) {
      await test(
        'DELETE /api/quotes/:id',
        async () => {
          const response = await quoteService.delete(quoteId);
          return {
            message: `✓ Deleted quote ID: ${quoteId}`,
            data: response.data,
          };
        },
        'Cleanup'
      );
    }

    if (saleId) {
      await test(
        'DELETE /api/sales/:id',
        async () => {
          const response = await saleService.delete(saleId);
          return {
            message: `✓ Deleted sale ID: ${saleId}`,
            data: response.data,
          };
        },
        'Cleanup'
      );
    }

    if (teamId) {
      await test(
        'DELETE /api/teams/:id',
        async () => {
          const response = await teamService.delete(teamId);
          return {
            message: `✓ Deleted team ID: ${teamId}`,
            data: response.data,
          };
        },
        'Cleanup'
      );
    }

    if (productId) {
      await test(
        'DELETE /api/products/:id',
        async () => {
          const response = await productService.delete(productId);
          return {
            message: `✓ Deleted product ID: ${productId}`,
            data: response.data,
          };
        },
        'Cleanup'
      );
    }

    if (customerId) {
      await test(
        'DELETE /api/customers/:id',
        async () => {
          const response = await customerService.delete(customerId);
          return {
            message: `✓ Deleted customer ID: ${customerId}`,
            data: response.data,
          };
        },
        'Cleanup'
      );
    }

    // Final summary
    const total = passed + failed;
    setSummary({ passed, failed, total });
    setCategoryStats(catStats);
    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete API Test Suite</Text>
        <Text style={styles.subtitle}>
          Testing 60+ endpoints across all categories
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

      {Object.keys(categoryStats).length > 0 && (
        <ScrollView horizontal style={styles.categoryStatsContainer} showsHorizontalScrollIndicator={false}>
          {Object.entries(categoryStats).map(([category, stats]) => (
            <View key={category} style={styles.categoryStatItem}>
              <Text style={styles.categoryName}>{category}</Text>
              <Text style={styles.categoryStats}>
                {stats.passed}/{stats.passed + stats.failed}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={runAllTests}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Run All Tests (60+ endpoints)</Text>
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
            <View style={styles.resultHeader}>
              <Text style={styles.testCategory}>{result.category}</Text>
              <Text style={styles.testName}>{result.test}</Text>
            </View>
            <Text
              style={[
                styles.testMessage,
                result.status === 'success' ? styles.successText : styles.errorText,
              ]}
            >
              {result.message}
            </Text>
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
    marginBottom: 15,
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
  categoryStatsContainer: {
    maxHeight: 60,
    marginBottom: 15,
  },
  categoryStatItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryName: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5,
  },
  categoryStats: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
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
  resultHeader: {
    marginBottom: 5,
  },
  testCategory: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2196F3',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  testName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  testMessage: {
    fontSize: 12,
  },
});
