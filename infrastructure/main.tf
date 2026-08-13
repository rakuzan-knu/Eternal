terraform {
  required_version = ">= 1.5.0"
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
    render = {
      source  = "render-oss/render"
      version = "~> 1.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "aws" {
  region = var.aws_region
}

resource "vercel_project" "social_network_frontend" {
  name      = var.app_name
  framework = "vite"

  git_repository = {
    type = "github"
    repo = var.github_repository
  }
}

resource "vercel_project_environment_variable" "vite_api_url" {
  project_id = vercel_project.social_network_frontend.id
  key        = "VITE_API_URL"
  value      = var.api_url
  target     = ["production", "preview", "development"]
}
