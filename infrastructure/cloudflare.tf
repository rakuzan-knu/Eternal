# Cloudflare Multi-Region DNS Load Balancer & Active Health Check Configuration

resource "cloudflare_load_balancer_monitor" "backend_health_check" {
  account_id     = var.cloudflare_zone_id
  type           = "http"
  expected_codes = "200"
  method         = "GET"
  path           = "/api/health"
  interval       = 60
  timeout        = 5
  retries        = 2
  description    = "Active probe querying NestJS /api/health endpoint every 60s"

  header {
    header = "Host"
    values = [var.domain_name]
  }
}

# Primary Origin Pool (US Region)
resource "cloudflare_load_balancer_pool" "primary_us_pool" {
  account_id = var.cloudflare_zone_id
  name       = "primary-us-backend-pool"
  monitor    = cloudflare_load_balancer_monitor.backend_health_check.id
  enabled    = true

  origins {
    name    = "us-east-backend-primary"
    address = var.primary_backend_address
    enabled = true
    weight  = 1.0
  }

  description     = "Primary active origin cluster in US region"
  minimum_origins = 1
}

# Secondary Failover Pool (EU Region)
resource "cloudflare_load_balancer_pool" "secondary_eu_pool" {
  account_id = var.cloudflare_zone_id
  name       = "secondary-eu-backend-pool"
  monitor    = cloudflare_load_balancer_monitor.backend_health_check.id
  enabled    = true

  origins {
    name    = "eu-central-backend-secondary"
    address = var.secondary_backend_address
    enabled = true
    weight  = 1.0
  }

  description     = "Secondary standby origin cluster in EU region"
  minimum_origins = 1
}

# Global Cloudflare Load Balancer with Failover Steering
resource "cloudflare_load_balancer" "api_load_balancer" {
  zone_id          = var.cloudflare_zone_id
  name             = var.domain_name
  fallback_pool_id = cloudflare_load_balancer_pool.secondary_eu_pool.id
  default_pool_ids = [
    cloudflare_load_balancer_pool.primary_us_pool.id,
    cloudflare_load_balancer_pool.secondary_eu_pool.id,
  ]
  description     = "Active-Passive DNS Failover LB routing to US primary and EU secondary on outage"
  proxied         = true
  steering_policy = "off" # Active-Passive Pool Ordering
}
