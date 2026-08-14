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
  description = "Domain name for Cloudflare DNS"
  default     = "socialnetwork.dev"
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
  default     = "https://social-network-backend.onrender.com/api"
}
