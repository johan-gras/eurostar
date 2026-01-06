# Monitoring Setup

This document describes how to set up monitoring for Eurostar Tools services using Prometheus metrics.

## Overview

The monitoring system provides Prometheus-compatible metrics for:
- HTTP request counts, latency, and in-flight requests
- GTFS-RT polling statistics
- Background job processing metrics
- Database connection and query metrics
- Cache hit/miss rates
- Business metrics (claims generated, delays detected)

## Quick Start

### 1. Register Metrics Endpoint

In your Fastify application:

```typescript
import { registerMetricsRoutes } from '@eurostar/core/monitoring';

const app = Fastify();

// Register the /metrics endpoint
await registerMetricsRoutes(app);

// Optional: customize options
await registerMetricsRoutes(app, {
  path: '/metrics',              // Custom path (default: /metrics)
  enableRequestMetrics: true,    // Track HTTP request metrics (default: true)
  excludePaths: ['/metrics', '/health'], // Paths to exclude from metrics
});
```

### 2. Access Metrics

```bash
curl http://localhost:3000/metrics
```

Output (Prometheus text format):
```
# HELP eurostar_http_requests_total Total number of HTTP requests
# TYPE eurostar_http_requests_total counter
eurostar_http_requests_total{method="GET",route="/api/v1/bookings",status_code="200"} 42

# HELP eurostar_http_request_duration_seconds HTTP request latency in seconds
# TYPE eurostar_http_request_duration_seconds histogram
eurostar_http_request_duration_seconds_bucket{method="GET",route="/api/v1/bookings",le="0.1"} 35
...
```

## Available Metrics

### HTTP Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `eurostar_http_requests_total` | Counter | method, route, status_code | Total HTTP requests |
| `eurostar_http_request_duration_seconds` | Histogram | method, route | Request latency |
| `eurostar_http_requests_in_flight` | Gauge | method | Current active requests |

### GTFS Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `eurostar_gtfs_polls_total` | Counter | status | GTFS-RT feed poll count |
| `eurostar_gtfs_poll_duration_seconds` | Histogram | - | Poll latency |
| `eurostar_gtfs_train_updates_total` | Counter | - | Train updates processed |

### Job Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `eurostar_jobs_processed_total` | Counter | queue, status | Jobs processed |
| `eurostar_jobs_failed_total` | Counter | queue, error | Failed jobs |
| `eurostar_job_duration_seconds` | Histogram | queue | Job processing time |
| `eurostar_active_jobs` | Gauge | queue | Currently active jobs |

### Database Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `eurostar_db_connections_active` | Gauge | - | Active DB connections |
| `eurostar_db_query_duration_seconds` | Histogram | operation | Query duration |

### Cache Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `eurostar_cache_hits_total` | Counter | cache | Cache hits |
| `eurostar_cache_misses_total` | Counter | cache | Cache misses |

### Business Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `eurostar_claims_generated_total` | Counter | type | Claims created |
| `eurostar_delays_detected_total` | Counter | severity | Delays detected |

## Custom Metrics

Create custom metrics using the registry:

```typescript
import { metrics } from '@eurostar/core/monitoring';

// Counter
const myCounter = metrics.counter('my_operation_total', 'Total operations');
myCounter.inc({ type: 'success' });

// Gauge
const myGauge = metrics.gauge('queue_depth', 'Current queue depth');
myGauge.set(42, { queue: 'notifications' });

// Histogram
const myHistogram = metrics.histogram(
  'operation_duration_seconds',
  'Operation duration',
  [0.01, 0.05, 0.1, 0.5, 1] // Custom buckets
);

// Use timer for automatic duration tracking
const stopTimer = myHistogram.startTimer({ operation: 'process' });
await doWork();
stopTimer(); // Records duration automatically
```

## Prometheus Configuration

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'eurostar-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['api:3000']
    metrics_path: /metrics

  - job_name: 'eurostar-worker'
    scrape_interval: 15s
    static_configs:
      - targets: ['worker:3001']
    metrics_path: /metrics
```

## Grafana Dashboard

Example queries for a Grafana dashboard:

### Request Rate
```promql
rate(eurostar_http_requests_total[5m])
```

### Request Latency (p95)
```promql
histogram_quantile(0.95, rate(eurostar_http_request_duration_seconds_bucket[5m]))
```

### Error Rate
```promql
sum(rate(eurostar_http_requests_total{status_code=~"5.."}[5m]))
/ sum(rate(eurostar_http_requests_total[5m]))
```

### Job Queue Depth
```promql
eurostar_active_jobs
```

### GTFS Poll Success Rate
```promql
sum(rate(eurostar_gtfs_polls_total{status="success"}[5m]))
/ sum(rate(eurostar_gtfs_polls_total[5m]))
```

## Alerting Rules

Example Prometheus alerting rules:

```yaml
groups:
  - name: eurostar
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(eurostar_http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(eurostar_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: Error rate is {{ $value | humanizePercentage }}

      - alert: SlowRequests
        expr: |
          histogram_quantile(0.95, rate(eurostar_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Slow request latency
          description: p95 latency is {{ $value }}s

      - alert: GTFSPollFailures
        expr: |
          rate(eurostar_gtfs_polls_total{status="error"}[5m]) > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: GTFS-RT polling failures
```

## Docker Compose Example

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.48.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:10.2.0
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3001:3000"

volumes:
  grafana-data:
```
