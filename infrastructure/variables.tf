variable "vercel_api_token" {
  type        = string
  description = "Vercel API Token"
  sensitive   = true
  default     = "dummy_vercel_token"
}

variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token"
  sensitive   = true
  default     = "dummy_cloudflare_token"
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare Zone ID for Domain"
  default     = "dummy_zone_id"
}

variable "domain_name" {
  type        = string
  description = "Domain name for Cloudflare Load Balancer"
  default     = "api.socialnetwork.dev"
}

variable "aws_region" {
  type        = string
  description = "AWS Region for Budget Alerts & Infrastructure"
  default     = "us-east-1"
}

variable "app_name" {
  type        = string
  description = "Application Name"
  default     = "social-network"
}

variable "github_repository" {
  type        = string
  description = "GitHub Repository (owner/repo)"
  default     = "rakuzan-knu/social-network"
}

variable "api_url" {
  type        = string
  description = "Production Backend API URL"
  default     = "https://social-network-api.onrender.com/api"
}

variable "primary_backend_address" {
  type        = string
  description = "Primary Region Backend Origin (US-East)"
  default     = "us-primary.api.socialnetwork.dev"
}

variable "secondary_backend_address" {
  type        = string
  description = "Secondary Region Backend Origin (EU-Central)"
  default     = "eu-secondary.api.socialnetwork.dev"
}

variable "budget_alert_email" {
  type        = string
  description = "Email address for AWS Budget & Cost alerts"
  default     = "devops-alerts@socialnetwork.dev"
}
