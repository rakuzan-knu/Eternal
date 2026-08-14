terraform {
  required_version = ">= 1.5.0"
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

resource "vercel_project" "social_network_frontend" {
  count     = var.vercel_api_token != "dummy_vercel_token" && var.vercel_api_token != "dummy_token" && var.vercel_api_token != "" ? 1 : 0
  name      = var.app_name
  framework = "vite"

  git_repository = {
    type = "github"
    repo = var.github_repository
  }
}

resource "vercel_project_environment_variable" "vite_api_url" {
  count      = var.vercel_api_token != "dummy_vercel_token" && var.vercel_api_token != "dummy_token" && var.vercel_api_token != "" ? 1 : 0
  project_id = vercel_project.social_network_frontend[0].id
  key        = "VITE_API_URL"
  value      = var.api_url
  target     = ["production", "preview", "development"]
}
