# Database Performance and Integrity Test Suite

This test suite provides comprehensive validation of the KAI prediction platform's database performance and data integrity under various load conditions.

## Overview

The test suite covers four main areas:

1. **Database Performance & Integrity** - Core database operations under load
2. **Commitment Flow Load Testing** - User commitment operations with concurrent access
3. **Admin Analytics Performance** - Large dataset queries and analytics operations
4. **Data Integrity Validation** - Cross-system consistency checks

## Test Files

### `database-performance-integrity.test.ts`
- Tests concurrent user commitment flows
- Validates database transaction integrity and rollback scenarios
- Checks performance benchmarks for core operations
- Verifies data consistency between commitments, balances, and market statistics

### `commitment-flow-load.test.ts`
- Simulates multiple concurrent users making commitments
- Tests sustained load scenarios
- Validates peak load handling (trending markets)
- Checks transaction conflict resolution
- Verifies atomicity under concurrent access

### `admin-analytics-performance.test.ts`
- Tests large dataset query performance (50,000+ records)
- Validates pagination efficiency
- Checks complex filtering operations
- Tests real-time analytics updates
- Measures memory efficiency with large result sets

### `data-integrity-validation.test.ts`
- Comprehensive system-wide consistency validation
- User balance consistency across operations
- Market statistics accuracy
- Transaction history integrity
- Global token conservation checks
- Referential integrity validation

## Running Tests

### Individual Test Suites
```bash
# Run all performance tests
npm run test:performance

# Run specific test suites
npm run test:load          # Commitment flow load tests
npm run test:integrity     # Data integrity validation
npm run test:analytics     # Admin analytics performance
npm run test:database      # Core database performance
```

### Using Vitest Directly
```bash
# Run with watch mode
npx vitest __tests__/integration/

# Run specific test file
npx vitest run __tests__/integration/commitment-flow-load.test.ts

# Run with coverage
npx vitest run --coverage
```

## Test Configuration

### Performance Thresholds

The tests validate against these performance benchmarks:

- **Single Commitment**: < 500ms
- **Batch Commitments (100)**: < 2000ms
- **Analytics Query**: < 1000ms
- **Pagination**: < 200ms per page
- **Data Consistency Check**: < 300ms

### Load Test Parameters

- **Concurrent Users**: 50-200 users
- **Operations per User**: 3-10 operations
- **Test Duration**: 5-10 seconds for sustained load
- **Dataset Size**: Up to 50,000 records for analytics tests

## Test Data

Tests use generated mock data:

- **Users**: 1,000-5,000 test users with varying balances
- **Markets**: 20-500 test markets in different states
- **Commitments**: 10,000-50,000 test commitments
- **Transactions**: Complete transaction history for all operations

## Utilities

### `load-test-simulator.ts`
Provides utilities for:
- Simulating concurrent user load
- Measuring response times and throughput
- Testing database connection pools
- Validating data consistency
- Memory usage monitoring

### `run-performance-tests.ts`
Test runner that:
- Executes all performance test suites
- Generates comprehensive reports
- Provides performance analysis
- Saves results to JSON files
- Offers optimization recommendations

## Reports

Test reports are saved to `__tests__/reports/` and include:

- **Summary Statistics**: Pass rates, timing, error counts
- **Performance Metrics**: Response times, throughput, bottlenecks
- **Detailed Results**: Individual test outcomes and errors
- **Recommendations**: Specific optimization suggestions

## Interpreting Results

### Performance Indicators

✅ **Good Performance**:
- Average response time < 200ms
- 95th percentile < 500ms
- Error rate < 5%
- Memory usage stable

⚠️ **Needs Attention**:
- Average response time 200-500ms
- 95th percentile 500ms-1s
- Error rate 5-10%
- Memory usage increasing

❌ **Performance Issues**:
- Average response time > 500ms
- 95th percentile > 1s
- Error rate > 10%
- Memory leaks detected

### Common Issues and Solutions

**Slow Query Performance**:
- Add database indexes for frequently queried fields
- Implement query result caching
- Use pagination for large datasets
- Optimize Firestore composite indexes

**High Error Rates**:
- Check database connection limits
- Implement proper retry logic
- Validate transaction isolation levels
- Review concurrent access patterns

**Memory Issues**:
- Implement proper cleanup in test teardown
- Use streaming for large datasets
- Add garbage collection hints
- Monitor connection pool sizes

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Run Performance Tests
  run: npm run test:performance
  
- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: performance-reports
    path: __tests__/reports/
```

## Monitoring in Production

Use these tests as a baseline for production monitoring:

1. **Set up alerts** based on test thresholds
2. **Run periodic load tests** against staging environments
3. **Monitor key metrics** identified by the test suite
4. **Use test data patterns** for production data validation

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Include performance assertions with reasonable thresholds
3. Add proper cleanup in test teardown
4. Update this README with new test descriptions
5. Ensure tests are deterministic and don't rely on external services

## Troubleshooting

### Common Test Failures

**Timeout Errors**:
- Increase `testTimeout` in vitest config
- Check for infinite loops or blocking operations
- Verify mock implementations don't hang

**Memory Errors**:
- Reduce test dataset sizes
- Add proper cleanup in `afterEach`
- Check for memory leaks in mocks

**Flaky Tests**:
- Add proper wait conditions
- Use deterministic test data
- Avoid race conditions in concurrent tests

### Debug Mode

Run tests with debug output:

```bash
DEBUG=true npm run test:performance
```

This enables detailed logging and timing information for troubleshooting performance issues.