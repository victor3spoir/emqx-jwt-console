group "default" {
  targets = ["dev"]
}

# Filled by docker/metadata-action in CI. Keeping it empty makes the Bake file
# usable locally without requiring GitHub-generated metadata.
target "docker-metadata-action" {}

target "_app" {
  context = "."
  dockerfile = "Dockerfile"
  labels = {
    "org.opencontainers.image.title"  = "EMQX JWT Console"
    "org.opencontainers.image.source" = "https://github.com/victor3spoir/emqx-jwt-console"
  }
}

target "app" {
  inherits = ["_app", "docker-metadata-action"]
}

target "dev" {
  inherits = ["_app"]
  tags = ["emqx-jwt-console:dev"]
  output = ["type=docker"]
}
