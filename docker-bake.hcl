target "frontend" {
  context = "."
  dockerfile = "Dockerfile"
  tags = [ "emqx-jwt-console:dev" ]
}
