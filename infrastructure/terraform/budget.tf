# Free Tier Budget Guardrail Policy ($0 Monthly Spending Target)
# Zero-cost infrastructure declaration for Vercel Free, Render Free, and Cloudflare Free Tier

locals {
  free_tier_limits = {
    vercel_cost     = "$0.00/month (Free Tier)"
    render_cost     = "$0.00/month (Free Tier)"
    cloudflare_cost = "$0.00/month (Free Tier)"
    minio_cost      = "$0.00/month (Self-Hosted MinIO)"
    total_budget    = "$0.00/month"
  }
}

output "budget_policy_summary" {
  value       = local.free_tier_limits
  description = "Summary of Zero-Cost Infrastructure Allocation"
}
